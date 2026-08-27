/**
 * Colorisation SVG dynamique (`renderMode: "live_colored"`). Les SVG sont chargés en inline via
 * fetch — jamais en `<img>` ou `url()` — pour pouvoir cibler les éléments en JS et les coloriser.
 * Chaque élément colorisable porte un attribut `data-fill` (voir CLAUDE.md, section « Rendu SVG »).
 * Un seul fichier SVG sert pour toutes les couleurs d'une option : `data-fill` marque les zones à
 * recolorer, le fichier lui-même ne code aucune couleur en dur. Voir docs/module-6-rendu-live.md.
 */

// svgUrl -> texte SVG brut. Évite de refetch le même fichier à chaque changement de coloris.
const svgTextCache = new Map();

// layerKey -> Promise<HTMLElement>. Sérialise les créations concurrentes du même calque : sans
// ça, plusieurs champs qui montent dans le même tick (ex : tous les ProductField au chargement)
// déclenchent chacun un refreshLivePreview() qui relit TOUS les champs, donc plusieurs appels
// simultanés pour le même layerKey — chacun voit le calque absent (le premier n'a pas fini son
// fetch/DOM) et crée sa propre copie. D'où les doublons en DOM au chargement.
const layerCreationInFlight = new Map();

/**
 * Récupère le texte source d'un SVG, depuis le cache si déjà chargé.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchSvgText(url) {
  if (svgTextCache.has(url)) return svgTextCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SVG introuvable : ${url} (HTTP ${res.status})`);
  const text = await res.text();
  svgTextCache.set(url, text);
  return text;
}

/**
 * Applique une couleur à tous les éléments `[data-fill]` d'un SVG déjà inliné dans le DOM.
 *
 * @param {SVGElement} svgEl
 * @param {string} hex
 */
function applyFill(svgEl, hex) {
  svgEl.querySelectorAll('[data-fill]').forEach((el) => el.setAttribute('fill', hex));
}

/**
 * Construit le calque (fetch + parsing + wrapper DOM), sans le coloriser — la couleur est
 * appliquée séparément par l'appelant, une fois le calque en place.
 *
 * Si le SVG source n'a pas de `viewBox`, on en dérive un depuis `width`/`height` **avant** de les
 * retirer : sans ça, un SVG sans viewBox retombe sur la taille par défaut du navigateur et son
 * contenu (le `<g>`, les paths...) se retrouve décalé/mal mis à l'échelle une fois étiré en
 * `w-full h-full` par CSS — le viewBox est ce qui garde le système de coordonnées d'origine.
 *
 * @param {HTMLElement} container
 * @param {string} layerKey
 * @param {string} svgUrl
 * @returns {Promise<HTMLElement|null>}
 */
async function createLayer(container, layerKey, svgUrl) {
  const svgText = await fetchSvgText(svgUrl);
  const template = document.createElement('template');
  template.innerHTML = svgText.trim();
  const svgEl = template.content.querySelector('svg');
  if (!svgEl) return null; // fichier invalide : pas de calque plutôt qu'un calque cassé

  if (!svgEl.hasAttribute('viewBox')) {
    const w = parseFloat(svgEl.getAttribute('width'));
    const h = parseFloat(svgEl.getAttribute('height'));
    if (w > 0 && h > 0) svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  // mix-blend-multiply : même traitement que les photos produit (voir index.twig), pour que la
  // teinte se fonde avec les ombres/reliefs du calque photo dessous plutôt que de l'écraser.
  svgEl.classList.add('w-full', 'h-full', 'mix-blend-multiply');

  // Un calque pour ce layerKey a pu être créé entre-temps par un autre appel (autre svgUrl) —
  // on le remplace plutôt que d'empiler.
  container.querySelector(`[data-svg-layer="${layerKey}"]`)?.remove();

  const wrapper = document.createElement('div');
  wrapper.dataset.svgLayer = layerKey;
  wrapper.dataset.svgUrl = svgUrl;
  // Miroir passif comme les calques photo (voir live-preview.js) : aucune interaction ici.
  // Pas de z-index ici : l'appelant (live-preview.js) gère l'empilement au niveau du wrapper de
  // champ, en insérant ce calque après le calque photo dans le DOM.
  wrapper.className = 'absolute inset-0 pointer-events-none';
  wrapper.appendChild(svgEl);
  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Charge (une fois, en cache) puis colorise un calque SVG dans le conteneur de rendu. Idempotent :
 * peut être rappelée à chaque changement de sélection — ne réinjecte le SVG dans le DOM que si le
 * `svgUrl` a changé, sinon se contente de mettre à jour la couleur.
 *
 * @param {HTMLElement} container - Wrapper de calque du champ (voir `live-preview.js`,
 *   `getFieldLayerWrapper`) — pas directement `#renderedImage` : l'empilement avec le calque photo
 *   du même champ se fait par ordre DOM à l'intérieur de ce wrapper, pas par z-index.
 * @param {string} layerKey - Identifiant stable du calque (id du champ produit).
 * @param {string} svgUrl - Chemin du SVG (donnée JSON, jamais codé en dur — voir Module 6).
 * @param {string} hex - Couleur à appliquer sur les éléments `[data-fill]`.
 */
export async function renderSvgLayer(container, layerKey, svgUrl, hex) {
  let wrapper = container.querySelector(`[data-svg-layer="${layerKey}"]`);

  if (!wrapper || wrapper.dataset.svgUrl !== svgUrl) {
    if (!layerCreationInFlight.has(layerKey)) {
      layerCreationInFlight.set(
        layerKey,
        createLayer(container, layerKey, svgUrl).finally(() => layerCreationInFlight.delete(layerKey))
      );
    }
    wrapper = await layerCreationInFlight.get(layerKey);
    if (!wrapper) return; // fichier invalide (voir createLayer)
  }

  const svgEl = wrapper.querySelector('svg');
  if (svgEl) applyFill(svgEl, hex);
}

/**
 * Retire un calque SVG du conteneur (ex : le champ n'a plus de sélection avec `svgUrl`).
 *
 * @param {HTMLElement} container
 * @param {string} layerKey
 */
export function removeSvgLayer(container, layerKey) {
  container.querySelector(`[data-svg-layer="${layerKey}"]`)?.remove();
}
