import { isVisible } from './show-if.js';

/**
 * Résolution des valeurs par défaut de `selection` et invalidation des champs dépendants.
 * Extrait de `configurator.js` pour l'alléger — voir docs/module-4-frist-step.md et
 * docs/module-5-etapes-intermediaires.md.
 */

/**
 * Pré-sélectionne la première option visible de chaque champ isParam.
 * Traitement dans l'ordre de déclaration JSON : garantit que dependsOn est résolu
 * avant le champ qui en dépend (ex : diametre après type_de_support).
 * Idempotent : saute les champs déjà valorisés — safe à rappeler après invalidation.
 *
 * Mute `selection` en place.
 *
 * @param {object} schema - Schéma de collection chargé (`schema.steps[]`).
 * @param {object} selection - État courant du configurateur (indexé par id de champ, muté ici).
 */
export function initDefaultSelection(schema, selection) {
  for (const step of schema.steps) {
    for (const field of step.fields) {
      // Seuls les params alimentent selection{}. Les produits sont dans selection.produits{}.
      if (!field.isParam) continue;
      // Idempotence : ne pas écraser une sélection déjà présente (ex : rappel post-invalidation).
      if (selection[field.id] !== undefined) continue;

      // Les champs length n'ont pas d'options[] mais des presets[].
      if (field.type === 'length') {
        selection[field.id] = field.presets?.[0] ?? null;
        continue;
      }

      let opts = [];
      if (field.dependsOn) {
        // Options groupées par valeur parente, ex : options["simple"] ou options["double"].
        opts = field.options[selection[field.dependsOn]] ?? [];
      } else if (Array.isArray(field.options)) {
        opts = field.options;
      }

      const first = opts.find((o) => isVisible(o, selection));
      // N'affecte rien si toutes les options sont masquées par showIf.
      if (first) selection[field.id] = first.id;
    }
  }
}

/**
 * Supprime les sélections des champs qui dépendent du champ modifié (dependsOn).
 * Limité à l'étape fournie — les étapes produit sont invalidées à leur affichage via refresh().
 *
 * @param {object} step - Étape du schéma sur laquelle porte le changement (`step.fields[]`).
 * @param {object} selection - État courant (muté ici).
 * @param {string} changedFieldId - Id du champ qui vient de changer.
 */
export function invalidateDownstream(step, selection, changedFieldId) {
  for (const field of step.fields) {
    // Ne pas invalider le champ lui-même, uniquement ses dépendants.
    if (field.id === changedFieldId) continue;
    // Invalidation des enfants directs uniquement (pas de cascade récursive).
    if (field.dependsOn === changedFieldId) {
      delete selection[field.id];
    }
  }
}
