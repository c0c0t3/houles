import { SliderDrag as SliderDragCore } from '@studiometa/ui';
import { addClass, removeClass } from '@studiometa/js-toolkit/utils';

/**
 * SliderDrag component
 */
export default class SliderDrag extends SliderDragCore {
  /**
   * Add the `cursor-grab` class to the element.
   */
  mounted() {
    addClass(this.$el, 'cursor-grab');
  }

  /**
   * Remove the `cursor-grab` class from the element.
   */
  destroyed() {
    removeClass(this.$el, 'cursor-grab');
    removeClass(document.documentElement, 'is-grabbing');
  }

  /**
   * Dragged
   * @param {object} props
   */
  dragged(props) {
    if (props.mode === 'start') {
      addClass(document.documentElement, 'is-grabbing');
    }

    if (props.mode === 'drop') {
      removeClass(document.documentElement, 'is-grabbing');
    }

    super.dragged(props);
  }
}
