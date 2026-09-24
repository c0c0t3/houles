import { formatFr } from './longueur-calculator.js';
import { isVisible, resolveLabel } from './show-if.js';
import { resolveQty } from './cart-payload.js';

/**
 * Récapitulatif persistant de l'étape 1 (paramètres de configuration), affiché en permanence
 * au-dessus du stepper pour rappeler les choix structurants.
 */

// Même formatage que la carte produit (product-field.js) — prix placeholders de démo.
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const formatPrice = (value) => priceFormatter.format(value);

/**
 * Retourne la valeur lisible d'un champ pour le récap.
 * - isParam + length  → "${val} cm"
 * - isParam + radio   → label de l'option sélectionnée (résout dependsOn)
 * - product / product_toggle → "label produit · label coloris"
 * Retourne null si rien à afficher (champ non renseigné ou type non géré).
 *
 * @param {object} field
 * @param {object} schema
 * @param {object} selection
 * @returns {string|null}
 */
function recapValue(field, schema, selection) {
  // Paramètres de configuration (type_de_support, diametre, longueur…).
  if (field.isParam) {
    // Les champs length ont une valeur numérique directe, pas un id d'option.
    if (field.type === 'length') {
      const val = selection[field.id];
      return val != null ? `${val} cm` : null;
    }
    const val = selection[field.id];
    // Paramètre non encore renseigné.
    if (val == null) return null;
    let opts = [];
    if (field.dependsOn) {
      // Options groupées par valeur parente, ex : options["simple"] ou options["double"].
      opts = field.options[selection[field.dependsOn]] ?? [];
    } else if (Array.isArray(field.options)) {
      opts = field.options;
    }
    return opts.find((o) => String(o.id) === String(val))?.label ?? String(val);
  }

  // Produits sélectionnés : affiche la référence choisie avec son coloris.
  if (field.type === 'product' || field.type === 'product_toggle') {
    const sel = selection.produits?.[field.id];
    // Aucun produit sélectionné pour ce champ.
    if (!sel?.refBase) return null;
    const option = field.options?.find((o) => o.refBase === sel.refBase);
    // refBase introuvable dans les options (données inconsistantes).
    if (!option) return null;
    let label = option.label;
    if (sel.coloris) {
      // Le coloris est optionnel ; si absent, on affiche juste le label produit.
      const colorisInfo = schema.collection.coloris?.find((c) => String(c.id) === String(sel.coloris));
      // Le coloris peut ne pas être dans la liste si les données sont incomplètes.
      if (colorisInfo) label += ` · ${colorisInfo.label}`;
    }
    return label;
  }

  return null;
}

/**
 * Reconstruit le bandeau de récapitulatif de l'étape 1, plus le dernier total avec embouts
 * calculé dans la modale "Calcul de longueur" (s'il a déjà servi), plus le total prix de la
 * configuration en cours (somme des lignes produit résolues, toujours affiché).
 *
 * @param {HTMLElement} container - Élément recap (Configurator.$refs.recap)
 * @param {object} schema
 * @param {object} selection
 * @param {number|null} longueurTotalAvecEmbouts
 * @param {number} total - Total de la configuration en cours (somme des lignes produit résolues,
 *   voir `computeCartPayload` dans cart-payload.js). Prix placeholders de démo.
 */
export function renderRecap(container, schema, selection, longueurTotalAvecEmbouts, total) {
  // Le bouton "Changer de collection" (data-modal="collections") est le premier enfant statique
  // du recap dans le twig — on le préserve à travers les reconstructions du bandeau plutôt que de
  // le recréer, pour ne pas perdre le nœud sur lequel modal-router.js s'appuie.
  const collectionsButton = container.querySelector('[data-modal="collections"]');
  container.innerHTML = '';
  if (collectionsButton) container.appendChild(collectionsButton);

  for (const field of schema.steps[0]?.fields ?? []) {
    const value = recapValue(field, schema, selection);
    // Champ sans valeur (non encore renseigné) : pas de chip dans le bandeau.
    if (value == null) continue;

    const el = document.createElement('span');
    el.className = 'flex items-baseline gap-1.5';
    el.innerHTML = `<span class="text-gray-400 text-xs uppercase tracking-wide">${field.label}</span><span class="font-medium text-gray-900">${value}</span>`;
    container.appendChild(el);
  }

  // Dernier total calculé dans la modale "Calcul de longueur" (absent tant qu'elle n'a jamais servi).
  if (longueurTotalAvecEmbouts != null) {
    const el = document.createElement('span');
    el.className = 'flex items-baseline gap-1.5';
    el.innerHTML = `<span class="text-gray-400 text-xs uppercase tracking-wide">Longueur avec embouts</span><span class="font-medium text-gray-900">${formatFr(longueurTotalAvecEmbouts)} cm</span>`;
    container.appendChild(el);
  }

  // Total de la configuration en cours (produits sélectionnés), à jour à chaque changement.
  if (total != null) {
    const el = document.createElement('span');
    el.className = 'flex items-baseline gap-1.5 ml-auto';
    el.innerHTML = `<span class="text-gray-400 text-xs uppercase tracking-wide">Total</span><span class="font-semibold text-purple">${formatPrice(total)}</span>`;
    container.appendChild(el);
  }
}

// Icône "œil" (voir le produit) — inline, pas de dépendance à un sprite d'icônes du reste du
// projet (hors périmètre SYH, voir CLAUDE.md).
const EYE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="w-4 h-4"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';

/**
 * Construit une ligne du résumé produits : label du champ, nom résolu (produit + coloris),
 * quantité commandable (calcul à la volée, voir `resolveQty` dans cart-payload.js) et prix
 * unitaire. `null` si le champ n'a pas de sélection valide ou une quantité nulle.
 *
 * @param {object} field       - Champ expandé (product / product_toggle)
 * @param {object} schema
 * @param {object} selection
 * @param {number} longueur    - `selection.longueur`, pré-résolu (évite un `Number()` par champ)
 * @param {object[]} allExpanded - Tous les champs expandés, toutes étapes (pour `resolveQty`)
 * @returns {{label: string, name: string, qty: number, prixUnitaire: number, productUrl: string|null}|null}
 */
function buildSummaryRow(field, schema, selection, longueur, allExpanded) {
  const sel = selection.produits?.[field.id];
  if (!sel?.refBase) return null;
  const option = field.options?.find((o) => o.refBase === sel.refBase);
  if (!option) return null;

  const qty = resolveQty(field, option, longueur, allExpanded, selection);
  if (qty <= 0) return null;

  const value = recapValue(field, schema, selection);
  if (value == null) return null;

  const variant = option.variants?.[sel.coloris];
  // Convention Houlès : l'URL de fiche produit se termine toujours par "-{coloris}".
  const productUrl = option.productUrl
    ? sel.coloris
      ? `${option.productUrl}-${sel.coloris}`
      : option.productUrl
    : null;
  return {
    label: resolveLabel(field, selection),
    name: value,
    qty,
    prixUnitaire: variant?.prix ?? option.prix ?? 0,
    productUrl,
  };
}

/**
 * Résume tous les produits sélectionnés, toutes étapes confondues, sous forme de tableau : bouton
 * "voir le produit" (photo, si disponible), nom (groupé par label de champ — Support, Tube,
 * Anneaux, Jambe de force réglable...), quantité commandable, prix unitaire.
 * Propre à l'étape Récapitulatif (conteneur `recapProductSummary`, voir steps-renderer.js) : plus
 * complet que le bandeau persistant, qui ne couvre que les champs de l'étape 1.
 *
 * @param {HTMLElement} container - Conteneur dédié (`[data-ref="recapProductSummary"]`)
 * @param {object} schema
 * @param {object} selection
 * @param {object[]} expandedStepFields - Champs expandés par step (Configurator._expandedStepFields)
 */
export function renderProductSummary(container, schema, selection, expandedStepFields) {
  container.innerHTML = '';

  const longueur = Number(selection.longueur);
  const allExpanded = expandedStepFields.flat();

  const rows = allExpanded
    .filter((field) => field.type === 'product' || field.type === 'product_toggle')
    // Respecte le showIf du champ (ex : variantes avant/arrière non actives en config simple).
    .filter((field) => isVisible(field, selection))
    .map((field) => buildSummaryRow(field, schema, selection, longueur, allExpanded))
    .filter((row) => row != null);

  // Rien de sélectionné encore (tout début de configuration) : pas de tableau vide.
  if (!rows.length) return;

  const table = document.createElement('table');
  table.className = 'w-full text-sm table-auto border-collapse';
  table.innerHTML = `
    <thead>
      <tr class="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-purple/20">
        <th class="w-10 py-2"><span class="sr-only">Voir le produit</span></th>
        <th class="py-2">Produit</th>
        <th class="py-2 text-right">Qté</th>
        <th class="py-2 text-right">Prix</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `
        <tr class="border-b border-purple/10 last:border-0">
          <td class="py-2 pr-2">
            ${
              row.productUrl
                ? `<a href="${row.productUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center w-7 h-7 rounded-full text-purple hover:bg-sand-darker" aria-label="Voir le produit" title="Voir le produit">${EYE_ICON_SVG}</a>`
                : ''
            }
          </td>
          <td class="py-2">
            <div class="text-gray-400 text-xs uppercase tracking-wide">${row.label}</div>
            <div class="font-medium text-gray-900">${row.name}</div>
          </td>
          <td class="py-2 text-right text-gray-900">${row.qty}</td>
          <td class="py-2 text-right font-medium text-gray-900">${formatPrice(row.prixUnitaire)}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  `;
  container.appendChild(table);
}
