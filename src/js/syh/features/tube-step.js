import { computeTubeQty } from './tube-coupe.js';

/**
 * Ajustement de l'étape « À propos du tube » : quantité de tubes calculée en JS, injectée dans le
 * descripteur du champ `about_tube`, et masquage quand un seul tube suffit. Extrait de
 * `configurator.js`. Voir docs/ancienne-regle-coupe.md.
 */

/**
 * Pour chaque paire tube/about_tube : calcule la qty de tubes, l'injecte dans le descripteur
 * du champ about_tube (lu par ProductField._computeQty), et ajuste la visibilité.
 * About_tube est caché si un seul tube suffit (qty ≤ 1), même si son showIf l'autorise.
 *
 * @param {HTMLElement} stepEl - Élément DOM de l'étape courante.
 * @param {object} selection - État courant du configurateur.
 * @param {object[]} expandedFields - Champs expandés de l'étape (`splitByConfig` résolu).
 */
export function refreshTubeStep(stepEl, selection, expandedFields) {
  const pairs = [
    ['tube', 'about_tube'],
    ['tube_avant', 'about_tube_avant'],
    ['tube_arriere', 'about_tube_arriere'],
  ];

  for (const [tubeId, aboutId] of pairs) {
    const tubeEl = stepEl.querySelector(`[data-field-id="${tubeId}"]`);
    // Si le champ tube est absent ou caché, l'about n'est pas pertinent.
    if (!tubeEl || tubeEl.hidden) continue;

    const qty = computeTubeQty(selection, tubeId, expandedFields);

    // Injecte la qty dans le descripteur partagé : ProductField.refresh() la lira via _field._segmentQty.
    const aboutField = expandedFields.find((f) => f.id === aboutId);
    if (aboutField) aboutField._segmentQty = Math.max(0, qty - 1);

    const aboutEl = stepEl.querySelector(`[data-field-id="${aboutId}"]`);
    if (!aboutEl) continue;

    // Masquage UI uniquement — ne touche pas selection.produits.
    // Le payload panier est calculé dynamiquement par _resolveQty, pas depuis cette visibilité DOM.
    if (qty <= 1) aboutEl.hidden = true;
  }
}
