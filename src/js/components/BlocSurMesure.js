import { Base } from '@studiometa/js-toolkit';
import { Figure } from '@studiometa/ui';

/**
 * @typedef {{
 *   $refs: {
 *     swatchLine: HTMLElement;
 *     swatch: HTMLElement[];
 *     image: HTMLElement[];
 *   }
 * }} BlocSurMesureProps
 */

/**
 * BlocSurMesure class.
 * @augments {Base<BlocSurMesureProps>}
 */
class BlocSurMesure extends Base {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'BlocSurMesure',
    refs: ['swatch-line', 'swatch[]', 'image[]'],
    components: {
      Figure,
    },
  };

  /**
   * Mounted hook - initializes the component by setting the initial bar position
   * on the first swatch element.
   */
  mounted() {
    this.changeBarPosition(this.$refs.swatch[0]);
  }

  /**
   * @param {{ target: HTMLElement }} ctx
   */
  onSwatchClick({ target }) {
    this.changeBarPosition(target);
    this.changeImage(target);
  }

  /**
   * @param {{ target: HTMLElement }} ctx
   */
  onSwatchMouseenter({ target }) {
    this.changeBarPosition(target);
    this.changeImage(target);
  }

  /**
   * @param {HTMLElement} swatch
   */
  changeBarPosition(swatch) {
    const bar = this.$refs.swatchLine;
    const swatchRect = swatch.getBoundingClientRect();
    const parentRect = swatch.parentElement.getBoundingClientRect();
    const relativeTop = swatchRect.top - parentRect.top + 22;
    bar.style.top = `${relativeTop}px`;
    setTimeout(() => {
      bar.classList.remove('opacity-0');
    }, 300);

    // Remove active class from all swatches
    this.$refs.swatch.forEach((s) => s.classList.remove('is-active'));
    // Add active class to current swatch
    swatch.classList.add('is-active');
  }

  /**
   * @param {HTMLElement} swatch
   */
  changeImage(swatch) {
    const target = swatch.dataset.optionTarget;
    console.log(target);
    const images = this.$refs.image;
    images.forEach((image) => {
      console.log(image);
      if (image.dataset.optionTarget === target) {
        image.classList.remove('opacity-0');
        image.classList.remove('-translate-y-4');
      } else {
        image.classList.add('opacity-0');
        image.classList.add('-translate-y-4');
      }
    });
  }
}

export default BlocSurMesure;
