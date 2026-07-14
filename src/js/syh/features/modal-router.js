/**
 * Route générique de contenu pour un panel unique dans le DOM (voir modal-configurateur.twig).
 * Plusieurs boutons déclencheurs peuvent partager le même panel (ex: `Panel(#extra)`) ; chacun
 * porte `data-modal="{clé}"`. Le contenu correspondant est déclaré dans un
 * `<template data-modal="{clé}" data-modal-title="...">` et cloné dans le panel à l'ouverture.
 *
 * Le panel lui-même ne sait pas quel contenu afficher : `Modal.open()` (js-toolkit) fait
 * `this.$emit('open')`, qui dispatche un `CustomEvent('open')` natif sur l'élément du panel — sans
 * argument. On mémorise donc la clé demandée au clic (phase capture, pour passer avant le listener
 * de clic du composant Action qui déclenche `target.open()`), puis on la lit quand l'event arrive.
 *
 * @param {string} panelSelector - Sélecteur CSS du panel (ex : '#extra').
 * @param {Object<string, (contentEl: HTMLElement) => void>} onInsert - Callback par clé de modale,
 *   appelé avec le conteneur de contenu juste après le clonage du template correspondant.
 */
export function initModalRouter(panelSelector, onInsert = {}) {
  const panel = document.querySelector(panelSelector);
  if (!panel) return;

  const titleEl = panel.querySelector('[data-ref="modalTitle"]');
  const contentEl = panel.querySelector('[data-ref="modalContent"]');

  document.addEventListener(
    'click',
    (event) => {
      const trigger = event.target.closest('[data-modal]');
      if (!trigger) return;
      panel.dataset.pendingModal = trigger.dataset.modal;
    },
    true
  );

  panel.addEventListener('open', () => {
    const key = panel.dataset.pendingModal;
    if (!key || !contentEl) return;

    const tpl = document.querySelector(`template[data-modal="${key}"]`);
    // Clé sans template correspondant (donnée incohérente) : on ne touche pas au contenu affiché.
    if (!tpl) return;

    contentEl.replaceChildren(tpl.content.cloneNode(true));
    if (titleEl) titleEl.textContent = tpl.dataset.modalTitle ?? '';
    onInsert[key]?.(contentEl);
  });
}
