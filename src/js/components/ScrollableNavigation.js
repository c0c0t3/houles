import { Base } from '@studiometa/js-toolkit';

/**
 * @typedef {{
 *   $refs: {
 *     links: HTMLAnchorElement[];
 *   }
 * }} ScrollableNavigationProps
 */

/**
 * ScrollableNavigation class.
 * @augments {Base<ScrollableNavigationProps>}
 */
export default class ScrollableNavigation extends Base {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'ScrollableNavigation',
    refs: ['links[]'],
  };

  /**
   * Mounted
   */
  mounted() {
    this.$refs.links.forEach((link) => {
      if (link.href === window.location.href) {
        this.$el.scrollTo({
          left: link.offsetLeft + link.clientWidth / 2 - this.$el.clientWidth / 2,
          behavior: 'smooth',
        });
      }
    });
  }
}
