import { renderSvgLayer, removeSvgLayer } from './svg-renderer.js';

/**
 * Composition et mise à jour des calques du rendu visuel live (`#renderedImage`, dans `.colG`).
 * Chaque field `product` qui porte un `layerOrder` pilote un **wrapper** de calque (voir
 * `getFieldLayerWrapper`), empilé selon cette valeur (z-index, toujours un entier). Un champ dont
 * la sélection courante n'a pas de `renderImage` (produit pas encore choisi, ou variante sans
 * visuel dédié) ne pilote aucun calque photo : rien n'est créé, et un calque déjà présent n'est pas
 * retiré tant qu'aucune valeur de remplacement n'est disponible.
 *
 * En `renderMode: "live_colored"`, un champ dont l'option sélectionnée porte `svgUrl` reçoit en
 * plus un calque SVG colorisé dynamiquement (voir svg-renderer.js), inséré **après** le calque
 * photo dans le même wrapper — donc au-dessus, par simple ordre DOM (pas de second z-index à
 * calculer). Absent en `live` simple (aucune option n'y déclare `svgUrl`).
 *
 * Voir docs/module-6-rendu-live.md.
 */

/**
 * Récupère (ou crée) le conteneur d'empilement dédié à un champ. Regroupe son calque photo et son
 * calque SVG sous un **même z-index entier** (`field.layerOrder`), plutôt que de calculer un
 * z-index fractionnaire pour faire passer le SVG au-dessus de sa photo (ex : `layerOrder + 0.5`) :
 * `z-index` n'accepte que des entiers en CSS, une valeur comme `2.5` est invalide et silencieusement
 * ignorée par le navigateur. Entre éléments d'un même wrapper, c'est l'ordre DOM qui tranche — le
 * calque photo est toujours inséré en premier (voir plus bas), le calque SVG après, donc au-dessus.
 *
 * @param {HTMLElement} container - Conteneur des calques (`#renderedImage`).
 * @param {string} fieldId
 * @param {number} zIndex - `field.layerOrder`, toujours un entier.
 * @returns {HTMLElement}
 */
function getFieldLayerWrapper(container, fieldId, zIndex) {
  let wrapper = container.querySelector(`[data-field-layer="${fieldId}"]`);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.dataset.fieldLayer = fieldId;
    wrapper.className = 'absolute inset-0 pointer-events-none';
    container.appendChild(wrapper);
  }
  wrapper.style.zIndex = zIndex;
  return wrapper;
}

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
  // Produit `noColoris` : une seule renderImage au niveau option, pas de déclinaison par coloris.
  if (option?.renderImage) return option.renderImage;
  const variant = option?.variants?.[produit.coloris];
  return variant?.renderImage ?? null;
}

/**
 * Résout le `svgUrl` de l'option sélectionnée d'un champ produit — propriété d'option, pas de
 * variante : un seul fichier SVG sert pour toutes les couleurs (voir svg-renderer.js).
 *
 * @param {object} field
 * @param {{ refBase: string }|undefined} produit
 * @returns {string|null}
 */
function resolveSvgUrl(field, produit) {
  if (!produit?.refBase) return null;
  const option = field.options?.find((o) => o.refBase === produit.refBase);
  return option?.svgUrl ?? null;
}

/**
 * Résout le code couleur hexadécimal du coloris sélectionné pour un champ produit.
 *
 * @param {{ coloris: string }|undefined} produit
 * @param {object[]} coloris - `collection.coloris[]` du schéma.
 * @returns {string|null}
 */
function resolveHex(produit, coloris) {
  if (!produit?.coloris) return null;
  return coloris.find((c) => String(c.id) === String(produit.coloris))?.hex ?? null;
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
 * @param {object[]} [coloris] - `collection.coloris[]` du schéma — nécessaire uniquement pour
 *   résoudre le `hex` des calques SVG (`live_colored`). Sans effet si aucune option n'a `svgUrl`.
 */
export function refreshLivePreview(container, fields, selection, coloris = []) {
  if (!container) return;

  for (const field of fields) {
    // Seuls les champs explicitement positionnés dans l'empilement pilotent un calque.
    if (field.layerOrder === undefined) continue;

    const produit = selection.produits?.[field.id];
    // Wrapper commun au calque photo et au calque SVG de ce champ — un seul z-index entier pour
    // les deux, l'ordre DOM à l'intérieur fait le reste (voir getFieldLayerWrapper ci-dessus).
    const wrapper = getFieldLayerWrapper(container, field.id, field.layerOrder);

    const renderImage = resolveRenderImage(field, produit);
    const layer = wrapper.querySelector(`[data-layer-field="${field.id}"]`);

    // Pas de renderImage disponible : on ne crée pas de calque, et on ne retire pas celui déjà
    // affiché (pas de rafraîchissement plutôt qu'un flash vide — voir Module 6).
    if (renderImage) {
      if (layer) {
        if (layer.src !== renderImage) layer.src = renderImage;
      } else {
        const img = document.createElement('img');
        img.dataset.layerField = field.id;
        img.alt = '';
        // Miroir passif en lecture seule : aucune zone cliquable sur l'aperçu (voir Module 6).
        img.className = 'absolute inset-0 w-full h-full object-contain pointer-events-none';
        img.src = renderImage;
        // Toujours en premier dans le wrapper (donc en dessous du SVG, ajouté après, quel que
        // soit l'ordre de création réel des deux calques).
        wrapper.prepend(img);
      }
    }

    // Surcouche SVG colorisée (live_colored) — au-dessus du calque photo du même champ.
    const svgUrl = resolveSvgUrl(field, produit);
    if (!svgUrl) {
      removeSvgLayer(wrapper, field.id);
      continue;
    }
    const hex = resolveHex(produit, coloris);
    if (!hex) continue; // pas de couleur résolue : on ne colorise pas au hasard

    renderSvgLayer(wrapper, field.id, svgUrl, hex).catch((err) => {
      console.error('[SYH] erreur de chargement du calque SVG :', field.id, err);
    });
  }
}
