import { Base } from '@studiometa/js-toolkit';
import { Figure } from '@studiometa/ui';

/**
 * @typedef {{
 *   $refs: {
 *     swatchLine: HTMLElement;
 *     swatch: HTMLElement[];
 *     image: HTMLElement[];
 *   }
 * }} BlocHistoryProps
 */

/**
 * BlocHistory class.
 * @augments {Base<BlocHistoryProps>}
 */
class BlocHistory extends Base {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'BlocHistory',
    refs: ['swatch-line', 'swatch[]', 'image[]'],
    components: {
      Figure,
    },
  };

  /**
   * @param {{ target: HTMLElement }} ctx
   */
  onSwatchClick({ target }) {
    this.changeImage(target);
  }

  /**
   * @param {HTMLElement} swatch
   */
  changeImage(swatch) {
    const target = swatch.dataset.optionTarget;
    console.log(target);
    const images = this.$refs.image;
    images.forEach((image) => {
      if (image.dataset.optionTarget === target) {
        image.classList.remove('opacity-0');
      } else {
        image.classList.add('opacity-0');
      }
    });
  }
}

export default BlocHistory;
