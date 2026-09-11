/**
 * Route générique de contenu pour un panel du configurateur (voir modal-configurateur.twig).
 * Plusieurs boutons déclencheurs peuvent partager le même panel ; chacun porte `data-modal="{clé}"`.
 * Le contenu correspondant est déclaré dans un `<template data-modal="{clé}" data-modal-title="...">`
 * et cloné dans le panel à l'ouverture.
 *
 * Le panel lui-même ne sait pas quel contenu afficher : `Modal.open()` (js-toolkit) fait
 * `this.$emit('open')`, qui dispatche un `CustomEvent('open')` natif sur l'élément du panel — sans
 * argument. On mémorise donc la clé demandée au clic (phase capture, pour passer avant le listener
 * de clic du composant Action qui déclenche `target.open()`), puis on la lit quand l'event arrive.
 *
 * Plusieurs routeurs peuvent coexister (un par panel) : chaque instance n'ouvre que les clés
 * qu'elle déclare dans `onInsert` — un clic sur un `data-modal` géré par un autre panel est ignoré.
 *
 * @param {string} panelSelector - Sélecteur CSS du panel (ex : '#extra', '#syh-couleur').
 * @param {Object<string, (contentEl: HTMLElement, trigger: HTMLElement|null) => void>} onInsert -
 *   Callback par clé de modale gérée par ce panel, appelé avec le conteneur de contenu juste après
 *   le clonage du template correspondant, plus l'élément déclencheur du clic (`null` si l'ouverture
 *   est programmatique, ex : LengthField).
 */
export function initModalRouter(panelSelector, onInsert = {}) {
  const panel = document.querySelector(panelSelector);
  if (!panel) return;

  const titleEl = panel.querySelector('[data-ref="modalTitle"]');
  const contentEl = panel.querySelector('[data-ref="modalContent"]');

  // Ce routeur ne réagit qu'aux clés qu'il déclare — les autres `data-modal` appartiennent à un
  // autre panel (voir modal-configurateur.twig : #extra et #syh-couleur).
  const ownsKey = (key) => Boolean(key) && Object.prototype.hasOwnProperty.call(onInsert, key);

  document.addEventListener(
    'click',
    (event) => {
      const trigger = event.target.closest('[data-modal]');
      if (!trigger || !ownsKey(trigger.dataset.modal)) return;
      panel.dataset.pendingModal = trigger.dataset.modal;
      // Mémorise l'élément déclencheur pour le transmettre à onInsert (ex : la modale `couleur` a
      // besoin de savoir de quelle pièce vient le clic, via `data-piece`).
      panel._syhPendingTrigger = trigger;
      // Ouverture automatique : un simple `data-modal="{clé}"` suffit, sans wiring JS dédié.
      // Idempotent (Modal.open() no-op si déjà ouvert) — ne casse pas les déclenchements manuels
      // existants (ex : bouton injecté dynamiquement qui appelle aussi panel.open() lui-même).
      panel.open?.();
    },
    true,
  );

  // Délégué une fois sur le conteneur (stable), plutôt que par modale : n'importe quel template
  // peut inclure un bouton `data-ref="fermer"` sans wiring JS spécifique.
  contentEl?.addEventListener('click', (event) => {
    if (event.target.closest('[data-ref="fermer"]')) panel.close?.();
  });

  panel.addEventListener('open', () => {
    const key = panel.dataset.pendingModal;
    // Ouverture déclenchée pour une clé d'un autre panel (ou sans clé) : rien à faire ici.
    if (!ownsKey(key) || !contentEl) return;

    const tpl = document.querySelector(`template[data-modal="${key}"]`);
    // Clé sans template correspondant (donnée incohérente) : on ne touche pas au contenu affiché.
    if (!tpl) return;

    // Trigger consommé à l'ouverture : évite qu'un déclencheur périmé soit passé à la prochaine
    // ouverture programmatique (LengthField) qui ne renseigne pas `_syhPendingTrigger`.
    const trigger = panel._syhPendingTrigger ?? null;
    panel._syhPendingTrigger = null;

    contentEl.replaceChildren(tpl.content.cloneNode(true));
    if (titleEl) titleEl.textContent = tpl.dataset.modalTitle ?? '';
    onInsert[key]?.(contentEl, trigger);
  });
}
