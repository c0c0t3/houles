/**
 * Calculateur de longueur suggérée — modale "Calcul de longueur".
 * Logique métier reprise à l'identique de l'ancien configurateur (calcul historiquement fait
 * côté serveur, désormais recalculé localement en live à chaque saisie).
 *
 * A = largeur de la fenêtre (saisie, ≥ 80 cm)
 * B = distance fenêtre - support (saisie, 15 à 40 cm)
 * C = distance support - embout (saisie, 5 à 50 cm)
 * D = distance entre les supports d'extrémité = A + 2×B (affichage uniquement)
 * Longueur de tube suggérée = A + 2×B + 2×C = D + 2×C — c'est cette valeur (pas D) qui est
 *   appliquée au champ `longueur` du configurateur au clic sur "Valider".
 * Longueur totale estimée = Longueur de tube - 2×recouvrementEmbout + 2×longueurEmbout, où
 *   longueurEmbout/recouvrementEmbout proviennent de l'embout actuellement sélectionné.
 *   Ce calcul ne doit pas être modifié (remarque explicite du métier).
 */

const DEFAULTS = { a: 120, b: 20, c: 10 };
const BOUNDS = {
  a: { min: 80, max: Infinity },
  b: { min: 15, max: 40 },
  c: { min: 5, max: 50 },
};

// Valeurs par défaut à la toute première ouverture, puis dernières valeurs saisies par
// l'utilisateur (le panel clone un template neuf à chaque ouverture — cet état module-level
// est ce qui permet de les restaurer d'une ouverture à l'autre).
const persisted = { ...DEFAULTS };

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
 * Ramène `value` dans l'intervalle [min, max].
 *
 * @param {number} value
 * @param {{min: number, max: number}} bounds
 * @returns {number}
 */
function clamp(value, { min, max }) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Câble le formulaire cloné dans `container` : calcul live de D, de la longueur de tube suggérée
 * et du total avec embouts. Notifie `onValider` avec la longueur de tube (pas D) quand
 * l'utilisateur valide, et `onCompute` avec le total à chaque recalcul.
 *
 * @param {HTMLElement} container - Conteneur du formulaire cloné (data-ref="modalContent").
 * @param {object}   deps
 * @param {() => { longueurEmbout: number, recouvrementEmbout: number }} deps.getEmbout -
 *   Caractéristiques de l'embout actuellement sélectionné dans le configurateur.
 * @param {(longueurTube: number) => void} deps.onValider - Appelé avec la longueur de tube
 *   suggérée au clic sur "Valider".
 * @param {(total: number) => void} [deps.onCompute] - Appelé avec le total avec embouts (nombre)
 *   à chaque recalcul (saisie ou ouverture).
 */
export function initLongueurCalculator(container, { getEmbout, onValider, onCompute }) {
  const inputA = container.querySelector('[data-ref="inputA"]');
  const inputB = container.querySelector('[data-ref="inputB"]');
  const inputC = container.querySelector('[data-ref="inputC"]');
  const resultD = container.querySelector('[data-ref="resultD"]');
  const resultLongSuggere = container.querySelector('[data-ref="longSuggere"]');
  const resultTotal = container.querySelector('[data-ref="resultTotal"]');
  const btnValider = container.querySelector('[data-ref="valider"]');

  // Restaure les valeurs de la dernière ouverture (ou les valeurs par défaut au tout premier appel).
  if (inputA) inputA.value = formatFr(persisted.a);
  if (inputB) inputB.value = formatFr(persisted.b);
  if (inputC) inputC.value = formatFr(persisted.c);

  // Mémorisée pour être renvoyée telle quelle à onValider, sans reparser le DOM au clic.
  let currentTubeLength = 0;

  const compute = () => {
    // Bornes appliquées au calcul en continu (saisie en cours non écrasée — voir clampOnBlur).
    const a = clamp(parseFr(inputA?.value), BOUNDS.a);
    const b = clamp(parseFr(inputB?.value), BOUNDS.b);
    const c = clamp(parseFr(inputC?.value), BOUNDS.c);
    persisted.a = a;
    persisted.b = b;
    persisted.c = c;

    const { longueurEmbout, recouvrementEmbout } = getEmbout();

    const d = a + 2 * b;
    currentTubeLength = d + 2 * c;
    const total = currentTubeLength - (2 * recouvrementEmbout) + (2 * longueurEmbout);

    if (resultD) resultD.textContent = `${formatFr(d)} CM`;
    if (resultLongSuggere) resultLongSuggere.textContent = `${formatFr(currentTubeLength)} cm`;
    if (resultTotal) resultTotal.textContent = `${formatFr(total)} cm`;
    onCompute?.(total);
  };

  // Corrige visuellement la saisie hors bornes une fois le champ quitté, sans gêner la frappe
  // en cours (un clamp sur chaque `input` empêcherait de taper "15" en partant de "1").
  const clampOnBlur = (input, bounds) => {
    input?.addEventListener('blur', () => {
      input.value = formatFr(clamp(parseFr(input.value), bounds));
      compute();
    });
  };

  for (const input of [inputA, inputB, inputC]) {
    input?.addEventListener('input', compute);
  }
  clampOnBlur(inputA, BOUNDS.a);
  clampOnBlur(inputB, BOUNDS.b);
  clampOnBlur(inputC, BOUNDS.c);

  btnValider?.addEventListener('click', () => onValider(currentTubeLength));

  compute();
}
