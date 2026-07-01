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
    refs: ['recap', 'stepper', 'stepContent', 'totalPrice'],
    components: { RadioField, LengthField, ProductField },
  };

  schema = null;
  selection = { produits: {} };
  currentStepIndex = 0;
  _stepEls = [];

  async mounted() {
    try {
      const slug = this.$el.dataset.optionCollection ?? 'auro-concept';
      this.schema = await fetchCollection(slug);
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
  // Sélection par défaut : première option visible de chaque champ isParam
  // Traité dans l'ordre de déclaration pour que dependsOn soit résolu avant
  // -------------------------------------------------------------------------

  _initDefaultSelection() {
    for (const step of this.schema.steps) {
      for (const field of step.fields) {
        if (!field.isParam) continue;
        if (this.selection[field.id] !== undefined) continue;

        if (field.type === 'length') {
          this.selection[field.id] = field.presets?.[0] ?? null;
          continue;
        }

        let opts = [];
        if (field.dependsOn) {
          opts = field.options[this.selection[field.dependsOn]] ?? [];
        } else if (Array.isArray(field.options)) {
          opts = field.options;
        }

        const first = opts.find((o) => isVisible(o, this.selection));
        if (first) this.selection[field.id] = first.id;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Rendu unique de tous les steps — show/hide à la navigation, pas de recréation
  // -------------------------------------------------------------------------

  _renderAllSteps() {
    const container = this.$refs.stepContent;
    container.innerHTML = '';
    this._stepEls = [];

    for (const [i, step] of this.schema.steps.entries()) {
      const stepEl = document.createElement('div');
      stepEl.dataset.step = i;
      stepEl.hidden = true;

      for (const field of step.fields) {
        const el = this._cloneTemplate(field.type);
        if (!el) continue;
        el.dataset.fieldId = field.id;
        el._syhField = field;
        el._syhSelection = this.selection;
        el._syhColoris = this.schema.collection.coloris ?? [];
        stepEl.appendChild(el);
      }

      container.appendChild(stepEl);
      this._stepEls.push(stepEl);
    }

    this.$update();
  }

  _cloneTemplate(type) {
    const tpl = this.$el.querySelector(`[data-template="${type}"]`);
    if (!tpl) return null;
    return tpl.content.cloneNode(true).firstElementChild;
  }

  // -------------------------------------------------------------------------
  // Stepper
  // -------------------------------------------------------------------------

  _renderStepper() {
    this.$refs.stepper.innerHTML = this.schema.steps
      .map(
        (step, i) =>
          `<button type="button" data-step="${i}">${step.label}</button>`
      )
      .join('');
  }

  onStepperClick({ event }) {
    const btn = event.target.closest('button[data-step]');
    if (!btn) return;
    this._showStep(Number(btn.dataset.step));
  }

  _showStep(index) {
    this.currentStepIndex = index;

    this._stepEls.forEach((el, i) => {
      el.hidden = i !== index;
    });

    this.$refs.stepper.querySelectorAll('button[data-step]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.step) === index);
    });

    this._refreshCurrentStep();
  }

  // -------------------------------------------------------------------------
  // Réception des changements des champs enfants
  // -------------------------------------------------------------------------

  onRadioFieldChanged({ args }) {
    const { fieldId, value } = args[0];
    this._applyChange(fieldId, value);
  }

  onLengthFieldChanged({ args }) {
    const { fieldId, value } = args[0];
    this._applyChange(fieldId, value);
  }

  onProductFieldChanged({ args }) {
    const { fieldId, value } = args[0];
    const current = this.selection.produits[fieldId];
    if (current?.refBase === value.refBase && current?.coloris === value.coloris) return;
    this.selection.produits[fieldId] = value;
    this._refreshCurrentStep();
    this._renderRecap();
    console.log('[SYH] selection', { ...this.selection });
  }

  _applyChange(fieldId, value) {
    if (this.selection[fieldId] === value) return;
    this.selection[fieldId] = value;
    this._invalidateDownstream(fieldId);
    this._initDefaultSelection();
    this._refreshCurrentStep();
    this._renderRecap();
    console.log('[SYH] selection', { ...this.selection });
  }

  _invalidateDownstream(changedFieldId) {
    const step = this.schema.steps[this.currentStepIndex];
    for (const field of step.fields) {
      if (field.id === changedFieldId) continue;
      if (field.dependsOn === changedFieldId) {
        delete this.selection[field.id];
      }
    }
  }

  _refreshCurrentStep() {
    const stepEl = this._stepEls[this.currentStepIndex];
    const allFields = [
      ...(this.$children.RadioField ?? []),
      ...(this.$children.LengthField ?? []),
      ...(this.$children.ProductField ?? []),
    ].filter((c) => stepEl?.contains(c.$el));

    for (const child of allFields) {
      child.refresh(this.selection);
    }
  }

  // -------------------------------------------------------------------------
  // Récapitulatif persistant
  // -------------------------------------------------------------------------

  _renderRecap() {
    const container = this.$refs.recap;
    container.innerHTML = '';

    for (const field of this.schema.steps[0]?.fields ?? []) {
      const value = this._recapValue(field);
      if (value == null) continue;

      const el = document.createElement('span');
      el.className = 'flex items-baseline gap-1.5';
      el.innerHTML = `<span class="text-gray-400 text-xs uppercase tracking-wide">${field.label}</span><span class="font-medium text-gray-900">${value}</span>`;
      container.appendChild(el);
    }
  }

  _recapValue(field) {
    if (field.isParam) {
      if (field.type === 'length') {
        const val = this.selection[field.id];
        return val != null ? `${val} cm` : null;
      }
      const val = this.selection[field.id];
      if (val == null) return null;
      let opts = [];
      if (field.dependsOn) {
        opts = field.options[this.selection[field.dependsOn]] ?? [];
      } else if (Array.isArray(field.options)) {
        opts = field.options;
      }
      return opts.find((o) => String(o.id) === String(val))?.label ?? String(val);
    }

    if (field.type === 'product' || field.type === 'product_toggle') {
      const sel = this.selection.produits?.[field.id];
      if (!sel?.refBase) return null;
      const option = field.options?.find((o) => o.refBase === sel.refBase);
      if (!option) return null;
      let label = option.label;
      if (sel.coloris) {
        const colorisInfo = this.schema.collection.coloris?.find(
          (c) => String(c.id) === String(sel.coloris)
        );
        if (colorisInfo) label += ` · ${colorisInfo.label}`;
      }
      return label;
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Utilitaire (pour les étapes produit, modules suivants)
  // -------------------------------------------------------------------------

  _filterVisible(options) {
    return options.filter((opt) => isVisible(opt, this.selection));
  }
}
