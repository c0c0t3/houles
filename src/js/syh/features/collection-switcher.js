/**
 * Contenu de la modale "Changer de collection" (panel `#extra`, clé `collections`).
 * Recharge la page avec `?collection={slug}` pour appliquer la nouvelle collection — rechargement
 * complet volontaire plutôt qu'un swap en mémoire, qui demanderait de démonter/remonter tous les
 * composants déjà instanciés par JS Toolkit (RadioField, ProductField...) et de réinitialiser
 * `selection` proprement. `Configurator.mounted()` lit ce paramètre au démarrage (voir
 * configurator.js) et retombe sur `data-option-collection` si absent.
 */

/**
 * Câble les boutons de sélection de collection (`data-collection="{slug}"`) de la modale.
 *
 * @param {HTMLElement} contentEl - Conteneur cloné du template `data-modal="collections"`.
 */
export function initCollectionSwitcher(contentEl) {
  contentEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-collection]');
    if (!btn) return;
    const url = new URL(window.location.href);
    url.searchParams.set('collection', btn.dataset.collection);
    window.location.href = url.toString();
  });
}
