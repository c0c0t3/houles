import { isVisible } from './show-if.js';

/**
 * Calcul des opérations de coupe de tube.
 *
 * Portage de calculCoupe() PHP côté front.
 * La coupe se base sur `longueur` brute (sans embouts) — fidèle au comportement PHP.
 * Le calcul de longueur avec embouts (getLongueurAvecEmbouts) est une responsabilité séparée,
 * non mélangée ici.
 */

/**
 * Construit le tableau des tubes à analyser depuis la sélection courante.
 *
 * @param {object} selection         - Sélection courante (selection.longueur, selection.produits)
 * @param {object[]} expandedFields  - Champs expandés de l'étape tube (_expandedStepFields)
 * @returns {Array<{reference: string, quantite: number, longueurStock: number}>}
 */
export function buildTubeInputs(selection, expandedFields) {
  const tubeFieldIds = ['tube', 'tube_avant', 'tube_arriere'];
  const longueur = Number(selection.longueur);
  const inputs = [];

  for (const fieldId of tubeFieldIds) {
    const sel = selection.produits?.[fieldId];
    if (!sel?.refBase) continue;

    const field = expandedFields.find((f) => f.id === fieldId);
    // Ignore les champs non visibles (ex : tube_avant/arriere en config simple).
    if (!field || !isVisible(field, selection)) continue;

    const option = field.options?.find((o) => o.refBase === sel.refBase);
    if (!option?.tubeLength) continue;

    // Résolution de la référence article complète via la variante coloris sélectionnée.
    const variant = option.variants?.[sel.coloris];
    const reference = variant?.id ?? option.id ?? sel.refBase;

    // quantite = nombre de segments nécessaires pour couvrir la longueur.
    const quantite = Math.ceil(longueur / option.tubeLength);

    inputs.push({ reference, quantite, longueurStock: option.tubeLength });
  }

  return inputs;
}

/**
 * Calcule le nombre de segments de tube nécessaires pour couvrir la longueur configurée.
 * Utilise l'option sélectionnée pour ce champ tube et sa propriété `tubeLength`.
 *
 * @param {object} selection      - Sélection courante (selection.longueur, selection.produits)
 * @param {string} tubeFieldId    - Id du champ tube (ex : 'tube', 'tube_avant', 'tube_arriere')
 * @param {object[]} expandedFields - Champs expandés de l'étape courante
 * @returns {number}
 */
export function computeTubeQty(selection, tubeFieldId, expandedFields) {
  const longueur = Number(selection.longueur);
  if (!longueur) return 0;
  const tubeField = expandedFields.find((f) => f.id === tubeFieldId);
  const sel = selection.produits[tubeFieldId];
  const option = tubeField?.options?.find((o) => o.refBase === sel?.refBase);
  // Fallback 180 si l'option n'a pas encore de tubeLength (données incomplètes).
  const tubeLength = option?.tubeLength ?? 180;
  return Math.ceil(longueur / tubeLength);
}

/**
 * Calcule les opérations de coupe pour un ensemble de tubes et retourne
 * les coupes individuelles ainsi que le forfait de service global.
 *
 * @param {Array<{reference: string, quantite: number, longueurStock: number}>} tubes
 * @param {number} longueur       - Longueur totale configurée en cm
 * @param {string} forfaitEan     - EAN13 du forfait coupe (fourni par collection.serviceCoupeEan)
 * @returns {{ coupes: object[], forfait: {ean: string, qty: number} | null }}
 */
export function calculCoupes(tubes, longueur, forfaitEan) {
  const coupes = [];

  for (const tube of tubes) {
    const coupesForTube = _calculCoupesTube(tube, longueur);
    coupes.push(...coupesForTube);
  }

  // Si aucune coupe n'est nécessaire, pas de forfait.
  if (!coupes.length) return { coupes: [], forfait: null };

  // Un seul forfait global, quantité = nombre total de coupes toutes positions confondues.
  return {
    coupes,
    forfait: { ean: forfaitEan, qty: coupes.length },
  };
}

/**
 * Calcule les coupes pour un tube donné selon le nombre de segments requis.
 * Une coupe n'est créée que si longueurStock > longueurCoupe (tube brut plus long que le segment).
 *
 * @param {{ reference: string, quantite: number, longueurStock: number }} tube
 * @param {number} longueur - longueur totale configurée en cm
 * @returns {object[]} coupes
 */
function _calculCoupesTube({ reference, quantite, longueurStock }, longueur) {
  const coupes = [];

  // Crée une coupe si le tube brut est strictement plus long que le segment demandé.
  const creerCoupe = (longueurCoupe) => {
    if (longueurStock > longueurCoupe) {
      coupes.push({ reference, longueur: longueurCoupe, sens: 'gauche' });
      return true;
    }
    return false;
  };

  switch (quantite) {
    case 1: {
      // Un seul segment = toute la longueur.
      creerCoupe(longueur);
      break;
    }

    case 2: {
      // Deux segments égaux.
      const lc = longueur / 2;
      if (longueurStock > lc) {
        creerCoupe(lc);
        creerCoupe(lc);
      }
      break;
    }

    case 3: {
      // Un grand segment + deux petits égaux.
      // -20 cm : marge/jonction fixe définie dans le PHP d'origine.
      let plusGrande = (longueur - 20) / 2;

      if (longueurStock > plusGrande) {
        creerCoupe(plusGrande);
      } else {
        // Le tube brut est utilisé tel quel pour ce segment — pas de coupe facturée.
        plusGrande = longueurStock;
      }

      const deuxAutres = (longueur - plusGrande) / 2;
      if (longueurStock > deuxAutres) {
        creerCoupe(deuxAutres);
        creerCoupe(deuxAutres);
      }
      break;
    }

    case 4: {
      // Quatre segments égaux (cas rare, prévu au cas où).
      const lc = longueur / 4;
      if (longueurStock > lc) {
        creerCoupe(lc);
        creerCoupe(lc);
        creerCoupe(lc);
        creerCoupe(lc);
      }
      break;
    }

    // Toute autre valeur : aucune coupe créée.
  }

  return coupes;
}
