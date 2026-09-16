import { withBasePath, prefixAssetPaths } from './features/base-path.js';

const BASE = withBasePath('/mock-api'); // ← point de bascule unique vers le vrai back

const MOCK_DELAY = 300;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchCollection(slug) {
  await delay(MOCK_DELAY);
  const res = await fetch(`${BASE}/collections/${slug}.json`);
  if (res.status === 404) throw new Error(`Collection "${slug}" introuvable`);
  if (!res.ok) throw new Error(`Erreur réseau (${res.status}) lors du chargement de la collection "${slug}"`);
  const data = await res.json();
  // Les chemins d'assets du JSON (image, thumbnail, renderImage, svgUrl...) sont root-absolute —
  // un seul point de réécriture ici (voir features/base-path.js) plutôt que dans chaque composant
  // consommateur (radio-field, product-field, live-preview, svg-renderer...).
  return prefixAssetPaths(data);
}

export async function checkCart(items) {
  await delay(MOCK_DELAY);
  const res = await fetch(`${BASE}/cart-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`Vérification panier indisponible (${res.status})`);
  return res.json();
}
