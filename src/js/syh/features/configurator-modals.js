import { initModalRouter } from './modal-router.js';
import { initLongueurCalculator } from './longueur-calculator.js';
import { initCollectionSwitcher } from './collection-switcher.js';
import { selectedEmboutInfo } from './embouts.js';

/**
 * Câblage des modales du configurateur sur le panel `#extra` (voir modal-router.js) : calcul de
 * longueur et changement de collection. Extrait de `configurator.js` pour l'alléger.
 *
 * La sélection de couleur (renderMode `live_colored`) ne passe plus par une modale — les pastilles
 * vivent directement dans la card du produit sélectionné (voir product-field.js et
 * docs/module-8b-modale-couleurs.md, historique de la décision).
 *
 * @typedef {import('../configurator.js').default} Configurator
 */

/**
 * Câble le panel `#extra`, partagé par les modales du configurateur.
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
}
