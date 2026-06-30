import { Base } from '@studiometa/js-toolkit';

/**
 * VariantPicker class
 */
export default class VariantPicker extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'VariantPicker',
    refs: [
      'variantInput[]',
      'currentVariant',
      'morevariant[]',
      'morevariantbutton',
      'hidevariantbutton',
    ],
  };

  /**
   * On variant input change
   * @param {Event} e The event object
   * @returns {void}
   */
  onVariantInputChange(e) {
    const valueLabel = e.target.dataset.label;
    this.$refs.currentVariant.textContent = valueLabel;
  }

  /**
   * On variant input click
   * @param {Event} e The event object
   * @returns {void}
   */
  onVariantInputClick(e) {
    const valueLabel = e.target.dataset.label;
    this.$refs.currentVariant.textContent = valueLabel;
  }

  /**
   * On more variant button click
   * @returns {void}
   */
  onMorevariantbuttonClick() {
    this.$refs.morevariant.forEach((variant) => {
      console.log(variant);
      variant.classList.remove('hidden');
    });
    this.$refs.morevariantbutton.classList.add('hidden');
    this.$refs.hidevariantbutton.classList.remove('hidden');
  }

  /**
   * On hide variant button click
   * @returns {void}
   */
  onHidevariantbuttonClick() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });

    setTimeout(() => {
      this.$refs.morevariant.forEach((variant) => {
        variant.classList.add('hidden');
      });
      this.$refs.morevariantbutton.classList.remove('hidden');
      this.$refs.hidevariantbutton.classList.add('hidden');
    }, 200);
  }
}
