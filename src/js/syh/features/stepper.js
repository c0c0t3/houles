/**
 * Rendu et état visuel du stepper horizontal (navigation inter-étapes). Extrait de
 * `configurator.js`. La délégation de clic (`onStepperClick`) et l'orchestration de la navigation
 * (`_showStep`) restent dans le composant.
 */

/**
 * Génère les boutons de navigation inter-étapes depuis le schéma. Appelé une seule fois au montage.
 *
 * Rendu : stepper horizontal. Un bouton par étape (pastille numérotée + libellé),
 * les pastilles étant reliées par une barre horizontale passant par leur centre.
 * L'état visuel (opacité) est piloté par {@link updateStepperState} via les classes
 * `is-active` (étape courante) et `is-done` (étapes déjà parcourues).
 *
 * @param {HTMLElement} stepperEl - Conteneur du stepper (`this.$refs.stepper`).
 * @param {object[]} steps - Étapes du schéma (`schema.steps`).
 */
export function renderStepper(stepperEl, steps) {
  const lastIndex = steps.length - 1;

  stepperEl.innerHTML = steps
    .map((step, i) => {
      // Barre de liaison vers l'étape suivante — absente sur la dernière étape.
      // Part du centre de la pastille courante (left-1/2) et s'étend sur toute la
      // largeur du bouton (w-full) : elle rejoint donc le centre de la pastille
      // suivante (boutons de largeur égale via flex-1). z-0 + pointer-events-none
      // pour passer sous la pastille (bg-white) et laisser le clic au bouton.
      const connector =
        i < lastIndex
          ? '<span aria-hidden="true" class="pointer-events-none absolute left-1/2 top-4 z-0 h-0.5 w-full bg-brown"></span>'
          : '';

      return `<button type="button" data-step="${i}" class="relative flex flex-1 flex-col items-center gap-2 px-2 text-purple-extra-light is-active:text-purple is-done:text-purple">${connector}<span class="relative z-10 grid size-8 place-items-center rounded-full border-2 border-brown bg-white text-sm parent-is-active:bg-brown parent-is-active:text-white parent-is-done:bg-brown parent-is-done:text-white">${i + 1}</span><span class="text-center text-sm leading-tight">${step.label}</span></button>`;
    })
    .join('');
}

/**
 * Met à jour l'état visuel du stepper :
 * - is-active : étape courante                → opacity-100 (+ pastille pleine)
 * - is-done   : étapes précédentes parcourues → opacity-100
 * Les étapes futures restent à opacity-50 (état par défaut du bouton).
 *
 * @param {HTMLElement} stepperEl - Conteneur du stepper.
 * @param {number} index - Index de l'étape courante.
 */
export function updateStepperState(stepperEl, index) {
  stepperEl.querySelectorAll('button[data-step]').forEach((btn) => {
    const step = Number(btn.dataset.step);
    btn.classList.toggle('is-active', step === index);
    btn.classList.toggle('is-done', step < index);
  });
}
