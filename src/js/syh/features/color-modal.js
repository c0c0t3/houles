/**
 * Modale de sélection de couleur d'une pièce colorisable (`renderMode: "live_colored"`).
 * Ouverte depuis le trigger « Voir plus de couleurs » d'une card produit (voir product-field.js,
 * `[data-ref="moreColors"]`). Le markup vit dans `<template data-modal="couleur">`
 * (modal-configurateur.twig) ; le câblage panel/positionnement est fait par modal-router.js.
 *
 * Comportement clé (voir docs/module-8b-modale-couleurs.md) :
 * - Cliquer une couleur l'applique **en aperçu temps réel** (`onPreview`) sans la valider : le
 *   calque SVG de la pièce se teinte dans `.colG` et la modale reste ouverte.
 * - « Appliquer au produit » (`onApplyCurrent`) valide sur la seule pièce d'origine, « Appliquer à
 *   tous » (`onApplyAll`) sur toutes les pièces colorisables, puis ferme.
 * - « Annuler » / croix / clic hors modale / Échap → `onCancel` (rollback de l'aperçu) puis ferme.
 */

/**
 * @typedef {Object} ColorisEntry
 * @property {string} id
 * @property {string} [label]   - Libellé interne (nuancier mock).
 * @property {string} [nom]     - Nom commercial du coloris (nuancier réel).
 * @property {string} [pantone] - Code Pantone.
 * @property {string} [hex]
 */

/**
 * @param {HTMLElement} contentEl - Conteneur de contenu de la modale, déjà peuplé par le clone du
 *   template `couleur` (recherche, récents, grille, footer).
 * @param {Object} opts
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
  const emptyEl = contentEl.querySelector('[data-ref="empty"]');
  const applyCurrentBtn = contentEl.querySelector('[data-ref="applyCurrent"]');
  const applyAllBtn = contentEl.querySelector('[data-ref="applyAll"]');
  const swatchTpl = contentEl.querySelector('[data-template="color-modal-swatch"]');
  if (!gridEl || !swatchTpl) return;

  // Coloris actuellement mis en évidence dans la modale — valeur transmise aux deux « Appliquer ».
  let selectedId = currentColorisId != null ? String(currentColorisId) : null;
  // Passe à true dès qu'un bouton « Appliquer » a validé : la fermeture qui suit ne doit alors PAS
  // déclencher le rollback `onCancel`.
  let committed = false;

  /** @param {string} id */
  const byId = (id) => palette.find((c) => String(c.id) === String(id)) ?? null;

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

  /** @param {ColorisEntry[]} entries */
  function renderGrid(entries) {
    gridEl.replaceChildren(...entries.map(makeSwatch));
    if (emptyEl) emptyEl.hidden = entries.length > 0;
  }

  function renderRecent() {
    if (!recentEl) return;
    const entries = recentIds.map(byId).filter(Boolean);
    if (recentWrapEl) recentWrapEl.hidden = entries.length === 0;
    recentEl.replaceChildren(...entries.map(makeSwatch));
  }

  /**
   * Filtre nom / libellé / code Pantone / hex, insensible à la casse.
   *
   * @param {ColorisEntry} entry
   * @param {string} q - Requête déjà normalisée (trim + lowercase).
   */
  function matches(entry, q) {
    return [entry.label, entry.nom, entry.pantone, entry.hex]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  }

  function applyFilter() {
    const q = (searchEl?.value ?? '').trim().toLowerCase();
    // Aucune correspondance dans le nuancier → grille vide (pas de couleur hors nuancier ici,
    // voir module-8b).
    renderGrid(q ? palette.filter((entry) => matches(entry, q)) : palette);
  }

  /** @param {string} id */
  function markSelected(id) {
    selectedId = String(id);
    for (const btn of contentEl.querySelectorAll('[data-coloris]')) {
      const dot = btn.querySelector('span') ?? btn;
      dot.classList.toggle('is-active', String(btn.dataset.coloris) === selectedId);
    }
  }

  // Aperçu au clic — délégué sur tout le contenu pour couvrir la grille ET les récents.
  contentEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-coloris]');
    if (!btn) return;
    markSelected(btn.dataset.coloris);
    onPreview?.(btn.dataset.coloris);
  });

  searchEl?.addEventListener('input', applyFilter);

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

  // Fermeture non validée (Annuler via data-ref="fermer", croix, overlay, Échap) → rollback.
  // `once` : cette instance de modale est jetable, un nouvel init() a lieu à chaque réouverture.
  panel?.addEventListener(
    'close',
    () => {
      if (!committed) onCancel?.();
    },
    { once: true }
  );

  renderRecent();
  applyFilter();
}
