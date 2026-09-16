/* global __SYH_BASE_PATH__ */

/**
 * Sous-dossier de déploiement du build (constante injectée au build par meta.config.js — vide en
 * dev, "/assets/houles" en prod). Le SYH fetch "à la main" des fichiers statiques dont le chemin
 * est root-absolute ("/xxx") — le mock JSON (configuratorApi.js) et les visuels/SVG qu'il référence
 * (renderImage, svgUrl, thumbnail, image des pictos...) — et le navigateur résout ces chemins
 * depuis la **racine du domaine**, pas depuis le sous-dossier où le build est réellement déployé.
 * `output.publicPath` (côté webpack) ne couvre que le CSS/JS packagé, jamais ces chemins-là.
 */

/**
 * Préfixe un chemin root-absolute avec le sous-dossier de déploiement. Sans effet sur une URL déjà
 * absolue (`http(s)://...`, `//cdn...`) : ces chemins ne bougent jamais.
 *
 * @param {string} path - Chemin root-absolute (commence par "/").
 * @returns {string}
 */
export function withBasePath(path) {
  return `${__SYH_BASE_PATH__}${path}`;
}

/**
 * Réécrit récursivement, en place, toutes les valeurs chaîne root-absolute d'un objet/tableau JSON
 * via `withBasePath` — un seul point de passage pour tous les chemins d'assets embarqués dans le
 * schéma de collection (aujourd'hui : `image`, `thumbnail`, `renderImage`, `svgUrl` ; un futur champ
 * du même type est couvert sans rien changer ailleurs). Appelé une fois par `fetchCollection`.
 *
 * @param {*} data - Valeur JSON (objet, tableau, ou scalaire) — mutée en place si objet/tableau.
 * @returns {*} `data`, pour un usage en chaîne au niveau racine.
 */
export function prefixAssetPaths(data) {
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i += 1) {
      data[i] = typeof data[i] === 'string' ? prefixIfRootPath(data[i]) : prefixAssetPaths(data[i]);
    }
    return data;
  }
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      data[key] = typeof data[key] === 'string' ? prefixIfRootPath(data[key]) : prefixAssetPaths(data[key]);
    }
    return data;
  }
  return data;
}

/**
 * @param {string} value
 * @returns {string}
 */
function prefixIfRootPath(value) {
  return value.startsWith('/') && !value.startsWith('//') ? withBasePath(value) : value;
}
