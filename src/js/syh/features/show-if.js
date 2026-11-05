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
 * Supporte :
 *   showIf    — toutes les conditions doivent être vraies (AND)
 *   showIfAny — au moins une condition doit être vraie (OR de blocs showIf)
 * Dans showIf, par clé :
 *   array          → la valeur doit être dans la liste
 *   { not }        → la valeur ne doit pas être dans la liste
 *   { gt/gte/lt/lte } → seuils numériques, combinables sur la même clé
 *   selected:field → compare au refBase du produit sélectionné pour ce champ
 */
export function isVisible(option, selection) {
  // showIfAny : suffit qu'un seul bloc showIf soit vrai (OR)
  if (option.showIfAny) {
    return option.showIfAny.some((cond) => isVisible({ showIf: cond }, selection));
  }

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

    // Conditions numériques combinées (gt + lte sur la même clé sont évaluées ensemble)
    if (typeof cond === 'object') {
      const num = Number(value);
      if (cond.gt  !== undefined && !(num >  cond.gt))  return false;
      if (cond.gte !== undefined && !(num >= cond.gte)) return false;
      if (cond.lt  !== undefined && !(num <  cond.lt))  return false;
      if (cond.lte !== undefined && !(num <= cond.lte)) return false;
      return true;
    }

    return true;
  });
}

/**
 * Résout la liste d'options d'un champ `radio` selon la sélection courante — gère `dependsOn`
 * (options groupées par valeur parente, ex : `diametre.options["simple"]` / `["double"]`). Même
 * logique que `default-selection.js` / `recap.js`, centralisée ici pour `isFieldHidden`.
 */
function resolveFieldOptions(field, selection) {
  if (field.dependsOn) {
    return field.options?.[selection[field.dependsOn]] ?? [];
  }
  return Array.isArray(field.options) ? field.options : [];
}

/**
 * Vrai si ce champ doit être masqué à l'affichage. Combine le `showIf` classique du champ avec la
 * règle « radio à une seule option visible » (Module 9, §3.2) : un `radio` dont une seule option
 * passe son `showIf` est choisi d'office (voir `initDefaultSelection`, qui prend déjà la première
 * option visible) mais n'a pas besoin d'être montré à l'utilisateur — rien à choisir. Exception :
 * `coloris`, un nuancier à une seule couleur reste affiché.
 *
 * @param {object} field
 * @param {object} selection
 * @returns {boolean}
 */
export function isFieldHidden(field, selection) {
  if (!isVisible(field, selection)) return true;
  if (field.type === 'radio' && field.id !== 'coloris') {
    const visibleCount = resolveFieldOptions(field, selection).filter((o) =>
      isVisible(o, selection),
    ).length;
    if (visibleCount === 1) return true;
  }
  return false;
}
