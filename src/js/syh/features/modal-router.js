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
 * @param {Object<string, (contentEl: HTMLElement, trigger: HTMLElement|null) => void>} onInsert -
 *   Callback par clé de modale, appelé avec le conteneur de contenu juste après le clonage du
 *   template correspondant, plus l'élément déclencheur du clic (`null` si l'ouverture est
 *   programmatique, ex : LengthField).
 * @param {Object<string, {overlay?: string[], wrapper?: string[], container?: string[]}>} layouts -
 *   Classes utilitaires à appliquer aux éléments du panel selon la clé ouverte. Permet à une modale
 *   d'être ancrée/voilée différemment des autres sur un panel pourtant unique (ex : la modale
 *   `couleur` ancrée à droite et sans voile, pour laisser visible le rendu live à gauche). Les
 *   classes de transition/transform du composant Panel ne sont jamais touchées : on n'ajoute/retire
 *   que ce qui est déclaré ici. Une clé absente de `layouts` = apparence par défaut du Twig.
 */
export function initModalRouter(panelSelector, onInsert = {}, layouts = {}) {
  const panel = document.querySelector(panelSelector);
  if (!panel) return;

  const titleEl = panel.querySelector('[data-ref="modalTitle"]');
  const contentEl = panel.querySelector('[data-ref="modalContent"]');

  // Cibles du repositionnement par-modale. Le wrapper n'a pas de data-ref propre : c'est le parent
  // direct du conteneur (voir components/modal/default.twig).
  const overlayEl = panel.querySelector('[data-ref="overlay"]');
  const containerEl = panel.querySelector('[data-ref="container"]');
  const wrapperEl = containerEl?.parentElement ?? null;
  const layoutTargets = { overlay: overlayEl, wrapper: wrapperEl, container: containerEl };

  // Toutes les classes que le routeur est susceptible de poser, par cible : on repart de cet
  // ensemble à chaque ouverture pour éviter qu'une modale hérite du positionnement de la précédente.
  const managedClasses = { overlay: new Set(), wrapper: new Set(), container: new Set() };
  for (const layout of Object.values(layouts)) {
    for (const [target, classes] of Object.entries(layout)) {
      for (const cls of classes ?? []) managedClasses[target]?.add(cls);
    }
  }

  /**
   * Réinitialise le positionnement du panel puis applique celui de la clé demandée (si déclaré).
   *
   * @param {string} key
   */
  function applyLayout(key) {
    for (const [target, el] of Object.entries(layoutTargets)) {
      if (!el) continue;
      el.classList.remove(...managedClasses[target]);
      const classes = layouts[key]?.[target];
      if (classes?.length) el.classList.add(...classes);
    }
  }

  document.addEventListener(
    'click',
    (event) => {
      const trigger = event.target.closest('[data-modal]');
      if (!trigger) return;
      panel.dataset.pendingModal = trigger.dataset.modal;
      // Mémorise l'élément déclencheur pour le transmettre à onInsert (ex : la modale `couleur` a
      // besoin de savoir de quelle pièce vient le clic, via `data-piece`).
      panel._syhPendingTrigger = trigger;
      // Ouverture automatique : un simple `data-modal="{clé}"` suffit, sans wiring JS dédié.
      // Idempotent (Modal.open() no-op si déjà ouvert) — ne casse pas les déclenchements manuels
      // existants (ex : bouton injecté dynamiquement qui appelle aussi panel.open() lui-même).
      panel.open?.();
    },
    true
  );

  // Délégué une fois sur le conteneur (stable), plutôt que par modale : n'importe quel template
  // peut inclure un bouton `data-ref="fermer"` sans wiring JS spécifique.
  contentEl?.addEventListener('click', (event) => {
    if (event.target.closest('[data-ref="fermer"]')) panel.close?.();
  });

  panel.addEventListener('open', () => {
    const key = panel.dataset.pendingModal;
    if (!key || !contentEl) return;

    const tpl = document.querySelector(`template[data-modal="${key}"]`);
    // Clé sans template correspondant (donnée incohérente) : on ne touche pas au contenu affiché.
    if (!tpl) return;

    // Trigger consommé à l'ouverture : évite qu'un déclencheur périmé soit passé à la prochaine
    // ouverture programmatique (LengthField) qui ne renseigne pas `_syhPendingTrigger`.
    const trigger = panel._syhPendingTrigger ?? null;
    panel._syhPendingTrigger = null;

    contentEl.replaceChildren(tpl.content.cloneNode(true));
    if (titleEl) titleEl.textContent = tpl.dataset.modalTitle ?? '';
    applyLayout(key);
    onInsert[key]?.(contentEl, trigger);
  });
}
