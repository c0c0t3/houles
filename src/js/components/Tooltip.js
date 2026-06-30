import { Base } from '@studiometa/js-toolkit';

/**
 * Tooltip class
 */
export default class Tooltip extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'Tooltip',
    refs: ['button', 'content'],
  };

  /**
   * on Mounted
   */
  mounted() {
    document.addEventListener('touchstart', this.dismissAll.bind(this), true);
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  /**
   * on Button Click
   * @returns {void}
   */
  onButtonClick() {
    this.toggle();
  }

  /**
   * Handle position of tooltip
   * @param {Event} event The event object
   */
  handleClickOutside(event) {
    if (!this.$el.contains(event.target)) {
      this.close();
    }
  }

  /**
   * Handle dropdown position
   * @returns {void}
   */
  handleDropdownPosition() {
    let screenPadding;

    const isMobile = window.matchMedia('(max-width: 479px)').matches;
    if (isMobile) {
      screenPadding = 4;
    } else {
      screenPadding = 16;
    }

    const button = /** @type {HTMLElement} */ (this.$refs.button);
    const content = /** @type {HTMLElement} */ (this.$refs.content);

    // Reset styles
    content.style.left = '50%';
    content.style.right = 'auto';
    content.style.top = '50%';
    content.style.bottom = 'auto';
    content.style.transform = 'none';

    const buttonRect = button.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    const container = button.closest('[data-ref="tooltipContainer[]"]');
    console.log(container)

    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // X axis
    const contentRightX = contentRect.left + contentRect.width;
    const containerRightX = containerRect.left + containerRect.width;
    
    const overflowsLeft = contentRect.left < containerRect.left;
    const overflowsRight = contentRightX > containerRightX;
    console.log(overflowsRight)

    if (overflowsLeft) {
      content.style.left = '50%';
      content.style.right = 'auto';
      content.style.transform = `translateX(${containerRect.left - buttonRect.left + screenPadding}px)`;
    } else if (overflowsRight) {
      content.style.left = 'auto';
      content.style.right = '50%';
      content.style.transform = `translateX(${containerRightX - (buttonRect.left + buttonRect.width) - screenPadding}px)`;
    } else {
      content.style.left = '50%';
      content.style.right = 'auto';
      // conserve transformY dans l'axe Y plus bas
    }

    // Y axis
    const contentBottomY = contentRect.top + contentRect.height;
    const containerBottomY = containerRect.top + containerRect.height;

    const overflowsBottom = contentBottomY > containerBottomY;

    if (overflowsBottom) {
      content.style.top = 'auto';
      content.style.bottom = '50%';
      // content.style.transform += ' translateY(-100%)';
    } else {
      content.style.top = '50%';
      content.style.bottom = 'auto';
      content.style.transform += ' translateY(0)';
    }
  }

  /**
   * Open the tooltip
   * @returns {void}
   */
  open() {
    console.log(this.$el)
    this.$el.setAttribute('aria-expanded', 'true');
    this.handleDropdownPosition();
  }

  /**
   * Close the tooltip
   * @returns {void}
   */
  close() {
    this.$el.setAttribute('aria-expanded', 'false');
  }

  /**
   * Toggle the tooltip
   * @returns {void}
   */
  toggle() {
    if (this.$el.getAttribute('aria-expanded') === 'true') {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Dismiss all tooltips
   * @param {Event} event The event object
   * @returns {void}
   */
  dismissAll(event) {
    if (!event.target.closest('[data-component="Tooltip"]')) {
      document
        .querySelectorAll('[data-component="Tooltip"][aria-expanded="true"]')
        .forEach((el) => {
          el.setAttribute('aria-expanded', 'false');
        });
    }
  }
}
