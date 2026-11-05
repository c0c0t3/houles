import { isVisible } from './show-if.js';
import {
  buildTubeInputs,
  calculCoupes,
  computeTubeQty,
  resolveRailLongueur,
} from './tube-coupe.js';
import { FORFAIT_COUPE_EAN } from './forfait-coupe.js';

/**
 * Construction du payload panier : lignes produit (avec quantités calculées) + coupes de tube
 * + forfait service coupe. Voir docs/module-5-etapes-intermediaires.md pour le moteur de quantités.
 */

/**
 * Résout la quantité d'un produit selon le mode déclaré dans `field.quantity`.
 * Calcul toujours à la volée — ne dépend pas d'un état UI potentiellement stale.
 *
 * @param {object}   field       - Descripteur de champ (expandé)
 * @param {object}   option      - Option produit sélectionnée
 * @param {number}   longueur    - Longueur configurée en cm
 * @param {object[]} allExpanded - Tous les champs expandés (pour résoudre les champs liés)
 * @param {object}   selection   - Sélection courante (nécessaire pour segmented_minus_1)
 * @param {object}   [collection] - `schema.collection`, pour le retrait de longueur en tirage
 *   (mode `segmented` : longueur de rail réellement coupée, plus courte qu'en affichage — voir
 *   `resolveRailLongueur` dans tube-coupe.js et docs/module-9-systeme-tirage.md §5)
 * @returns {number}
 */
export function resolveQty(field, option, longueur, allExpanded, selection, collection) {
  const { quantity } = field;
  if (!quantity) return 1;

  switch (quantity.mode) {
    case 'fixed':
      return Math.ceil(quantity.value / (option.qtyParUnite ?? 1));

    case 'segmented': {
      if (!option.tubeLength || !longueur) return 0;
      const longueurEffective = resolveRailLongueur(selection, collection);
      return Math.ceil(longueurEffective / option.tubeLength);
    }

    case 'segmented_minus_1': {
      // Calcul dynamique : identifie le champ tube lié par convention de nommage (about_X → X).
      const tubeFieldId = field.id.replace(/^about_/, '');
      const tubeQty = computeTubeQty(selection, tubeFieldId, allExpanded, collection);
      return Math.max(0, tubeQty - 1);
    }

    case 'per_interval': {
      if (!quantity.interval || !longueur) return 0;
      // Ex : 290cm / 10cm interval + 1 extra = 30 anneaux → ceil(30 / 6 par pack) = 5 packs.
      const raw = Math.ceil(longueur / quantity.interval) + (quantity.extra ?? 0);
      return Math.ceil(raw / (option.qtyParUnite ?? 1));
    }

    default:
      return 1;
  }
}

/**
 * Parcourt tous les champs produit sélectionnés et construit les lignes d'article.
 * La quantité est calculée selon le mode déclaré dans `field.quantity`.
 *
 * @param {object}   schema
 * @param {object}   selection
 * @param {object[]} expandedStepFields - Champs expandés par step (Configurator._expandedStepFields)
 * @returns {{ items: Array<{id: string, qty: number, name: string, refBase: string, coloris: string|null, prixUnitaire: number|null, prixTotal: number}>, hasForfaitArticle: boolean }}
 */
function buildProductItems(schema, selection, expandedStepFields) {
  const longueur = Number(selection.longueur);
  const allExpanded = expandedStepFields.flat();
  const collection = schema.collection;
  const itemMap = new Map(); // id article → item, pour agréger les doublons (ex: support + support_interm)
  // Vrai dès qu'un article "dans le forfait" (field.forfait) a au moins une ligne — déclenche
  // l'ajout de la ligne "Forfait de montage" (voir computeCartPayload). Module 9 §5.
  let hasForfaitArticle = false;

  for (const field of allExpanded) {
    if (field.type !== 'product' && field.type !== 'product_toggle') continue;

    // Visibilité JSON uniquement — pas de dépendance DOM (stale si step non actif).
    // Les about_tube à qty=0 sont naturellement exclus par la vérification qty <= 0 ci-dessous.
    if (!isVisible(field, selection)) continue;

    const sel = selection.produits?.[field.id];
    if (!sel?.refBase) continue;

    const option = field.options?.find((o) => o.refBase === sel.refBase);
    if (!option) continue;

    // Calcul à la volée — indépendant de l'état DOM ou de _segmentQty.
    const qty = resolveQty(field, option, longueur, allExpanded, selection, collection);
    if (qty <= 0) continue;

    // field.forfait : en tirage, cet article est dans le forfait de montage — affiché sans prix
    // unitaire (une seule ligne "Forfait de montage" porte le coût, voir computeCartPayload).
    // Ignoré hors tirage (article facturé normalement). Module 9 §5.
    const isForfaitArticle = field.forfait === true && selection.systeme_tirage === 'oui';
    if (isForfaitArticle) hasForfaitArticle = true;

    const variant = option.variants?.[sel.coloris];
    const id = variant?.id ?? option.id ?? sel.refBase;
    // Prix placeholder de démo, porté par la variante coloris ou par l'option (noColoris) — voir
    // mock-api/collections (données Elastic en production).
    const prixUnitaire = isForfaitArticle ? null : (variant?.prix ?? option.prix ?? 0);
    const prixTotalLigne = isForfaitArticle ? 0 : prixUnitaire * qty;

    // Agrège les lignes avec le même id article (ex : support + opt_support_interm = même ref).
    const existing = itemMap.get(id);
    if (existing) {
      existing.qty += qty;
      existing.prixTotal += prixTotalLigne;
    } else {
      itemMap.set(id, {
        id,
        qty,
        name: option.label,
        refBase: sel.refBase,
        coloris: sel.coloris ?? null,
        prixUnitaire,
        prixTotal: prixTotalLigne,
      });
    }
  }

  return { items: [...itemMap.values()], hasForfaitArticle };
}

/**
 * Construit le payload complet à envoyer au système panier du client.
 * Inclut tous les produits sélectionnés, leurs quantités, et le forfait de coupe
 * si des tubes nécessitent une découpe.
 *
 * La coupe se base sur `selection.longueur` brute (sans embouts), conforme au PHP d'origine.
 * Ce payload est passé tel quel au JS panier du client — ce module ne fait pas l'appel réseau.
 *
 * @param {object}   schema
 * @param {object}   selection
 * @param {object[]} expandedStepFields - Champs expandés par step (Configurator._expandedStepFields)
 * @returns {{ items: object[], coupes: object[], forfait: object|null, total: number }}
 */
export function computeCartPayload(schema, selection, expandedStepFields) {
  const { items, hasForfaitArticle } = buildProductItems(schema, selection, expandedStepFields);

  // Total de la configuration en cours (somme des lignes produit résolues). Le forfait coupe n'a
  // pas de prix dans les données de démo (seulement ean/qty), et les articles "dans le forfait de
  // montage" ont déjà prixTotal: 0 (voir buildProductItems) — aucun des deux n'est donc compté ici
  // en double.
  const total = items.reduce((sum, item) => sum + (item.prixTotal ?? 0), 0);

  // Calcul des coupes sur tous les champs tube de toutes les étapes. Code article du forfait fixe
  // (FORFAIT_COUPE_EAN, voir forfait-coupe.js) — ne dépend jamais de la collection. La longueur de
  // rail à couper (retrait en tirage, voir resolveRailLongueur) dépend en revanche de la collection.
  const allExpanded = expandedStepFields.flat();
  const tubes = buildTubeInputs(selection, allExpanded, schema.collection);
  const { coupes, forfait } = calculCoupes(
    tubes,
    resolveRailLongueur(selection, schema.collection),
    FORFAIT_COUPE_EAN,
  );

  // Ajoute le forfait coupe comme ligne article si au moins une coupe est nécessaire.
  if (forfait) {
    items.push({ id: forfait.ean, qty: forfait.qty });
  }

  // Forfait de montage (Module 9 §5) : une seule ligne, dès qu'au moins un article "dans le
  // forfait" est présent en tirage. Pas de prix affiché ici non plus (prixUnitaire: null) — le prix
  // réel du forfait est calculé serveur (voir doc, hors périmètre front).
  if (hasForfaitArticle && schema.collection.forfait) {
    items.push({
      id: schema.collection.forfait.id,
      qty: 1,
      name: schema.collection.forfait.label,
      refBase: schema.collection.forfait.id,
      coloris: null,
      prixUnitaire: null,
      prixTotal: 0,
    });
  }

  return { items, coupes, forfait, total };
}

// field_id synthétique pour la ligne forfait de coupe dans `selections[]` — pas un vrai champ JSON,
// juste une convention pour rester dans le format demandé sans ajouter de clé au contrat.
const FORFAIT_COUPE_FIELD_ID = 'forfait_coupe';

/**
 * Construit le payload transmis au panier du client au clic "Ajouter au panier" — contrat fourni
 * par le client (pas de prix : il recalcule selon le tarif du compte connecté). Une entrée par
 * **champ** sélectionné (pas d'agrégation par article comme `computeCartPayload` : le client veut
 * retrouver le `field_id` d'origine, ex : `support` et `opt_support_interm` restent deux lignes
 * distinctes même si elles partagent le même `refBase`), plus, si des coupes sont nécessaires, une
 * ligne forfait de coupe (`field_id: "forfait_coupe"`, `refBase: FORFAIT_COUPE_EAN` — l'EAN sert de
 * référence article faute de refBase produit ; pas de coloris).
 *
 * @param {object}   schema
 * @param {object}   selection
 * @param {object[]} expandedStepFields - Champs expandés par step (Configurator._expandedStepFields)
 * @returns {{
 *   modele_id: number|null,
 *   quantite: number,
 *   longueur: number,
 *   selections: Array<{ field_id: string, refBase: string, coloris: string|null, quantite: number }>
 * }}
 */
export function computeAddToCartPayload(schema, selection, expandedStepFields) {
  const longueur = Number(selection.longueur);
  const allExpanded = expandedStepFields.flat();
  const collection = schema.collection;

  const selections = allExpanded
    .filter((field) => field.type === 'product' || field.type === 'product_toggle')
    // Visibilité JSON uniquement — pas de dépendance DOM (stale si step non actif).
    .filter((field) => isVisible(field, selection))
    .map((field) => {
      const sel = selection.produits?.[field.id];
      if (!sel?.refBase) return null;
      const option = field.options?.find((o) => o.refBase === sel.refBase);
      if (!option) return null;

      // Calcul à la volée — indépendant de l'état DOM ou de _segmentQty.
      const qty = resolveQty(field, option, longueur, allExpanded, selection, collection);
      if (qty <= 0) return null;

      return {
        field_id: field.id,
        refBase: sel.refBase,
        coloris: sel.coloris ?? null,
        quantite: qty,
      };
    })
    .filter((entry) => entry != null);

  // Forfait de coupe : ajouté comme ligne supplémentaire si au moins une coupe est nécessaire.
  const tubes = buildTubeInputs(selection, allExpanded, collection);
  const { forfait } = calculCoupes(
    tubes,
    resolveRailLongueur(selection, collection),
    FORFAIT_COUPE_EAN,
  );
  if (forfait) {
    selections.push({
      field_id: FORFAIT_COUPE_FIELD_ID,
      refBase: forfait.ean,
      coloris: null,
      quantite: forfait.qty,
    });
  }

  return {
    modele_id: schema.collection.modeleId ?? null,
    // Pas de sélecteur de quantité globale dans l'UI actuelle — une configuration = un article.
    quantite: 1,
    longueur,
    selections,
  };
}
