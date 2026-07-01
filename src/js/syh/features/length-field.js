import { Base } from '@studiometa/js-toolkit';

export default class LengthField extends Base {
  static config = {
    name: 'LengthField',
    refs: ['label', 'presets', 'customWrapper', 'customInput'],
    emits: ['changed'],
  };

  _field = null;
  _value = null;

  mounted() {
    try {
      this._field = this.$el._syhField ?? null;
      const selection = this.$el._syhSelection ?? {};
      this._value = this._field ? (selection[this._field.id] ?? null) : null;
      if (!this._field) return;
      this.$refs.label.textContent = this._field.label;
      this._renderPresets();
      if (this._field.custom?.enabled) {
        this.$refs.customInput.min = this._field.custom.min;
        this.$refs.customInput.max = this._field.custom.max;
      }
    } catch (err) {
      console.error('[LengthField] mounted ERROR:', this._field?.id, err);
    }
  }

  refresh(selection) {
    if (!this._field) return;
    this._value = selection[this._field.id] ?? null;
    this._renderPresets();
  }

  _renderPresets() {
    const { presets = [], custom } = this._field;
    const container = this.$refs.presets;
    container.innerHTML = '';

    for (const p of presets) {
      const btn = this._clonePresetTemplate();
      if (!btn) continue;
      btn.textContent = `${p} cm`;
      btn.dataset.value = p;
      btn.classList.toggle('is-active', String(p) === String(this._value));
      container.appendChild(btn);
    }

    if (custom?.enabled) {
      const btn = this._clonePresetTemplate();
      if (btn) {
        btn.textContent = 'Sur-mesure';
        btn.dataset.value = 'custom';
        const isCustom = this._value !== null && !presets.map(String).includes(String(this._value));
        btn.classList.toggle('is-active', isCustom);
        container.appendChild(btn);
      }
    }

    const isCustomActive = this._value !== null && !presets.map(String).includes(String(this._value));
    this.$refs.customWrapper.hidden = !isCustomActive;
    if (isCustomActive) this.$refs.customInput.value = this._value;
  }

  _clonePresetTemplate() {
    const tpl = this.$el.querySelector('[data-template="length-preset"]');
    if (!tpl) {
      console.warn('[LengthField] template "length-preset" introuvable');
      return null;
    }
    return tpl.content.cloneNode(true).firstElementChild;
  }

  onPresetsClick({ event }) {
    const btn = event.target.closest('button[data-value]');
    if (!btn) return;

    const val = btn.dataset.value;

    this.$refs.presets.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    if (val === 'custom') {
      this.$refs.customWrapper.hidden = false;
      this.$refs.customInput.focus();
      return;
    }

    this.$refs.customWrapper.hidden = true;
    this._value = Number(val);
    this.$emit('changed', { fieldId: this._field.id, value: this._value });
  }

  onCustomInputInput({ event }) {
    const input = event.target;
    const val = Number(input.value);
    const { min, max } = this._field.custom;
    if (!input.value || val < Number(min) || val > Number(max)) return;
    this._value = val;
    this.$emit('changed', { fieldId: this._field.id, value: val });
  }
}
