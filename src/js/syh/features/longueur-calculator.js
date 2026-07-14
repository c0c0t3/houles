/**
 * Calculateur de longueur suggérée — modale "Calcul de longueur".
 * Portage du formulaire legacy (A, B, C → D) avec ajout du total incluant les embouts.
 *
 * A = largeur de la fenêtre
 * B = distance fenêtre - support
 * C = distance support - embout
 * D = distance entre les supports d'extrémité = A + 2×B
 * Total avec embouts = A + 2×B + 2×C + 2×E, où E = `emboutValue` de l'embout sélectionné
 */

// Valeurs par défaut à la toute première ouverture, puis dernières valeurs saisies par
// l'utilisateur (le panel clone un template neuf à chaque ouverture — cet état module-level
// est ce qui permet de les restaurer d'une ouverture à l'autre).
const persisted = { a: 120, b: 20, c: 10 };

/**
 * Parse un nombre au format français virgule décimale (ex : "134,0") en float.
 *
 * @param {string} value
 * @returns {number} 0 si la valeur est vide ou invalide.
 */
function parseFr(value) {
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formate un nombre en chaîne virgule décimale à 1 décimale (ex : 180 → "180,0").
 *
 * @param {number} value
 * @returns {string}
 */
export function formatFr(value) {
  return value.toFixed(1).replace('.', ',');
}

/**
 * Câble le formulaire cloné dans `container` : calcul live de D et du total avec embouts,
 * notifie `onValider` avec D quand l'utilisateur valide, et `onCompute` avec le total à chaque
 * recalcul (pour affichage dans le récapitulatif persistant).
 *
 * @param {HTMLElement} container - Conteneur du formulaire cloné (data-ref="modalContent").
 * @param {object}   deps
 * @param {() => number} deps.getEmboutValue - Renvoie la valeur `emboutValue` de l'embout
 *   actuellement sélectionné dans le configurateur (0 si aucune sélection).
 * @param {(d: number) => void} deps.onValider - Appelé avec D (nombre) au clic sur "Valider".
 * @param {(total: number) => void} [deps.onCompute] - Appelé avec le total avec embouts (nombre)
 *   à chaque recalcul (saisie ou ouverture).
 */
export function initLongueurCalculator(container, { getEmboutValue, onValider, onCompute }) {
  const inputA = container.querySelector('[data-ref="inputA"]');
  const inputB = container.querySelector('[data-ref="inputB"]');
  const inputC = container.querySelector('[data-ref="inputC"]');
  const resultD = container.querySelector('[data-ref="resultD"]');
  const resultTotal = container.querySelector('[data-ref="resultTotal"]');
  const btnValider = container.querySelector('[data-ref="valider"]');

  // Restaure les valeurs de la dernière ouverture (ou les valeurs par défaut au tout premier appel).
  if (inputA) inputA.value = formatFr(persisted.a);
  if (inputB) inputB.value = formatFr(persisted.b);
  if (inputC) inputC.value = formatFr(persisted.c);

  // Mémorisé pour être renvoyé tel quel à onValider, sans reparser le DOM au clic.
  let currentD = 0;

  const compute = () => {
    persisted.a = parseFr(inputA?.value);
    persisted.b = parseFr(inputB?.value);
    persisted.c = parseFr(inputC?.value);
    const e = getEmboutValue();

    currentD = persisted.a + 2 * persisted.b;
    const total = currentD + 2 * persisted.c + 2 * e;

    if (resultD) resultD.textContent = `${formatFr(currentD)} CM`;
    if (resultTotal) resultTotal.textContent = `${formatFr(total)} cm`;
    onCompute?.(total);
  };

  for (const input of [inputA, inputB, inputC]) {
    input?.addEventListener('input', compute);
  }
  btnValider?.addEventListener('click', () => onValider(currentD));

  compute();
}
