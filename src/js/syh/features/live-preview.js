/**
 * Composition et mise à jour des calques du rendu visuel live (`#renderedImage`, dans `.colG`).
 * Chaque field `product` qui porte un `layerOrder` pilote un calque, empilé selon cette valeur
 * (z-index). Un champ dont la sélection courante n'a pas de `renderImage` (produit pas encore
 * choisi, ou variante sans visuel dédié) ne pilote aucun calque : rien n'est créé, et un calque
 * déjà présent n'est pas retiré tant qu'aucune valeur de remplacement n'est disponible.
 * Voir docs/module-6-rendu-live.md.
 */

/**
 * Résout le `renderImage` de la sélection courante d'un champ produit (refBase + coloris).
 *
 * @param {object} field - Descripteur de champ `product`, issu du schéma (avec `options[]`).
 * @param {{ refBase: string, coloris: string }|undefined} produit - Sélection courante du champ
 *   (`selection.produits[field.id]`), absente si rien n'est encore sélectionné.
 * @returns {string|null} URL du `renderImage`, ou `null` si le champ n'a pas de sélection, si
 *   l'option/variante est introuvable, ou si la variante n'a pas de `renderImage`.
 */
function resolveRenderImage(field, produit) {
  if (!produit?.refBase) return null;
  const option = field.options?.find((o) => o.refBase === produit.refBase);
  const variant = option?.variants?.[produit.coloris];
  return variant?.renderImage ?? null;
}

/**
 * Recompose les calques du rendu visuel live à partir de la sélection courante. Idempotent :
 * peut être rappelée à chaque changement de sélection, ne touche que les calques dont l'état a
 * changé.
 *
 * @param {HTMLElement|null} container - Conteneur des calques (`#renderedImage`,
 *   `position: relative`). Aucun effet si absent (ex : template pas encore monté).
 * @param {object[]} fields - Champs `product` du schéma, à plat, toutes étapes confondues
 *   (`splitByConfig` déjà résolu — voir `Configurator._expandedStepFields`).
 * @param {object} selection - État courant du configurateur (`selection.produits` indexé par id
 *   de champ).
 */
export function refreshLivePreview(container, fields, selection) {
  if (!container) return;

  for (const field of fields) {
    // Seuls les champs explicitement positionnés dans l'empilement pilotent un calque.
    if (field.layerOrder === undefined) continue;

    const renderImage = resolveRenderImage(field, selection.produits?.[field.id]);
    const layer = container.querySelector(`[data-layer-field="${field.id}"]`);

    // Pas de renderImage disponible : on ne crée pas de calque, et on ne retire pas celui déjà
    // affiché (pas de rafraîchissement plutôt qu'un flash vide — voir Module 6).
    if (!renderImage) continue;

    if (layer) {
      if (layer.src !== renderImage) layer.src = renderImage;
      layer.style.zIndex = field.layerOrder;
      continue;
    }

    const img = document.createElement('img');
    img.dataset.layerField = field.id;
    img.alt = '';
    // Miroir passif en lecture seule : aucune zone cliquable sur l'aperçu (voir Module 6).
    img.className = 'absolute inset-0 w-full h-full object-contain pointer-events-none';
    img.style.zIndex = field.layerOrder;
    img.src = renderImage;
    container.appendChild(img);
  }
}
