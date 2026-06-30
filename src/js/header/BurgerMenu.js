import { Base } from '@studiometa/js-toolkit';
import { toggleClass } from '@studiometa/js-toolkit/utils';
import Header from './header.js';

/**
 * BurgerMenu component
 */
export default class BurgerMenu extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'BurgerMenu',
    refs: ['OpenLabel', 'CloseLabel'],
    components: {
      Header,
    },
  };

  /** On click on the burger menu button */
  onClick() {
    this.openMenu();
  }

  /**
   * Open the menu.
   */
  openMenu() {
    toggleClass(document.body, 'overflow-hidden');
  }
}
