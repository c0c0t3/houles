import { isVisible } from './show-if.js';
import { createEmboutsMessageElement } from './embouts.js';

/**
 * Génération du DOM de toutes les étapes du configurateur (clonage des templates Twig, expansion
 * des champs `splitByConfig`). Extrait de `configurator.js` pour l'alléger. Le composant reste
 * responsable de l'appel `$update()` qui monte les composants JS Toolkit fraîchement insérés.
 * Voir docs/module-4-frist-step.md.
 */

/**
 * Expand les champs `splitByConfig` en autant de variantes que de valeurs déclarées dans `configs`.
 * Chaque variante hérite des propriétés de base, surcharge avec ses propres overrides,
 * et reçoit un `showIf` automatique sur le paramètre de split.
 * Les champs sans `splitByConfig` sont retournés tels quels.
 *
 * @param {object[]} fields - Champs bruts d'une étape (`step.fields`).
 * @returns {object[]} Champs à plat, `splitByConfig` résolu.
 */
export function expandFields(fields) {
  return fields.flatMap((field) => {
    if (!field.splitByConfig) return [field];
    const { splitByConfig, configs, ...baseProps } = field;
    return Object.entries(configs).flatMap(([configValue, instances]) =>
      instances.map((instance) => ({
        ...baseProps,
        ...instance,
        // Fusionne le showIf de base avec la condition de config générée automatiquement.
        showIf: { ...(baseProps.showIf ?? {}), [splitByConfig]: [configValue] },
      }))
    );
  });
}

/**
 * Clone le `<template data-template="${type}">` déclaré dans le Twig. Retourne null si absent.
 *
 * @param {HTMLElement} rootEl - Élément racine du composant (`this.$el`).
 * @param {string} type - Type de champ (`radio`, `length`, `product`...).
 * @returns {HTMLElement|null}
 */
function cloneTemplate(rootEl, type) {
  const tpl = rootEl.querySelector(`[data-template="${type}"]`);
  if (!tpl) return null;
  return tpl.content.cloneNode(true).firstElementChild;
}

/**
 * Génère une seule fois le DOM de toutes les étapes et les cache (hidden).
 * La navigation se fait par show/hide, pas par re-render — évite de perdre l'état
 * des composants JS Toolkit déjà montés.
 * Les champs avec `splitByConfig` sont expandés ici en autant de variantes que nécessaire.
 *
 * @param {object} params
 * @param {HTMLElement} params.rootEl - Élément racine du composant (`this.$el`), pour retrouver
 *   les `<template>` du Twig.
 * @param {HTMLElement} params.container - Conteneur cible des étapes (`this.$refs.stepContent`).
 * @param {object} params.schema - Schéma de collection chargé.
 * @param {object} params.selection - État courant du configurateur (partagé avec les champs).
 * @returns {{ stepEls: HTMLElement[], expandedStepFields: object[][] }} Les éléments d'étape créés
 *   et, indexés par étape, leurs champs expandés. L'appelant doit ensuite appeler `$update()`.
 */
export function renderAllSteps({ rootEl, container, schema, selection }) {
  container.innerHTML = '';
  const stepEls = [];
  const expandedStepFields = [];

  for (const [i, step] of schema.steps.entries()) {
    const stepEl = document.createElement('div');
    stepEl.dataset.step = i;
    stepEl.hidden = true;

    // Étape Embouts : message affiché quand le support choisi remplace déjà les embouts
    // (naissances murales, corners — flag `replacesEmbouts`). Visibilité gérée par refreshEmboutsStep().
    if (step.id === 'embouts') {
      stepEl.appendChild(createEmboutsMessageElement());
    }

    // Étape Récapitulatif : reprend le même rendu que le bandeau permanent (renderRecap),
    // dans un conteneur dédié — voir _renderRecap(). `fields: []` dans le JSON, rien à cloner ici.
    if (step.id === 'recap') {
      const recapStepContent = document.createElement('div');
      recapStepContent.dataset.ref = 'recapStepContent';
      recapStepContent.className = 'flex flex-col gap-3';
      stepEl.appendChild(recapStepContent);
    }

    const expanded = expandFields(step.fields);
    expandedStepFields[i] = expanded;

    for (const field of expanded) {
      const el = cloneTemplate(rootEl, field.type);
      // Type de champ non supporté (template absent du Twig) : on ignore silencieusement.
      if (!el) continue;
      el.dataset.fieldId = field.id;
      el._syhField = field;
      el._syhSelection = selection;
      el._syhColoris = schema.collection.coloris ?? [];
      el._syhRenderMode = schema.collection.renderMode;
      // Visibilité initiale au niveau champ (showIf field-level, ex : embout_arriere en simple).
      el.hidden = !isVisible(field, selection);
      stepEl.appendChild(el);
    }

    container.appendChild(stepEl);
    stepEls.push(stepEl);
  }

  return { stepEls, expandedStepFields };
}
