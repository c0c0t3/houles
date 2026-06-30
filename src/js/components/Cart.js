import { Base } from '@studiometa/js-toolkit';
import { addClass, removeClass } from '@studiometa/js-toolkit/utils';

/**
 * Cart component
 */
class Cart extends Base {
  isOpen = false;

  static config = {
    name: 'Cart',
    refs: ['searchCart', 'cartQuickAdd', 'code[]', 'title[]'],
  };

  /**
   * Prevent document click
   * @param {object} param0
   */
  onSearchCartClick({ event }) {
    event.preventDefault();

    if (this.hasMatch) {
      event.stopPropagation();
      this.openCartQuickAdd();
    }
  }

  /**
   * Close when clicking outside the dropdown
   */
  onDocumentClick() {
    if (this.isOpen) {
      this.closeCartQuickAdd();
    }
  }

  /**
   * On search cart input
   * @returns {void}
   */
  onSearchCartInput() {
    // Si la recherche est vide, on ferme le modal
    if (this.inputValue.length < 1) {
      this.resetHighlights();
      this.closeCartQuickAdd();
      return;
    }

    // Si on a trouvé un match, on ouvre le modal, sinon on ferme le modal
    if (this.hasMatch) {
      this.openCartQuickAdd();
    } else {
      this.resetHighlights();
      this.closeCartQuickAdd();
    }
  }

  /**
   * Open the cart quick add
   */
  openCartQuickAdd() {
    addClass(document.documentElement, 'is-quick-add-active');
    this.isOpen = true;
  }

  /**
   * Close the cart quick add
   */
  closeCartQuickAdd() {
    removeClass(document.documentElement, 'is-quick-add-active');
    this.isOpen = false;
  }

  /**
   * Highlight the matching refs
   * @param {string} searchText The text to search for
   * @returns {boolean} True if a match is found, false otherwise
   */
  highlightMatchingRefs(searchText) {
    const escapedSearch = searchText.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'gi');
    let foundMatch = false;

    ['code', 'title'].forEach((refKey) => {
      this.$refs[refKey].forEach((el) => {
        const originalText = el.textContent;

        if (regex.test(originalText)) {
          foundMatch = true;
          const highlighted = originalText.replace(
            regex,
            (match) => `<span class="font-bold">${match}</span>`,
          );
          el.innerHTML = highlighted;
        } else {
          el.innerHTML = originalText;
        }
      });
    });

    return foundMatch;
  }

  /**
   * Reset the highlights
   */
  resetHighlights() {
    ['code', 'title'].forEach((refKey) => {
      this.$refs[refKey].forEach((el) => {
        el.innerHTML = el.textContent;
      });
    });
  }

  /**
   * Close panel when type on Escape key
   * @param {object} props Props
   * @param {object} props.ESC Escape key
   * @returns {void}
   */
  keyed({ ESC }) {
    if (ESC && !this._hasClosed) {
      this._hasClosed = true;
      this.closeCartQuickAdd();
      // Réinitialiser après un court délai
      setTimeout(() => {
        this._hasClosed = false;
      }, 100);
    }
  }

  /**
   *
   */
  get inputValue() {
    return this.$refs.searchCart.value.trim();
  }

  /**
   *
   */
  get hasMatch() {
    return this.inputValue.length >= 3 ? this.highlightMatchingRefs(this.inputValue) : false;
  }
}

export default Cart;
