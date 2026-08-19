/**
 * DEV LOCAL UNIQUEMENT. Les URLs d'image des JSON mock sont en dur, avec un suffixe de format
 * Houlès (`_S1_`, `_L1_`, `_P1_` — carré / paysage / portrait) qui ne correspond pas toujours à
 * l'image réellement présente sur le CDN, d'où des 404 en local. En production, Houlès résout ce
 * format côté back (règle largeur/hauteur communiquée : carré → S, largeur > hauteur → L, sinon
 * → P) et fournit une URL déjà correcte — ce module n'a donc pas d'équivalent à maintenir côté
 * client une fois l'API réelle branchée.
 *
 * Faute de connaître la vraie dimension de chaque photo en local, on procède par essai : sur 404
 * d'une `<img>`, on retente avec les deux autres formats jusqu'à ce qu'un charge (ou abandon avec
 * un avertissement console si aucun des trois ne répond).
 * À retirer quand les URLs viendront de l'API réelle.
 */

const FORMAT_RE = /_([SLP])(\d)_(\d+)(\.\w+)$/;
const FORMATS = ['S', 'L', 'P'];

let initialized = false;

/**
 * Remplace la lettre de format dans une URL Houlès (`..._S1_1.jpg` → `..._L1_1.jpg`), en
 * conservant l'index de taille et le numéro de variante d'origine.
 *
 * @param {string} url
 * @param {'S'|'L'|'P'} format
 * @returns {string}
 */
function swapFormat(url, format) {
  return url.replace(FORMAT_RE, (_match, _letter, size, index, ext) => `_${format}${size}_${index}${ext}`);
}

/**
 * Câble un fallback global (capture phase — les événements `error` sur `<img>` ne remontent pas)
 * qui retente les formats S/L/P restants à chaque échec de chargement. Idempotent : les appels
 * suivants sont des no-op.
 */
export function initImageFormatFallback() {
  if (initialized) return;
  initialized = true;

  document.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;

      const match = img.src.match(FORMAT_RE);
      // Pas une URL au format Houlès (S1/L1/P1) : rien à tenter, on laisse l'image cassée.
      if (!match) return;

      img._triedFormats ??= new Set([match[1]]);
      const remaining = FORMATS.filter((f) => !img._triedFormats.has(f));

      if (!remaining.length) {
        console.warn('[SYH] image indisponible dans tous les formats (S/L/P) :', img.dataset.originalSrc ?? img.src);
        return;
      }

      const nextFormat = remaining[0];
      img._triedFormats.add(nextFormat);
      img.dataset.originalSrc ??= img.src;
      img.src = swapFormat(img.src, nextFormat);
    },
    true
  );
}
