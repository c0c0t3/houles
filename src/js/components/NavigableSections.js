import { Base, withMountWhenInView } from '@studiometa/js-toolkit';
import { toggleClass, historyReplace } from '@studiometa/js-toolkit/utils';
import { Sentinel } from '@studiometa/ui';

/**
 * @typedef {{
 *   $children: {
 *     NavigableSection: Sentinel[];
 *   }
 *   $refs: {
 *     links: HTMLElement[];
 *     linksContainer: HTMLElement;
 *   }
 * }} NavigableSectionsProps
 */

/**
 * NavigableSections class.
 * @augments {Base<NavigableSectionsProps>}
 */
export default class NavigableSections extends withMountWhenInView(Base) {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'NavigableSections',
    components: {
      NavigableSection: Sentinel,
    },
    refs: ['links[]', 'linksContainer'],
  };

  /**
   * sections
   * @returns {Sentinel[]}
   */
  get sections() {
    return this.$children.NavigableSection;
  }

  /**
   * links
   * @returns {HTMLElement|HTMLElement[]}
   */
  get links() {
    return this.$refs.links;
  }

  /**
   * onNavigableSectionIntersected
   * @param {object} props
   * @param {Array} props.args
   * @param {number} props.index
   */
  onNavigableSectionIntersected({ args, index }) {
    const [entries] = args;
    const [entry] = entries;
    const link = this.links[index];

    if (entry.isIntersecting) {
      toggleClass(this.links, 'is-active', false);
      toggleClass(link, 'is-active', true);

      historyReplace({ hash: link.hash });

      const { linksContainer } = this.$refs;

      const linkRect = link.getBoundingClientRect();
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      linksContainer.scrollTo({
        left: linkRect.left + linksContainer.scrollLeft - (windowWidth - linkRect.width) / 2,
        behavior: 'smooth',
      });
    } else {
      toggleClass(link, 'is-active', false);
    }
  }

  /**
   * Destroyed
   */
  destroyed() {
    toggleClass(this.links, 'is-active', false);
    historyReplace({ hash: '' });
  }
}
