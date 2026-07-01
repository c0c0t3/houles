import { Base } from '@studiometa/js-toolkit';
import { fetchCollection } from './configuratorApi.js';
import RadioField from './features/radio-field.js';
import LengthField from './features/length-field.js';
import { isVisible } from './features/show-if.js';

console.log('[SYH] configurator.js chargé');

export default class Configurator extends Base {
  static config = {
    name: 'Syh',
    refs: ['stepper', 'stepContent', 'totalPrice'],
    components: { RadioField, LengthField },
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

  _applyChange(fieldId, value) {
    if (this.selection[fieldId] === value) return;
    this.selection[fieldId] = value;
    this._invalidateDownstream(fieldId);
    this._refreshCurrentStep();
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
    ].filter((c) => stepEl?.contains(c.$el));

    for (const child of allFields) {
      child.refresh(this.selection);
    }
  }

  // -------------------------------------------------------------------------
  // Utilitaire (pour les étapes produit, modules suivants)
  // -------------------------------------------------------------------------

  _filterVisible(options) {
    return options.filter((opt) => isVisible(opt, this.selection));
  }
}
