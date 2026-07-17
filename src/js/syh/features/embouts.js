/**
 * Logique du cas `replacesEmbouts` : certains supports (naissances murales, corners) intègrent
 * déjà les embouts. Quand l'un d'eux est sélectionné, l'étape Embouts reste visible dans le
 * stepper mais affiche un message et masque ses champs produit ; toute ligne embout déjà
 * sélectionnée est purgée du panier.
 * Voir docs/module-5-etapes-intermediaires.md, section 3.
 */

/**
 * Vrai si le support actuellement sélectionné remplace les embouts (naissances murales, corners).
 * Lu depuis le flag `replacesEmbouts` porté par l'option support choisie dans le JSON.
 *
 * @param {object} schema
 * @param {object} selection
 * @returns {boolean}
 */
export function supportReplacesEmbouts(schema, selection) {
  const sel = selection.produits?.support;
  if (!sel?.refBase) return false;
  const supportField = schema.steps
    .flatMap((step) => step.fields)
    .find((field) => field.id === 'support');
  const option = supportField?.options?.find((o) => o.refBase === sel.refBase);
  return option?.replacesEmbouts === true;
}

/**
 * Retire les lignes embout de `selection.produits` si le support sélectionné les remplace déjà.
 * Appelé après toute mise à jour susceptible de changer le support (produit ou défaut recalculé).
 *
 * @param {object} schema
 * @param {object} selection - Mutée en place (selection.produits.embout / embout_arriere retirés).
 */
export function purgeEmboutsIfReplaced(schema, selection) {
  if (!supportReplacesEmbouts(schema, selection)) return;
  delete selection.produits.embout;
  delete selection.produits.embout_arriere;
}

/**
 * Sur l'étape Embouts : affiche le message d'information et masque les champs produit
 * quand le support sélectionné remplace déjà les embouts (naissances murales, corners).
 *
 * @param {HTMLElement} stepEl - Conteneur DOM de l'étape Embouts.
 * @param {object} schema
 * @param {object} selection
 */
export function refreshEmboutsStep(stepEl, schema, selection) {
  const replaced = supportReplacesEmbouts(schema, selection);

  const msg = stepEl.querySelector('[data-embouts-replaced-message]');
  if (msg) msg.hidden = !replaced;

  if (!replaced) return;
  for (const fieldId of ['embout', 'embout_arriere']) {
    const fieldEl = stepEl.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldEl) fieldEl.hidden = true;
  }
}

/**
 * Caractéristiques `longueurEmbout` / `recouvrementEmbout` de l'option embout actuellement
 * sélectionnée (0/0 si aucune sélection). Utilisées par le calculateur de longueur pour la
 * longueur totale estimée incluant les embouts.
 *
 * @param {object} schema
 * @param {object} selection
 * @returns {{ longueurEmbout: number, recouvrementEmbout: number }}
 */
export function selectedEmboutInfo(schema, selection) {
  const sel = selection.produits?.embout;
  if (!sel?.refBase) return { longueurEmbout: 0, recouvrementEmbout: 0 };
  const field = schema.steps.flatMap((s) => s.fields).find((f) => f.id === 'embout');
  const option = field?.options?.find((o) => o.refBase === sel.refBase);
  return {
    longueurEmbout: option?.longueurEmbout ?? 0,
    recouvrementEmbout: option?.recouvrementEmbout ?? 0,
  };
}

/**
 * Construit l'élément de message affiché en tête de l'étape Embouts (masqué par défaut).
 * Sa visibilité est ensuite pilotée par `refreshEmboutsStep`.
 *
 * @returns {HTMLParagraphElement}
 */
export function createEmboutsMessageElement() {
  const msg = document.createElement('p');
  msg.dataset.emboutsReplacedMessage = '';
  msg.className = 'mb-4 text-sm text-gray-600 italic';
  msg.textContent = 'Les supports sélectionnés remplacent les embouts.';
  msg.hidden = true;
  return msg;
}
