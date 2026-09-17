import { Base } from '@studiometa/js-toolkit';
import { fetchCollection } from './configuratorApi.js';
import RadioField from './features/radio-field.js';
import LengthField from './features/length-field.js';
import ProductField from './features/product-field.js';
import { isVisible } from './features/show-if.js';
import { initDefaultSelection, invalidateDownstream } from './features/default-selection.js';
import { renderAllSteps } from './features/steps-renderer.js';
import { renderStepper, updateStepperState } from './features/stepper.js';
import { updateStepNav } from './features/step-nav.js';
import { refreshTubeStep } from './features/tube-step.js';
import { initConfiguratorModals } from './features/configurator-modals.js';
import { purgeEmboutsIfReplaced, refreshEmboutsStep } from './features/embouts.js';
import { computeCartPayload } from './features/cart-payload.js';
import { renderRecap } from './features/recap.js';
import { refreshLivePreview } from './features/live-preview.js';
import { initImageFormatFallback } from './features/image-format-fallback.js';

console.log('[SYH] configurator.js chargé');

/**
 * Composant racine du configurateur (Style Your Hardware). Chef d'orchestre : charge le schéma de
 * collection, tient l'état `selection`, génère le DOM des étapes et relaie les changements des
 * champs enfants vers les recalculs (visibilité, récap, rendu live, panier).
 *
 * La logique lourde est déléguée à des modules `features/` :
 * - `default-selection.js` : valeurs par défaut + invalidation des champs dépendants
 * - `steps-renderer.js`     : génération du DOM de toutes les étapes (+ `splitByConfig`)
 * - `stepper.js`            : rendu et état visuel du stepper
 * - `tube-step.js`          : quantité de tubes / masquage `about_tube`
 * - `configurator-modals.js`: câblage des modales (`#extra`)
 * - `embouts.js`, `recap.js`, `live-preview.js`, `cart-payload.js` : voir chaque module
 *
 * Voir docs/module-3-architecture.md.
 */
export default class Configurator extends Base {
  static config = {
    name: 'Syh',
    refs: [
      'recap',
      'stepper',
      'stepContent',
      'totalPrice',
      'colG',
      'prevStepButton',
      'nextStepButton',
    ],
    components: { RadioField, LengthField, ProductField },
  };

  schema = null;
  selection = { produits: {} };
  currentStepIndex = 0;
  _stepEls = [];
  // Champs expandés par step (splitByConfig résolu à render time).
  _expandedStepFields = [];
  // Dernier total calculé dans la modale "Calcul de longueur" (affiché dans le récap). Null tant
  // que la modale n'a jamais servi.
  _longueurTotalAvecEmbouts = null;
  // Rendu visuel live (colonne gauche `.colG`) : actif seulement en renderMode live/live_colored.
  _hasLive = false;
  _renderedImageEl = null;

  // Point d'entrée : charge le schéma, initialise la sélection, génère le DOM, affiche l'étape 0.
  async mounted() {
    try {
      // Les erreurs de fetch ou de parse JSON sont capturées ici pour ne pas bloquer silencieusement.
      // ?collection= (modale "Changer de collection", voir collection-switcher.js) prime sur le
      // défaut déclaré dans le Twig.
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('collection') ?? this.$el.dataset.optionCollection ?? 'auro-concept';
      this.schema = await fetchCollection(slug);

      // La colonne visuelle n'est visible qu'en mode live/live_colored (rendu SVG temps réel).
      this._hasLive = ['live', 'live_colored'].includes(this.schema.collection.renderMode);
      this.$refs.colG.hidden = !this._hasLive;
      // Pas de data-ref : conteneur des calques déclaré en dur dans le Twig (id="renderedImage").
      this._renderedImageEl = this.$el.querySelector('#renderedImage');

      initDefaultSelection(this.schema, this.selection);
      this._renderAllSteps();
      this._purgeEmboutsIfReplaced();
      renderStepper(this.$refs.stepper, this.schema.steps);
      this._showStep(0);
      this._renderRecap();
      this._refreshLivePreview();
      initConfiguratorModals(this);
      // Accès console en dev : window.__syh.buildCartPayload()
      if (process.env.NODE_ENV !== 'production') {
        window.__syh = this;
        // Contourne les 404 dues aux URLs d'image en dur dans les JSON mock (voir
        // image-format-fallback.js) — sans équivalent à maintenir une fois l'API réelle branchée.
        initImageFormatFallback();
      }
    } catch (err) {
      console.error('[SYH] ERROR:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------

  /**
   * Génère (une seule fois) le DOM de toutes les étapes via `steps-renderer.js`, stocke les
   * éléments d'étape et leurs champs expandés, puis monte les composants JS Toolkit insérés.
   */
  _renderAllSteps() {
    const { stepEls, expandedStepFields } = renderAllSteps({
      rootEl: this.$el,
      container: this.$refs.stepContent,
      schema: this.schema,
      selection: this.selection,
    });
    this._stepEls = stepEls;
    this._expandedStepFields = expandedStepFields;
    this.$update();
  }

  // -------------------------------------------------------------------------
  // Stepper
  // -------------------------------------------------------------------------

  // Délégation de clic : remonte jusqu'au bouton [data-step] pour éviter les faux positifs sur les enfants.
  onStepperClick({ event }) {
    const btn = event.target.closest('button[data-step]');
    // Clic sur le conteneur stepper lui-même, pas sur un bouton d'étape.
    if (!btn) return;
    this._showStep(Number(btn.dataset.step));
  }

  // Bouton "Précédent" de la barre de navigation — masqué sur la 1ère étape, jamais appelé à index 0.
  onPrevStepButtonClick() {
    this._showStep(this.currentStepIndex - 1);
  }

  // Bouton "Suivant" / "Ajouter au panier" — le libellé (et donc l'action) dépend de la position,
  // voir `_updateStepNav`.
  onNextStepButtonClick() {
    const lastIndex = this.schema.steps.length - 1;
    if (this.currentStepIndex === lastIndex) {
      this._addToCart();
    } else {
      this._showStep(this.currentStepIndex + 1);
    }
  }

  // Au changement d'étape, on repositionne la vue en haut de l'étape cible. Le stepper
  // (data-ref="stepper") est sticky en haut : on retranche sa position basse pour que le contenu
  // de l'étape commence juste sous lui, et non masqué derrière.
  _scrollToStepTop(index) {
    const stepEl = this._stepEls[index];
    if (stepEl) {
      const targetTop = window.top;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }

  /**
   * Affiche l'étape cible et cache toutes les autres.
   * Déclenche un refresh des composants de la nouvelle étape pour synchroniser
   * leur état avec la sélection courante (qui a pu changer depuis leur dernier affichage).
   */
  _showStep(index) {
    this.currentStepIndex = index;

    // Masque toutes les étapes sauf l'active.
    this._stepEls.forEach((el, i) => {
      el.hidden = i !== index;
    });

    updateStepperState(this.$refs.stepper, index);
    updateStepNav(
      this.$refs.prevStepButton,
      this.$refs.nextStepButton,
      index,
      this.schema.steps.length - 1,
    );
    this._scrollToStepTop(index);

    this._refreshCurrentStep();
  }

  // -------------------------------------------------------------------------
  // Réception des changements des champs enfants
  // -------------------------------------------------------------------------

  // Handler JS Toolkit : convention on{ChildName}{EventName}. Reçoit { args: [{ fieldId, value }] }.
  onRadioFieldChanged({ args }) {
    const { fieldId, value } = args[0];
    this._applyChange(fieldId, value);
  }

  // Handler JS Toolkit : convention on{ChildName}{EventName}. Reçoit { args: [{ fieldId, value }] }.
  onLengthFieldChanged({ args }) {
    const { fieldId, value } = args[0];
    this._applyChange(fieldId, value);
  }

  // Mise à jour de selection.produits (séparé des params) sans invalider les champs aval.
  onProductFieldChanged({ args }) {
    const { fieldId, value } = args[0];
    const current = this.selection.produits[fieldId];
    // Early exit si l'utilisateur reclique le même produit/coloris : évite un refresh inutile.
    if (current?.refBase === value.refBase && current?.coloris === value.coloris) return;
    // refBase null = toggle "sans" activé : retirer l'entrée de selection.produits.
    if (value.refBase === null) {
      delete this.selection.produits[fieldId];
    } else {
      this.selection.produits[fieldId] = value;
    }
    // Un nouveau support "naissance murale" remplace les embouts : purge la sélection embout existante.
    if (fieldId === 'support') this._purgeEmboutsIfReplaced();
    this._refreshCurrentStep();
    this._renderRecap();
    this._refreshLivePreview();
    console.log('[SYH] selection', { ...this.selection });
  }

  /**
   * Applique un changement de paramètre, invalide les sélections aval incompatibles,
   * puis ré-initialise les défauts pour les champs désormais vides.
   */
  _applyChange(fieldId, value) {
    // Early exit si la valeur n'a pas changé (ex : double-clic sur un radio déjà sélectionné).
    if (this.selection[fieldId] === value) return;
    this.selection[fieldId] = value;
    // Coloris global (étape 1) : repropage vers tous les produits déjà sélectionnés qui
    // proposent cette couleur (tous champs, pas seulement l'étape courante — voir Module 3).
    if (fieldId === 'coloris') {
      for (const child of this.$children.ProductField ?? []) {
        child.applyGlobalColoris(value);
      }
    }
    // Invalidation limitée à l'étape courante — les étapes produit se resynchronisent à l'affichage.
    invalidateDownstream(this.schema.steps[this.currentStepIndex], this.selection, fieldId);
    initDefaultSelection(this.schema, this.selection);
    // Le défaut recalculé du support peut désormais remplacer les embouts (ex : changement de diamètre).
    this._purgeEmboutsIfReplaced();
    this._refreshCurrentStep();
    this._renderRecap();
    this._refreshLivePreview();
    console.log('[SYH] selection', { ...this.selection });
  }

  /**
   * Met à jour la visibilité des champs et rafraîchit les composants de l'étape courante.
   * Appelé après chaque changement de sélection et à chaque navigation.
   * Seuls les composants visibles reçoivent refresh() — les cachés gardent leur état figé.
   */
  _refreshCurrentStep() {
    const stepEl = this._stepEls[this.currentStepIndex];
    // Sécurité : appelé avant _renderAllSteps() si le schéma n'est pas encore chargé.
    if (!stepEl) return;

    // 1. Visibilité au niveau champ (showIf sur le field lui-même).
    // On utilise les champs expandés (splitByConfig déjà résolu) pour avoir tous les IDs réels.
    const expandedFields = this._expandedStepFields[this.currentStepIndex] ?? [];
    for (const field of expandedFields) {
      const fieldEl = stepEl.querySelector(`[data-field-id="${field.id}"]`);
      // Le champ peut être absent du DOM si son template était manquant au render initial.
      if (fieldEl) fieldEl.hidden = !isVisible(field, this.selection);
    }

    // 2. About_tube : visibilité calculée en JS (qty tubes > 1) et qty injectée dans le descripteur.
    refreshTubeStep(stepEl, this.selection, expandedFields);

    // 2bis. Étape Embouts : message + masquage si le support sélectionné remplace les embouts.
    if (this.schema.steps[this.currentStepIndex]?.id === 'embouts') {
      refreshEmboutsStep(stepEl, this.schema, this.selection);
    }

    // 3. Double filtre : composants de l'étape active ET dont le champ est visible.
    const allChildren = [
      ...(this.$children.RadioField ?? []),
      ...(this.$children.LengthField ?? []),
      ...(this.$children.ProductField ?? []),
    ].filter((c) => stepEl.contains(c.$el) && !c.$el.hidden);

    for (const child of allChildren) {
      child.refresh(this.selection);
    }
  }

  /**
   * Retire les lignes embout du panier si le support sélectionné les remplace déjà.
   * Appelé après toute mise à jour susceptible de changer le support (produit ou défaut recalculé).
   */
  _purgeEmboutsIfReplaced() {
    purgeEmboutsIfReplaced(this.schema, this.selection);
  }

  // -------------------------------------------------------------------------
  // Récapitulatif persistant
  // -------------------------------------------------------------------------

  /**
   * Reconstruit le bandeau de récapitulatif de l'étape 1 (paramètres de configuration), plus
   * le dernier total calculé dans la modale "Calcul de longueur".
   * Affiché en permanence au-dessus du stepper pour rappeler les choix structurants.
   *
   * Si la collection déclare une étape `recap` (voir steps-renderer.js), son conteneur dédié reçoit
   * le même rendu — pas de logique différente, juste une seconde cible pour renderRecap().
   */
  _renderRecap() {
    renderRecap(this.$refs.recap, this.schema, this.selection, this._longueurTotalAvecEmbouts);

    const recapStepIndex = this.schema.steps.findIndex((s) => s.id === 'recap');
    const recapStepContent = this._stepEls[recapStepIndex]?.querySelector('[data-ref="recapStepContent"]');
    if (recapStepContent) {
      renderRecap(recapStepContent, this.schema, this.selection, this._longueurTotalAvecEmbouts);
    }
  }

  // -------------------------------------------------------------------------
  // Rendu visuel live (colonne gauche `.colG`, modes live / live_colored)
  // -------------------------------------------------------------------------

  /**
   * Recompose les calques du rendu visuel live depuis la sélection courante. Reflète
   * l'intégralité de `selection.produits`, cumulée à travers toutes les étapes — pas seulement
   * les champs de l'étape affichée (voir docs/module-6-rendu-live.md).
   * No-op en `renderMode: "none"`.
   */
  _refreshLivePreview() {
    if (!this._hasLive) return;
    const allFields = this._expandedStepFields.flat();
    refreshLivePreview(this._renderedImageEl, allFields, this.selection, this.schema.collection.coloris ?? []);
  }

  // -------------------------------------------------------------------------
  // Utilitaire
  // -------------------------------------------------------------------------

  // Filtre un tableau d'options selon la sélection courante. Utilisé par les modules aval.
  _filterVisible(options) {
    return options.filter((opt) => isVisible(opt, this.selection));
  }

  // -------------------------------------------------------------------------
  // Payload panier
  // -------------------------------------------------------------------------

  /**
   * Construit le payload complet à envoyer au système panier du client.
   * Inclut tous les produits sélectionnés, leurs quantités, et le forfait de coupe
   * si des tubes nécessitent une découpe.
   *
   * La coupe se base sur `selection.longueur` brute (sans embouts), conforme au PHP d'origine.
   * Ce payload est passé tel quel au JS panier du client — ce module ne fait pas l'appel réseau.
   *
   * @returns {{ items: object[], coupes: object[], forfait: object|null }}
   */
  buildCartPayload() {
    return computeCartPayload(this.schema, this.selection, this._expandedStepFields);
  }

  /**
   * Déclenché par le bouton "Ajouter au panier" (dernière étape du stepper — voir
   * `onNextStepButtonClick`), et à terme aussi par un bouton équivalent dans l'étape récap
   * elle-même (même méthode, pas de logique dupliquée).
   *
   * Émet l'événement custom recommandé par docs/module-7-recap-panier.md section 5 — ce module ne
   * fait pas l'appel réseau, c'est au JS panier du client de s'y abonner et de déclencher son Ajax.
   */
  _addToCart() {
    this.$el.dispatchEvent(
      new CustomEvent('syh:add-to-cart', { bubbles: true, detail: this.buildCartPayload() }),
    );
  }
}
