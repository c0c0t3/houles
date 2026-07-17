import { isVisible } from './show-if.js';
import { buildTubeInputs, calculCoupes, computeTubeQty } from './tube-coupe.js';

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
 * @returns {number}
 */
function resolveQty(field, option, longueur, allExpanded, selection) {
  const { quantity } = field;
  if (!quantity) return 1;

  switch (quantity.mode) {
    case 'fixed':
      return Math.ceil(quantity.value / (option.qtyParUnite ?? 1));

    case 'segmented':
      if (!option.tubeLength || !longueur) return 0;
      return Math.ceil(longueur / option.tubeLength);

    case 'segmented_minus_1': {
      // Calcul dynamique : identifie le champ tube lié par convention de nommage (about_X → X).
      const tubeFieldId = field.id.replace(/^about_/, '');
      const tubeQty = computeTubeQty(selection, tubeFieldId, allExpanded);
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
 * @returns {Array<{id: string, qty: number, name: string, refBase: string, coloris: string|null}>}
 */
function buildProductItems(schema, selection, expandedStepFields) {
  const longueur = Number(selection.longueur);
  const allExpanded = expandedStepFields.flat();
  const itemMap = new Map(); // id article → item, pour agréger les doublons (ex: support + support_interm)

  for (const field of allExpanded) {
    if (field.type !== 'product' && field.type !== 'product_toggle') continue;

    // Visibilité JSON uniquement — pas de dépendance DOM (stale si step non actif).
    // Les about_tube à qty=0 sont naturellement exclus par la vérification qty <= 0 ci-dessous.
    if (!isVisible(field, selection)) continue;

    const sel = selection.produits?.[field.id];
    if (!sel?.refBase) continue;

    const option = field.options?.find((o) => o.refBase === sel.refBase);
    if (!option) continue;

    const variant = option.variants?.[sel.coloris];
    const id = variant?.id ?? option.id ?? sel.refBase;

    // Calcul à la volée — indépendant de l'état DOM ou de _segmentQty.
    const qty = resolveQty(field, option, longueur, allExpanded, selection);
    if (qty <= 0) continue;

    // Agrège les lignes avec le même id article (ex : support + opt_support_interm = même ref).
    const existing = itemMap.get(id);
    if (existing) {
      existing.qty += qty;
    } else {
      itemMap.set(id, { id, qty, name: option.label, refBase: sel.refBase, coloris: sel.coloris ?? null });
    }
  }

  return [...itemMap.values()];
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
 * @returns {{ items: object[], coupes: object[], forfait: object|null }}
 */
export function computeCartPayload(schema, selection, expandedStepFields) {
  const items = buildProductItems(schema, selection, expandedStepFields);

  // Calcul des coupes sur tous les champs tube de toutes les étapes.
  const allExpanded = expandedStepFields.flat();
  const tubes = buildTubeInputs(selection, allExpanded);
  const forfaitEan = schema.collection.serviceCoupeEan ?? null;
  const { coupes, forfait } = forfaitEan
    ? calculCoupes(tubes, Number(selection.longueur), forfaitEan)
    : { coupes: [], forfait: null };

  // Ajoute le forfait coupe comme ligne article si au moins une coupe est nécessaire.
  if (forfait) {
    items.push({ id: forfait.ean, qty: forfait.qty });
  }

  return { items, coupes, forfait };
}
