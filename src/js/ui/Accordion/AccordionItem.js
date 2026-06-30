import { Base, getInstances } from '@studiometa/js-toolkit';
import { addStyle } from '@studiometa/js-toolkit/utils';
import { removeClass, addClass } from '@studiometa/js-toolkit/utils';
import { trapFocus } from '@studiometa/js-toolkit/utils';

/**
 *
 */
class AccordionItem extends Base {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'AccordionItem',
    refs: ['accordionButton', 'accordionContent', 'accordionButtonIcon'],
  };

  /**
   * Click on accordion button
   */
  onAccordionButtonClick() {
    this.toggle();
  }

  /**
   * Toggle accordion item
   */
  toggle() {
    if (
      this.$refs.accordionContent.style.maxHeight &&
      this.$refs.accordionContent.style.maxHeight !== '0px'
    ) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Close accordion item
   */
  close() {
    console.log('close');
    addStyle(this.$refs.accordionContent, { maxHeight: '0px' });
    removeClass(this.$refs.accordionButtonIcon, 'is-active');
  }

  /**
   * Open accordion item
   */
  open() {
    const windowHeight = window.innerHeight;
    let maxHeight = windowHeight - this.$refs.accordionContent.getBoundingClientRect().top - 100;
    maxHeight = 10000;
    addStyle(this.$refs.accordionContent, { maxHeight: `${maxHeight}px` });
    addClass(this.$refs.accordionButtonIcon, 'is-active');
    trapFocus(this.$refs.accordionContent[0], event);
  }

  /**
   * Toggle all accordion items // To be accessed outside !
   * @param {string} selector The selector to filter the accordion items to close
   */
  static closeAll(selector = null) {
    for (const accordion of getInstances(AccordionItem)) {
      if (!selector || accordion.$el.closest(selector)) {
        accordion.close();
      }
    }
  }
}

export default AccordionItem;
