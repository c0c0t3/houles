import { formatFr } from './longueur-calculator.js';

/**
 * Récapitulatif persistant de l'étape 1 (paramètres de configuration), affiché en permanence
 * au-dessus du stepper pour rappeler les choix structurants.
 */

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
 * calculé dans la modale "Calcul de longueur" (s'il a déjà servi).
 *
 * @param {HTMLElement} container - Élément recap (Configurator.$refs.recap)
 * @param {object} schema
 * @param {object} selection
 * @param {number|null} longueurTotalAvecEmbouts
 */
export function renderRecap(container, schema, selection, longueurTotalAvecEmbouts) {
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
}
