/**
 * État visuel de la barre de navigation précédent/suivant du configurateur. Extrait de
 * `configurator.js`, même logique que `stepper.js` mais pour les deux boutons de bas de page.
 */

/**
 * Met à jour la visibilité du bouton "Précédent" et le libellé du bouton "Suivant" selon la
 * position de l'étape courante.
 * - "Précédent" est masqué sur la première étape (rien à retour).
 * - "Suivant" devient "Ajouter au panier" sur la dernière étape (déclenche l'ajout plutôt que
 *   la navigation — voir `Configurator._addToCart`, docs/module-7-recap-panier.md).
 *
 * @param {HTMLElement} prevButton Bouton "Précédent" (`Configurator.$refs.prevStepButton`).
 * @param {HTMLElement} nextButton Bouton "Suivant" / "Ajouter au panier" (`Configurator.$refs.nextStepButton`).
 * @param {number} currentIndex Index de l'étape courante.
 * @param {number} lastIndex Index de la dernière étape (`schema.steps.length - 1`).
 */
export function updateStepNav(prevButton, nextButton, currentIndex, lastIndex) {
  prevButton.hidden = currentIndex === 0;
  nextButton.textContent = currentIndex === lastIndex ? 'Ajouter au panier' : 'Suivant';
}
