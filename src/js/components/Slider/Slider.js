import { withBreakpointObserver } from '@studiometa/js-toolkit';

import { Slider as SliderCore, SliderItem, SliderBtn, SliderDots } from '@studiometa/ui';
import SliderDrag from './SliderDrag.js';
import SliderProgress from './SliderProgress.js';

/**
 * Slider
 */
export default class Slider extends SliderCore {
  static config = {
    ...SliderCore.config,
    components: {
      SliderItem,
      SliderDrag: withBreakpointObserver(SliderDrag),
      SliderBtn,
      SliderDots,
      SliderProgress,
    },
  };
}
