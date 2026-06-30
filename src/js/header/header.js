import { Base } from '@studiometa/js-toolkit';
import { toggleClass, removeClass, addClass } from '@studiometa/js-toolkit/utils';
import BurgerMenu from './BurgerMenu.js';
import Search from '../search/Search.js';
import AccordionItem from '../ui/Accordion/AccordionItem.js';

/**
 * Header component
 */
class Header extends Base {
  isVisible = false;
  breakpoints = ['xxs', 'xs', 's'];

  /**
   * Component Configuration
   */
  static config = {
    name: 'Header',
    refs: [
      'SectionMenu[]',
      'ImageSection[]',
      'btnOpenSubMenu[]',
      'subMenu[]',
      'btnCloseMenu',
      'backButton',
      'megaMenu',
      'innerHeader',
      'searchTrigger[]',
    ],
    components: {
      BurgerMenu,
      Search,
      AccordionItem,
    },
  };

  /**
   * Service mounted hook
   * @see https://js-toolkit.studiometa.dev/api/methods-hooks-services.html#mounted
   */
  mounted() {
    this.scrolled({ y: window.scrollY });
  }

  /**
   *
   * EVENT LISTENERS
   *
   */

  /**
   * Service scrolled hook
   * @see https://js-toolkit.studiometa.dev/api/methods-hooks-services.html#scrolled
   * @param {object} props Props
   * @param {number} props.y The current vertical scroll.
   */
  scrolled({ y }) {
    toggleClass(document.documentElement, 'is-on-top', y <= 0);
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
      this.$refs.innerHeader.removeAttribute('open');
      removeClass(document.body, 'overflow-hidden');
      this.toggleAllSubmenus();
      // Réinitialiser après un court délai
      setTimeout(() => {
        this._hasClosed = false;
      }, 100);
    }
  }

  /**
   * On click on the close menu button
   */
  onBtnCloseMenuClick() {
    this.$refs.innerHeader.removeAttribute('open');
    toggleClass(document.body, 'overflow-hidden');
    this.toggleAllSubmenus();
  }

  /**
   * On click on the burger menu button
   */
  onBurgerMenuClick() {
    this.$refs.innerHeader.setAttribute('open', 'true');
  }

  /**
   * On mouse enter on a section menu item
   * @param {object} root0 The event object
   * @param {HTMLElement} root0.target The target element
   */
  onSectionMenuMouseenter({ target }) {
    // Si le sous-menu n'est pas ouvert, on change l'image
    if (!document.documentElement.classList.contains('is-open-sub-menu') && !this.isMobile) {
      this.changeImage(target.dataset.section);
    }

    addClass(this.$refs.sectionMenu, '!text-brown-light');
    removeClass(target, '!text-brown-light');
  }

  /**
   * On mouse leave on a section menu item
   */
  onSectionMenuMouseleave() {
    if (!document.documentElement.classList.contains('is-open-sub-menu')) {
      this.backToRegularImage();
    }
    removeClass(this.$refs.sectionMenu, '!text-brown-light');
  }

  /**
   * On click on the back button
   * Close the submenu
   * @param {object} props Props
   * @param {HTMLElement} props.target The target element.
   */
  onBackButtonClick({ target }) {
    const currentSectionMenu = target.closest('[data-ref="SectionMenu[]"]');
    this.toggleSubMenu(currentSectionMenu);
  }

  /**
   *
   * FUNCTIONS
   *
   */

  /**
   * Change the image of the section menu
   * @param {string} target The target section identifier
   */
  changeImage(target) {
    removeClass(this.$el.querySelector(`[data-image="${target}"]`), [
      'opacity-0',
      'blur',
      'scale-110',
    ]);
  }

  /**
   * Back to the regular image
   */
  backToRegularImage() {
    addClass(this.$refs.imageSection, ['opacity-0', 'blur', 'scale-110']);
  }

  /**
   * On click on the open submenu button
   * @param {object} props Props
   * @param {HTMLElement} props.target The target element.
   */
  onBtnOpenSubMenuClick({ target }) {
    this.toggleSubMenu(target);
  }

  /**
   * Toggle the display of the submenu
   * @param {HTMLElement} target The target element to toggle
   */
  toggleSubMenu(target) {
    const root = document.documentElement;
    const currentSectionMenu = target.closest('[data-ref="SectionMenu[]"]');

    // Est-ce que le sous-menu actuel est déjà actif ?
    const isAlreadyActive = currentSectionMenu.classList.contains('is-active');

    // Fermer tous les sous-menus
    this.toggleAllSubmenus();

    if (isAlreadyActive) {
      // Si le menu était déjà ouvert → on ferme tout
      removeClass(root, 'is-open-sub-menu');
    } else {
      // Sinon → on l'ouvre
      addClass(root, 'is-open-sub-menu');
      addClass(currentSectionMenu, 'is-active');
    }
  }

  /**
   * Toggle all submenus and close all accordion items from the mega menu
   */
  toggleAllSubmenus() {
    removeClass(this.$refs.sectionMenu, 'is-active');
    AccordionItem.closeAll('[data-ref="megaMenu"]');
  }

  /**
   * Check if device is mobile
   * @returns {boolean}
   */
  get isMobile() {
    return this.breakpoints.includes(this.$services.get('resized').breakpoint);
  }
}

export default Header;
