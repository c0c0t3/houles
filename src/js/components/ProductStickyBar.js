import { Base } from '@studiometa/js-toolkit';

/**
 * ProductStickyBar class
 */
class ProductStickyBar extends Base {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'ProductStickyBar',
  };

  isVisible = false;

  /**
   * Get Main Add To Cart position
   * @returns {number}
   */
  get addToCartPosition() {
    const add_to_cart = document.querySelector('.product-info-add-to-cart-button');
    if (!add_to_cart) {
      return 0;
    }

    return add_to_cart.getBoundingClientRect().top;
  }

  /**
   * Get footer position
   * @returns {number}
   */
  get footerPosition() {
    const footer = document.querySelector('footer.footer');
    if (!footer) {
      return 0;
    }

    return footer.getBoundingClientRect().top - window.innerHeight;
  }

  /**
   * Service scrolled hook
   * @see https://js-toolkit.studiometa.dev/api/methods-hooks-services.html#scrolled
   * @returns {void}
   */
  scrolled() {
    const position = this.addToCartPosition;
    const footerPosition = this.footerPosition;

    // 1. Footer visible → cacher toujours
    if (footerPosition < 0) {
      if (this.isVisible) {
        this.$el.classList.add('translate-y-full');
        this.isVisible = false;
      }
      return;
    }

    // 2. Bouton proche du haut → montrer
    if (position < 50 && !this.isVisible) {
      this.$el.classList.remove('translate-y-full');
      this.isVisible = true;
      return;
    }

    // 3. Bouton plus bas → cacher
    if (this.isVisible && position >= 50) {
      this.$el.classList.add('translate-y-full');
      this.isVisible = false;
    }
  }
}

export default ProductStickyBar;
