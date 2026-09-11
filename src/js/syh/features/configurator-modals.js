import { initModalRouter } from './modal-router.js';
import { initLongueurCalculator } from './longueur-calculator.js';
import { initCollectionSwitcher } from './collection-switcher.js';
import { initColorModal } from './color-modal.js';
import { selectedEmboutInfo } from './embouts.js';

/**
 * Câblage des modales du configurateur (voir modal-router.js) :
 * - panel `#extra`       : calcul de longueur, changement de collection ;
 * - panel `#syh-couleur` : sélection de couleur (renderMode `live_colored`) — tiroir venant de la
 *   droite (voir l'embed dans modal-configurateur.twig).
 * Extrait de `configurator.js`. Ces fonctions ont besoin de l'instance Configurator (`host`) pour
 * lire l'état (`schema`, `selection`, `_recentColoris`) et déclencher ses recalculs
 * (`_applyChange`, `_renderRecap`, `_refreshLivePreview`).
 *
 * @typedef {import('../configurator.js').default} Configurator
 */

/** Sélecteur du panel dédié à la modale de sélection de couleur. */
const COULEUR_PANEL = '#syh-couleur';

/**
 * Câble les deux panels de modales du configurateur.
 * La longueur de tube suggérée (pas D) est appliquée au champ `longueur` via le circuit normal
 * d'invalidation (`_applyChange`), comme si elle avait été saisie dans le champ `length` de l'étape 1.
 *
 * @param {Configurator} host - L'instance Configurator.
 */
export function initConfiguratorModals(host) {
  initModalRouter('#extra', {
    'calcul-longueur': (contentEl) =>
      initLongueurCalculator(contentEl, {
        getEmbout: () => selectedEmboutInfo(host.schema, host.selection),
        onValider: (longueurTube) => {
          host._applyChange('longueur', longueurTube);
          document.querySelector('#extra')?.close();
        },
        onCompute: (total) => {
          host._longueurTotalAvecEmbouts = total;
          host._renderRecap();
        },
      }),
    collections: (contentEl) => initCollectionSwitcher(contentEl),
  });

  initModalRouter(COULEUR_PANEL, {
    couleur: (contentEl, trigger) => initColorModalForPiece(host, contentEl, trigger),
  });
}

/**
 * Câble la modale de sélection de couleur (renderMode `live_colored`) pour la pièce d'où provient
 * le trigger « Voir plus de couleurs » (`data-piece` = id du champ produit, voir product-field.js).
 *
 * Aperçu temps réel : chaque clic couleur écrit directement dans `selection.produits[fieldId]` et
 * ne rafraîchit que le rendu live (`_refreshLivePreview`), sans toucher au récap ni au panier —
 * la modale reste ouverte. La validation passe, elle, par le circuit normal du composant
 * (`ProductField.setColorisFromModal` → `changed` → `onProductFieldChanged`).
 *
 * @param {Configurator} host - L'instance Configurator.
 * @param {HTMLElement} contentEl - Contenu de la modale (cloné depuis son template).
 * @param {HTMLElement|null} trigger - Bouton déclencheur, porteur de `data-piece`.
 */
function initColorModalForPiece(host, contentEl, trigger) {
  const fieldId = trigger?.dataset.piece ?? null;
  const child = (host.$children.ProductField ?? []).find((c) => c.fieldId === fieldId);
  if (!child) return;

  const palette = host.schema.collection.coloris ?? [];
  // Couleur d'origine mémorisée à l'ouverture — restaurée si l'utilisateur annule.
  const originalColorisId = child.currentColorisId;

  // Écrit un coloris sur une pièce sans repasser par le composant : sert à l'aperçu (non validé)
  // et à annuler celui-ci.
  const previewColoris = (id) => {
    const sel = host.selection.produits[fieldId];
    if (sel) sel.coloris = id;
    host._refreshLivePreview();
  };

  initColorModal(contentEl, {
    panel: document.querySelector(COULEUR_PANEL),
    palette,
    currentColorisId: originalColorisId,
    recentIds: host._recentColoris,
    onPreview: (id) => previewColoris(id),
    onCancel: () => previewColoris(originalColorisId),
    onApplyCurrent: (id) => {
      // Annule d'abord la mutation d'aperçu pour que le circuit normal ne court-circuite pas son
      // early-exit (coloris déjà égal) — puis valide proprement.
      previewColoris(originalColorisId);
      child.setColorisFromModal(id);
    },
    onApplyAll: (id) => {
      previewColoris(originalColorisId);
      // Écrase toutes les pièces colorisables réellement teintées (option sélectionnée avec
      // `svgUrl`), pièce d'origine comprise. Voir module-8b (point de décision : « écrase tout »).
      for (const c of host.$children.ProductField ?? []) {
        if (c.$el.hidden) continue;
        if (c === child || c.selectedOption?.svgUrl) c.setColorisFromModal(id);
      }
    },
  });
}
