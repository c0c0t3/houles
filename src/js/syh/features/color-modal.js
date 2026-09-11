import 'choices.js/public/assets/styles/choices.css';
import Choices from 'choices.js';

/**
 * Modale de sélection de couleur d'une pièce colorisable (`renderMode: "live_colored"`).
 * Ouverte depuis le trigger « Voir plus de couleurs » d'une card produit (voir product-field.js,
 * `[data-ref="moreColors"]`). Le markup vit dans `<template data-modal="couleur">`
 * (modal-configurateur.twig) ; le câblage panel/positionnement est fait par modal-router.js.
 *
 * Comportement clé (voir docs/module-8b-modale-couleurs.md) :
 * - La **grille du nuancier reste toujours entièrement affichée** — la recherche ne la filtre pas.
 * - La recherche est un **menu déroulant** (Choices.js) : pastille + libellé par ligne, avec champ
 *   de recherche interne (nom / code Pantone / hex). Choisir une entrée revient à cliquer la
 *   pastille correspondante dans la grille.
 * - Cliquer une couleur (grille, récents ou menu déroulant) l'applique **en aperçu temps réel**
 *   (`onPreview`) sans la valider : le calque SVG de la pièce se teinte dans `.colG` et la modale
 *   reste ouverte.
 * - « Appliquer au produit » (`onApplyCurrent`) valide sur la seule pièce d'origine, « Appliquer à
 *   tous » (`onApplyAll`) sur toutes les pièces colorisables, puis ferme.
 * - « Annuler » / croix / clic hors modale / Échap → `onCancel` (rollback de l'aperçu) puis ferme.
 *
 * Choices.js est instancié à la main ici (et non via le composant global `ChoicesSelect`) : le
 * contenu de la modale est cloné à la volée par modal-router.js, hors de l'arbre de composants
 * monté au chargement — le `data-component` ne serait jamais découvert.
 */

/**
 * @typedef {object} ColorisEntry
 * @property {string} id
 * @property {string} [label]   Libellé interne (nuancier mock).
 * @property {string} [nom]     Nom commercial du coloris (nuancier réel).
 * @property {string} [pantone] Code Pantone.
 * @property {string} [hex]
 */

/**
 * @param {HTMLElement} contentEl - Conteneur de contenu de la modale, déjà peuplé par le clone du
 *   template `couleur` (recherche, récents, grille, footer).
 * @param {object} opts
 * @param {HTMLElement} opts.panel - L'élément panel (`#extra`) : sert à fermer la modale et à
 *   détecter une fermeture non validée (→ rollback).
 * @param {ColorisEntry[]} opts.palette - Nuancier global de la collection (`collection.coloris[]`).
 * @param {string|null} opts.currentColorisId - Coloris actuel de la pièce, présélectionné à l'ouverture.
 * @param {string[]} opts.recentIds - Ids des dernières couleurs utilisées dans la config en cours
 *   (max 5, plus récent en tête, sans persistance).
 * @param {(colorisId: string) => void} opts.onPreview - Applique la couleur en aperçu (non validé).
 * @param {(colorisId: string) => void} opts.onApplyCurrent - Valide sur la seule pièce courante.
 * @param {(colorisId: string) => void} opts.onApplyAll - Valide sur toutes les pièces colorisables.
 * @param {() => void} opts.onCancel - Restaure la couleur d'origine (rollback de l'aperçu).
 */
export function initColorModal(contentEl, opts) {
  const {
    panel,
    palette = [],
    currentColorisId = null,
    recentIds = [],
    onPreview,
    onApplyCurrent,
    onApplyAll,
    onCancel,
  } = opts;

  const searchEl = contentEl.querySelector('[data-ref="search"]');
  const recentWrapEl = contentEl.querySelector('[data-ref="recentWrap"]');
  const recentEl = contentEl.querySelector('[data-ref="recent"]');
  const gridEl = contentEl.querySelector('[data-ref="grid"]');
  const applyCurrentBtn = contentEl.querySelector('[data-ref="applyCurrent"]');
  const applyAllBtn = contentEl.querySelector('[data-ref="applyAll"]');
  const swatchTpl = contentEl.querySelector('[data-template="color-modal-swatch"]');
  if (!gridEl || !swatchTpl) return;

  // Coloris actuellement mis en évidence dans la modale — valeur transmise aux deux « Appliquer ».
  let selectedId = currentColorisId != null ? String(currentColorisId) : null;
  // Passe à true dès qu'un bouton « Appliquer » a validé : la fermeture qui suit ne doit alors PAS
  // déclencher le rollback `onCancel`.
  let committed = false;
  // Instance Choices.js du menu déroulant de recherche — détruite à la fermeture de la modale.
  let choices = null;

  /** @param {string} id */
  const byId = (id) => palette.find((c) => String(c.id) === String(id)) ?? null;

  /** @param {ColorisEntry} entry */
  const entryName = (entry) => entry.nom ?? entry.label ?? entry.pantone ?? String(entry.id);

  /**
   * Clone une pastille pour une entrée de nuancier. La classe `is-active` (mise en évidence de la
   * sélection) est portée par la pastille interne, pas par le bouton — le bouton reste la cible de
   * la délégation de clic via `data-coloris`.
   *
   * @param {ColorisEntry} entry
   * @returns {HTMLElement}
   */
  function makeSwatch(entry) {
    const btn = swatchTpl.content.cloneNode(true).firstElementChild;
    btn.dataset.coloris = entry.id;
    const dot = btn.querySelector('span') ?? btn;
    if (entry.hex) dot.style.backgroundColor = entry.hex;
    // Libellé + code au survol (title natif) : le nuancier mock n'a qu'un `label`, le réel aura
    // `nom` + `pantone`.
    btn.title = [entry.nom ?? entry.label, entry.pantone].filter(Boolean).join(' · ') || String(entry.id);
    dot.classList.toggle('is-active', selectedId != null && String(entry.id) === selectedId);
    return btn;
  }

  /**
   * (Re)construit la grille complète du nuancier. Toujours toute la palette — jamais filtrée par
   * la recherche (voir module-8b : la recherche ne cache pas les autres coloris).
   */
  function renderGrid() {
    gridEl.replaceChildren(...palette.map(makeSwatch));
  }

  function renderRecent() {
    if (!recentEl) return;
    const entries = recentIds.map(byId).filter(Boolean);
    if (recentWrapEl) recentWrapEl.hidden = entries.length === 0;
    recentEl.replaceChildren(...entries.map(makeSwatch));
  }

  /**
   * Met à jour la pastille active partout : grille, récents, et menu déroulant.
   *
   * @param {string} id
   */
  function markSelected(id) {
    selectedId = String(id);
    for (const btn of contentEl.querySelectorAll('[data-coloris]')) {
      const dot = btn.querySelector('span') ?? btn;
      dot.classList.toggle('is-active', String(btn.dataset.coloris) === selectedId);
    }
    // Reflète la sélection dans le menu déroulant sans redéclencher d'événement `choice`.
    try {
      choices?.setChoiceByValue(selectedId);
    } catch {
      /* valeur absente de la liste : rien à refléter */
    }
  }

  /**
   * Instancie le menu déroulant de recherche (Choices.js) à partir de la palette. Chaque entrée
   * affiche une pastille de couleur + le nom (+ code Pantone si présent). La recherche interne de
   * Choices porte sur ce libellé — le `hex` y figure via le `style` inline, donc cherchable aussi.
   */
  function setupSearch() {
    if (!searchEl) return;
    choices = new Choices(searchEl, {
      allowHTML: true,
      searchEnabled: true,
      searchResultLimit: 100,
      shouldSort: false,
      itemSelectText: '',
      placeholder: true,
      placeholderValue: 'Rechercher un coloris (nom, Pantone, hex)',
      searchPlaceholderValue: 'Rechercher…',
    });

    choices.setChoices(
      palette.map((entry) => {
        const pantone = entry.pantone ? ` — ${entry.pantone}` : '';
        return {
          value: String(entry.id),
          label: `<span class="inline-block align-middle mr-2 size-4 rounded-full border border-purple" style="background-color: ${
            entry.hex ?? 'transparent'
          }"></span>${entryName(entry)}${pantone}`,
          selected: selectedId != null && String(entry.id) === selectedId,
        };
      }),
      'value',
      'label',
      true,
    );

    // Choices émet un CustomEvent `choice` sur le <select> ; on s'aligne sur ui/ChoicesSelect.js.
    searchEl.addEventListener('choice', (event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;
      const id = event.detail.value ?? event.detail.choice?.value;
      if (id == null) return;
      markSelected(id);
      onPreview?.(id);
    });
  }

  // Aperçu au clic — délégué sur tout le contenu pour couvrir la grille ET les récents.
  contentEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-coloris]');
    if (!btn) return;
    markSelected(btn.dataset.coloris);
    onPreview?.(btn.dataset.coloris);
  });

  applyCurrentBtn?.addEventListener('click', () => {
    committed = true;
    if (selectedId != null) onApplyCurrent?.(selectedId);
    panel?.close?.();
  });

  applyAllBtn?.addEventListener('click', () => {
    committed = true;
    if (selectedId != null) onApplyAll?.(selectedId);
    panel?.close?.();
  });

  // Fermeture (Annuler via data-ref="fermer", croix, overlay, Échap, ou après un « Appliquer ») :
  // on détruit toujours l'instance Choices ; on ne rollback l'aperçu que si rien n'a été validé.
  // `once` : cette instance de modale est jetable, un nouvel init() a lieu à chaque réouverture.
  panel?.addEventListener(
    'close',
    () => {
      try {
        choices?.destroy();
      } catch {
        /* déjà détruite */
      }
      choices = null;
      if (!committed) onCancel?.();
    },
    { once: true },
  );

  renderRecent();
  renderGrid();
  setupSearch();
}
