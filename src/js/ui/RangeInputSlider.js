import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';
import { Base } from '@studiometa/js-toolkit';

/**
 * RangeInputSlider Component
 */
class RangeInputSlider extends Base {
  static config = {
    name: 'RangeInputSlider',
    refs: ['slider', 'inputMin', 'inputMax'],
  };

  /**
   * On mounted
   */
  mounted() {
    // Récupère les noms des inputs
    const inputMinName =
      this.$refs.inputMin &&
      !Array.isArray(this.$refs.inputMin) &&
      this.$refs.inputMin instanceof HTMLInputElement
        ? this.$refs.inputMin.name
        : '';

    const inputMaxName =
      this.$refs.inputMax &&
      !Array.isArray(this.$refs.inputMax) &&
      this.$refs.inputMax instanceof HTMLInputElement
        ? this.$refs.inputMax.name
        : '';

    // Récupère les valeurs depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlMin = urlParams.get(inputMinName);
    const urlMax = urlParams.get(inputMaxName);

    const defaultMin = this.transformAsInteger(this.$el.dataset.defaultMin);
    const defaultMax = this.transformAsInteger(this.$el.dataset.defaultMax);
    const min = this.transformAsInteger(this.$el.dataset.min);
    const max = this.transformAsInteger(this.$el.dataset.max);

    const options = {
      start: [
        urlMin ? Number.parseInt(urlMin) : defaultMin,
        urlMax ? Number.parseInt(urlMax) : defaultMax,
      ],
      range: {
        min,
        max,
      },
      connect: true,
      tooltips: true,
      format: {
        to: (value) => Math.round(value),
        from: (value) => Number(value),
      },
    };

    const slider = noUiSlider.create(this.$el, options);

    const tooltips = this.$el.querySelectorAll('.noUi-tooltip');
    tooltips.forEach((tooltip) => {
      if (tooltip instanceof HTMLElement) {
        tooltip.style.setProperty('--units', `"${this.$el.dataset.units}"`);
        tooltip.classList.add('with-units');
      }
    });

    /**
     * On met à jour les inputs du formulaire
     */
    slider.on('update', (values) => {
      const [min, max] = values.map(Math.round);

      // Met à jour les inputs du formulaire
      const inputMin = this.$refs.inputMin;
      const inputMax = this.$refs.inputMax;
      if (inputMin && !Array.isArray(inputMin) && 'value' in inputMin) {
        inputMin.value = min;
      }
      if (inputMax && !Array.isArray(inputMax) && 'value' in inputMax) {
        inputMax.value = max;
      }
    });
  }

  /**
   * Transform the value as an integer
   * @param {number} value The value to transform
   * @returns {number} The transformed integer value
   */
  transformAsInteger(value) {
    return Math.round(value);
  }
}

export default RangeInputSlider;
