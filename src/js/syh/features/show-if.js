/**
 * Résout le label d'un champ selon la sélection courante.
 * Si `labelByConfig` est présent, retourne le label dont la clé correspond
 * à une valeur de paramètre dans la sélection ; sinon retombe sur `label`.
 */
export function resolveLabel(field, selection) {
  if (!field.labelByConfig) return field.label;
  for (const [configKey, valueMap] of Object.entries(field.labelByConfig)) {
    const selVal = selection[configKey];
    if (selVal != null && valueMap[selVal] != null) return valueMap[selVal];
  }
  return field.label;
}

/**
 * Évalue si une option est visible selon la sélection courante.
 * Supporte : égalité (array), seuils (gt/gte/lt/lte), négation (not), référence produit (selected:).
 */
export function isVisible(option, selection) {
  if (!option.showIf) return true;

  return Object.entries(option.showIf).every(([key, cond]) => {
    let value;

    if (key.startsWith('selected:')) {
      const fieldId = key.slice(9);
      value = selection.produits?.[fieldId]?.refBase;
    } else {
      value = selection[key];
    }

    if (value === undefined || value === null) return false;

    if (Array.isArray(cond)) return cond.map(String).includes(String(value));
    if (cond.not) return !cond.not.map(String).includes(String(value));
    if (cond.gt  !== undefined) return Number(value) >  cond.gt;
    if (cond.gte !== undefined) return Number(value) >= cond.gte;
    if (cond.lt  !== undefined) return Number(value) <  cond.lt;
    if (cond.lte !== undefined) return Number(value) <= cond.lte;

    return true;
  });
}
