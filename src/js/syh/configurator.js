import { Base } from '@studiometa/js-toolkit';
import { fetchCollection } from './configuratorApi.js';
import RadioField from './features/radio-field.js';
import LengthField from './features/length-field.js';
import ProductField from './features/product-field.js';
import { isVisible } from './features/show-if.js';

console.log('[SYH] configurator.js chargé');

export default class Configurator extends Base {
  static config = {
    name: 'Syh',
    refs: ['recap', 'stepper', 'stepContent', 'totalPrice', 'colG'],
    components: { RadioField, LengthField, ProductField },
  };

  schema = null;
  selection = { produits: {} };
  currentStepIndex = 0;
  _stepEls = [];
  // Champs expandés par step (splitByConfig résolu à render time).
  _expandedStepFields = [];

  // Point d'entrée : charge le schéma, initialise la sélection, génère le DOM, affiche l'étape 0.
  async mounted() {
    try {
      // Les erreurs de fetch ou de parse JSON sont capturées ici pour ne pas bloquer silencieusement.
      const slug = this.$el.dataset.optionCollection ?? 'auro-concept';
      this.schema = await fetchCollection(slug);
      // La colonne visuelle n'est visible qu'en mode live/live_colored (rendu SVG temps réel).
      const hasLive = ['live', 'live_colored'].includes(this.schema.collection.renderMode);
      this.$refs.colG.hidden = !hasLive;
      this._initDefaultSelection();
      this._renderAllSteps();
      this._renderStepper();
      this._showStep(0);
      this._renderRecap();
    } catch (err) {
      console.error('[SYH] ERROR:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Sélection par défaut
  // -------------------------------------------------------------------------

  /**
   * Pré-sélectionne la première option visible de chaque champ isParam.
   * Traitement dans l'ordre de déclaration JSON : garantit que dependsOn est résolu
   * avant le champ qui en dépend (ex : diametre après type_de_support).
   * Idempotent : saute les champs déjà valorisés — safe à rappeler après invalidation.
   */
  _initDefaultSelection() {
    for (const step of this.schema.steps) {
      for (const field of step.fields) {
        // Seuls les params alimentent selection{}. Les produits sont dans selection.produits{}.
        if (!field.isParam) continue;
        // Idempotence : ne pas écraser une sélection déjà présente (ex : rappel post-invalidation).
        if (this.selection[field.id] !== undefined) continue;

        // Les champs length n'ont pas d'options[] mais des presets[].
        if (field.type === 'length') {
          this.selection[field.id] = field.presets?.[0] ?? null;
          continue;
        }

        let opts = [];
        if (field.dependsOn) {
          // Options groupées par valeur parente, ex : options["simple"] ou options["double"].
          opts = field.options[this.selection[field.dependsOn]] ?? [];
        } else if (Array.isArray(field.options)) {
          opts = field.options;
        }

        const first = opts.find((o) => isVisible(o, this.selection));
        // N'affecte rien si toutes les options sont masquées par showIf.
        if (first) this.selection[field.id] = first.id;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------

  /**
   * Génère une seule fois le DOM de toutes les étapes et les cache (hidden).
   * La navigation se fait par show/hide, pas par re-render — évite de perdre l'état
   * des composants JS Toolkit déjà montés.
   * Les champs avec `splitByConfig` sont expandés ici en autant de variantes que nécessaire.
   */
  _renderAllSteps() {
    const container = this.$refs.stepContent;
    container.innerHTML = '';
    this._stepEls = [];
    this._expandedStepFields = [];

    for (const [i, step] of this.schema.steps.entries()) {
      const stepEl = document.createElement('div');
      stepEl.dataset.step = i;
      stepEl.hidden = true;

      const expanded = this._expandFields(step.fields);
      this._expandedStepFields[i] = expanded;

      for (const field of expanded) {
        const el = this._cloneTemplate(field.type);
        // Type de champ non supporté (template absent du Twig) : on ignore silencieusement.
        if (!el) continue;
        el.dataset.fieldId = field.id;
        el._syhField = field;
        el._syhSelection = this.selection;
        el._syhColoris = this.schema.collection.coloris ?? [];
        // Visibilité initiale au niveau champ (showIf field-level, ex : embout_arriere en simple).
        el.hidden = !isVisible(field, this.selection);
        stepEl.appendChild(el);
      }

      container.appendChild(stepEl);
      this._stepEls.push(stepEl);
    }

    this.$update();
  }

  /**
   * Expand les champs `splitByConfig` en autant de variantes que de valeurs déclarées dans `configs`.
   * Chaque variante hérite des propriétés de base, surcharge avec ses propres overrides,
   * et reçoit un `showIf` automatique sur le paramètre de split.
   * Les champs sans `splitByConfig` sont retournés tels quels.
   */
  _expandFields(fields) {
    return fields.flatMap((field) => {
      if (!field.splitByConfig) return [field];
      const { splitByConfig, configs, ...baseProps } = field;
      return Object.entries(configs).flatMap(([configValue, instances]) =>
        instances.map((instance) => ({
          ...baseProps,
          ...instance,
          // Fusionne le showIf de base avec la condition de config générée automatiquement.
          showIf: { ...(baseProps.showIf ?? {}), [splitByConfig]: [configValue] },
        }))
      );
    });
  }

  // Clone le <template data-template="${type}"> déclaré dans le Twig. Retourne null si absent.
  _cloneTemplate(type) {
    const tpl = this.$el.querySelector(`[data-template="${type}"]`);
    if (!tpl) return null;
    return tpl.content.cloneNode(true).firstElementChild;
  }

  // -------------------------------------------------------------------------
  // Stepper
  // -------------------------------------------------------------------------

  // Génère les boutons de navigation inter-étapes depuis le schéma. Appelé une seule fois au montage.
  _renderStepper() {
    this.$refs.stepper.innerHTML = this.schema.steps
      .map(
        (step, i) =>
          `<button type="button" data-step="${i}">${step.label}</button>`
      )
      .join('');
  }

  // Délégation de clic : remonte jusqu'au bouton [data-step] pour éviter les faux positifs sur les enfants.
  onStepperClick({ event }) {
    const btn = event.target.closest('button[data-step]');
    // Clic sur le conteneur stepper lui-même, pas sur un bouton d'étape.
    if (!btn) return;
    this._showStep(Number(btn.dataset.step));
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

    // Met à jour l'état visuel is-active sur les boutons du stepper.
    this.$refs.stepper.querySelectorAll('button[data-step]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.step) === index);
    });

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
    this.selection.produits[fieldId] = value;
    this._refreshCurrentStep();
    this._renderRecap();
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
    this._invalidateDownstream(fieldId);
    this._initDefaultSelection();
    this._refreshCurrentStep();
    this._renderRecap();
    console.log('[SYH] selection', { ...this.selection });
  }

  /**
   * Supprime les sélections des champs qui dépendent du champ modifié (dependsOn).
   * Limité à l'étape courante — les étapes produit sont invalidées à leur affichage via refresh().
   */
  _invalidateDownstream(changedFieldId) {
    const step = this.schema.steps[this.currentStepIndex];
    for (const field of step.fields) {
      // Ne pas invalider le champ lui-même, uniquement ses dépendants.
      if (field.id === changedFieldId) continue;
      // Invalidation des enfants directs uniquement (pas de cascade récursive).
      if (field.dependsOn === changedFieldId) {
        delete this.selection[field.id];
      }
    }
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
    this._refreshTubeStep(stepEl, expandedFields);

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
   * Calcule le nombre de segments de tube nécessaires pour couvrir la longueur configurée.
   * Utilise l'option sélectionnée pour ce champ tube et sa propriété `tubeLength`.
   */
  _computeTubeQty(tubeFieldId, expandedFields) {
    const longueur = Number(this.selection.longueur);
    if (!longueur) return 0;
    const tubeField = expandedFields.find((f) => f.id === tubeFieldId);
    const sel = this.selection.produits[tubeFieldId];
    const option = tubeField?.options?.find((o) => o.refBase === sel?.refBase);
    // Fallback 180 si l'option n'a pas encore de tubeLength (données incomplètes).
    const tubeLength = option?.tubeLength ?? 180;
    return Math.ceil(longueur / tubeLength);
  }

  /**
   * Pour chaque paire tube/about_tube : calcule la qty de tubes, l'injecte dans le descripteur
   * du champ about_tube (lu par ProductField._computeQty), et ajuste la visibilité.
   * About_tube est caché si un seul tube suffit (qty ≤ 1), même si son showIf l'autorise.
   */
  _refreshTubeStep(stepEl, expandedFields) {
    const pairs = [
      ['tube', 'about_tube'],
      ['tube_avant', 'about_tube_avant'],
      ['tube_arriere', 'about_tube_arriere'],
    ];

    for (const [tubeId, aboutId] of pairs) {
      const tubeEl = stepEl.querySelector(`[data-field-id="${tubeId}"]`);
      // Si le champ tube est absent ou caché, l'about n'est pas pertinent.
      if (!tubeEl || tubeEl.hidden) continue;

      const qty = this._computeTubeQty(tubeId, expandedFields);

      // Injecte la qty dans le descripteur partagé : ProductField.refresh() la lira via _field._segmentQty.
      const aboutField = expandedFields.find((f) => f.id === aboutId);
      if (aboutField) aboutField._segmentQty = Math.max(0, qty - 1);

      const aboutEl = stepEl.querySelector(`[data-field-id="${aboutId}"]`);
      if (!aboutEl) continue;
      // showIf existant (type_de_support) déjà évalué au step 1 : on le respecte en lisant hidden.
      // On surcharge uniquement si qty ≤ 1 (0 jointure nécessaire = champ inutile).
      if (qty <= 1) aboutEl.hidden = true;
    }
  }

  // -------------------------------------------------------------------------
  // Récapitulatif persistant
  // -------------------------------------------------------------------------

  /**
   * Reconstruit le bandeau de récapitulatif de l'étape 1 (paramètres de configuration).
   * Affiché en permanence au-dessus du stepper pour rappeler les choix structurants.
   */
  _renderRecap() {
    const container = this.$refs.recap;
    container.innerHTML = '';

    for (const field of this.schema.steps[0]?.fields ?? []) {
      const value = this._recapValue(field);
      // Champ sans valeur (non encore renseigné) : pas de chip dans le bandeau.
      if (value == null) continue;

      const el = document.createElement('span');
      el.className = 'flex items-baseline gap-1.5';
      el.innerHTML = `<span class="text-gray-400 text-xs uppercase tracking-wide">${field.label}</span><span class="font-medium text-gray-900">${value}</span>`;
      container.appendChild(el);
    }
  }

  /**
   * Retourne la valeur lisible d'un champ pour le récap.
   * - isParam + length  → "${val} cm"
   * - isParam + radio   → label de l'option sélectionnée (résout dependsOn)
   * - product / product_toggle → "label produit · label coloris"
   * Retourne null si rien à afficher (champ non renseigné ou type non géré).
   */
  _recapValue(field) {
    // Paramètres de configuration (type_de_support, diametre, longueur…).
    if (field.isParam) {
      // Les champs length ont une valeur numérique directe, pas un id d'option.
      if (field.type === 'length') {
        const val = this.selection[field.id];
        return val != null ? `${val} cm` : null;
      }
      const val = this.selection[field.id];
      // Paramètre non encore renseigné.
      if (val == null) return null;
      let opts = [];
      if (field.dependsOn) {
        // Options groupées par valeur parente, ex : options["simple"] ou options["double"].
        opts = field.options[this.selection[field.dependsOn]] ?? [];
      } else if (Array.isArray(field.options)) {
        opts = field.options;
      }
      return opts.find((o) => String(o.id) === String(val))?.label ?? String(val);
    }

    // Produits sélectionnés : affiche la référence choisie avec son coloris.
    if (field.type === 'product' || field.type === 'product_toggle') {
      const sel = this.selection.produits?.[field.id];
      // Aucun produit sélectionné pour ce champ.
      if (!sel?.refBase) return null;
      const option = field.options?.find((o) => o.refBase === sel.refBase);
      // refBase introuvable dans les options (données inconsistantes).
      if (!option) return null;
      let label = option.label;
      if (sel.coloris) {
        // Le coloris est optionnel ; si absent, on affiche juste le label produit.
        const colorisInfo = this.schema.collection.coloris?.find(
          (c) => String(c.id) === String(sel.coloris)
        );
        // Le coloris peut ne pas être dans la liste si les données sont incomplètes.
        if (colorisInfo) label += ` · ${colorisInfo.label}`;
      }
      return label;
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Utilitaire
  // -------------------------------------------------------------------------

  // Filtre un tableau d'options selon la sélection courante. Utilisé par les modules aval.
  _filterVisible(options) {
    return options.filter((opt) => isVisible(opt, this.selection));
  }
}
