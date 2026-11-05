import { Base } from '@studiometa/js-toolkit';
import { resolveLabel } from './show-if.js';

/**
 * Champ de saisie numérique bornée (`min`/`max`/`default`/`unit`), qui alimente `selection` comme
 * un paramètre classique (ex : `hauteur_cordon`). Distinct de `length` (Module 4) : pas de
 * `presets` ni de "sur-mesure", une simple valeur bornée. Voir docs/module-9-systeme-tirage.md,
 * section 3.1.
 */
export default class NumberField extends Base {
  static config = {
    name: 'NumberField',
    refs: ['label', 'input', 'unit'],
    emits: ['changed'],
  };

  _field = null;

  mounted() {
    try {
      this._field = this.$el._syhField ?? null;
      const selection = this.$el._syhSelection ?? {};
      if (!this._field) return;
      this.$refs.label.textContent = resolveLabel(this._field, selection);
      this.$refs.input.min = this._field.min;
      this.$refs.input.max = this._field.max;
      this.$refs.unit.textContent = this._field.unit ?? '';
      this._setValue(selection[this._field.id] ?? this._field.default ?? null);
    } catch (err) {
      console.error('[NumberField] mounted ERROR:', this._field?.id, err);
    }
  }

  refresh(selection) {
    if (!this._field) return;
    this.$refs.label.textContent = resolveLabel(this._field, selection);
    this._setValue(selection[this._field.id] ?? null);
  }

  _setValue(value) {
    this.$refs.input.value = value ?? '';
  }

  /**
   * Correction des bornes à la perte de focus (input `change`, pas `input`) — ne gêne pas la
   * saisie en cours, même convention que les champs A/B/C de la modale "Calcul de longueur"
   * (voir longueur-calculator.js). Une valeur vide ou invalide retombe sur `field.default`.
   */
  onInputChange({ event }) {
    const { min, max, default: defaultValue } = this._field;
    let value = Number(event.target.value);
    if (!event.target.value || Number.isNaN(value)) {
      value = defaultValue ?? Number(min);
    } else if (value < Number(min)) {
      value = Number(min);
    } else if (value > Number(max)) {
      value = Number(max);
    }
    event.target.value = value;
    this.$emit('changed', { fieldId: this._field.id, value });
  }
}
