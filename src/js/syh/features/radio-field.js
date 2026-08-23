import { Base } from '@studiometa/js-toolkit';
import { isVisible, resolveLabel } from './show-if.js';

export default class RadioField extends Base {
  static config = {
    name: 'RadioField',
    refs: ['label', 'options'],
    emits: ['changed'],
  };

  _field = null;
  _selection = null;
  _coloris = [];

  mounted() {
    try {
      this._field = this.$el._syhField ?? null;
      this._selection = this.$el._syhSelection ?? {};
      this._coloris = this.$el._syhColoris ?? [];
      if (!this._field) return;
      this.$refs.label.textContent = resolveLabel(this._field, this._selection);
      this._render();
    } catch (err) {
      console.error('[RadioField] mounted ERROR:', this._field?.id, err);
    }
  }

  refresh(selection) {
    if (!this._field) return;
    this._selection = selection;
    this.$refs.label.textContent = resolveLabel(this._field, this._selection);
    this._render();
  }

  _render() {
    const { id, variant = 'label', dependsOn, options } = this._field;

    let opts = [];
    if (dependsOn) {
      const parentValue = this._selection[dependsOn];
      opts = options[parentValue] ?? [];
    } else {
      opts = Array.isArray(options) ? options : [];
    }

    const currentValue = this._selection[id];
    const container = this.$refs.options;
    container.innerHTML = '';

    for (const opt of opts.filter((o) => isVisible(o, this._selection))) {
      const el = this._cloneOptionTemplate(variant);
      if (!el) continue;

      const input = el.querySelector('[data-ref="input"]');
      input.name = id;
      input.value = opt.id;
      input.checked = String(opt.id) === String(currentValue);

      el.querySelector('[data-ref="optLabel"]').textContent = opt.label;

      // Source de l'image déterminée par le `variant` déclaré, jamais déduite de la donnée
      // présente : "label_image" = photo de l'option (opt.image) ; "label_thumbnail" = vignette
      // coloris résolue par id via collection.coloris[] (pas portée par l'option elle-même).
      const img = el.querySelector('[data-ref="image"]');
      if (img) {
        let src = null;
        if (variant === 'label_thumbnail') {
          src = this._coloris.find((c) => String(c.id) === String(opt.id))?.thumbnail ?? null;
        } else {
          src = opt.image ?? null;
        }
        if (src) {
          img.src = src;
          img.alt = opt.label;
        } else {
          img.remove();
        }
      }

      container.appendChild(el);
    }
  }

  _cloneOptionTemplate(variant) {
    const tpl = this.$el.querySelector(`[data-template="radio-option--${variant}"]`);
    if (!tpl) {
      console.warn(`[RadioField] template "radio-option--${variant}" introuvable`);
      return null;
    }
    return tpl.content.cloneNode(true).firstElementChild;
  }

  onOptionsChange({ event }) {
    const input = event.target.closest('input[type="radio"]');
    if (!input || !this._field) return;
    this.$emit('changed', { fieldId: this._field.id, value: input.value });
  }
}
