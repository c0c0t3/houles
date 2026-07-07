import { Base } from '@studiometa/js-toolkit';
import { resolveLabel } from './show-if.js';

export default class LengthField extends Base {
  static config = {
    name: 'LengthField',
    refs: ['label', 'presets'],
    emits: ['changed'],
  };

  _field = null;
  _value = null;
  _customInput = null;

  mounted() {
    try {
      this._field = this.$el._syhField ?? null;
      const selection = this.$el._syhSelection ?? {};
      this._value = this._field ? (selection[this._field.id] ?? null) : null;
      if (!this._field) return;
      this.$refs.label.textContent = resolveLabel(this._field, this._selection);
      this._renderPresets();
    } catch (err) {
      console.error('[LengthField] mounted ERROR:', this._field?.id, err);
    }
  }

  refresh(selection) {
    if (!this._field) return;
    this._value = selection[this._field.id] ?? null;
    this.$refs.label.textContent = resolveLabel(this._field, selection);
    this._renderPresets();
  }

  _renderPresets() {
    const { presets = [], custom } = this._field;
    const container = this.$refs.presets;
    container.innerHTML = '';
    this._customInput = null;

    for (const p of presets) {
      const btn = this._clonePresetTemplate();
      if (!btn) continue;
      btn.textContent = `${p} cm`;
      btn.dataset.value = p;
      btn.classList.toggle('is-active', String(p) === String(this._value));
      container.appendChild(btn);
    }

    if (custom?.enabled) {
      const customBtn = this._cloneCustomTemplate();
      if (customBtn) {
        const isCustom = this._value !== null && !presets.map(String).includes(String(this._value));
        customBtn.classList.toggle('is-active', isCustom);
        this._customInput = customBtn.querySelector('input');
        if (this._customInput) {
          this._customInput.min = custom.min;
          this._customInput.max = custom.max;
          if (isCustom) {
            this._customInput.classList.remove('hidden');
            this._customInput.value = this._value;
          }
        }
        container.appendChild(customBtn);
        container.classList.toggle('is-checked', isCustom);
      }
    }
  }

  _clonePresetTemplate() {
    const tpl = this.$el.querySelector('[data-template="length-preset"]');
    if (!tpl) {
      console.warn('[LengthField] template "length-preset" introuvable');
      return null;
    }
    return tpl.content.cloneNode(true).firstElementChild;
  }

  _cloneCustomTemplate() {
    const tpl = this.$el.querySelector('[data-template="length-custom"]');
    if (!tpl) {
      console.warn('[LengthField] template "length-custom" introuvable');
      return null;
    }
    return tpl.content.cloneNode(true).firstElementChild;
  }

  onPresetsClick({ event }) {
    const btn = event.target.closest('button[data-value]');
    if (!btn) return;

    const val = btn.dataset.value;
    const container = this.$refs.presets;

    container.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    if (val === 'custom') {
      container.classList.add('is-checked');
      if (this._customInput) {
        this._customInput.classList.remove('hidden');
        this._customInput.focus();
      }
      return;
    }

    container.classList.remove('is-checked');
    if (this._customInput) this._customInput.classList.add('hidden');
    this._value = Number(val);
    this.$emit('changed', { fieldId: this._field.id, value: this._value });
  }

  onPresetsInput({ event }) {
    const input = event.target;
    if (input.tagName !== 'INPUT') return;
    const val = Number(input.value);
    const { min, max } = this._field.custom;
    if (!input.value || val < Number(min) || val > Number(max)) return;
    this._value = val;
    this.$emit('changed', { fieldId: this._field.id, value: val });
  }
}
