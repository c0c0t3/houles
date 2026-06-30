import { transform, map, domScheduler } from '@studiometa/js-toolkit/utils';
import { SliderProgress as SliderProgressCore } from '@studiometa/ui';

/**
 * SliderProgress
 */
export default class SliderProgress extends SliderProgressCore {
  static config = {
    ...SliderProgressCore.config,
    options: {
      ...SliderProgressCore.config.options,
      contain: Boolean,
    },
  };

  /**
   * Update the progress indicator.
   * @param {number} index
   */
  update(index) {
    domScheduler.read(() => {
      const { progress } = this.$refs;
      const x =
        this.$options.contain && this.$parent.$options.contain
          ? map(
              this.$parent.getStates()[index].x[this.$parent.$options.mode],
              this.$parent.containMinState,
              this.$parent.containMaxState,
              progress.clientWidth * -1,
              0,
            )
          : map(index, 0, this.$parent.indexMax, progress.clientWidth * -1, 0);
      domScheduler.write(() => {
        transform(progress, { x });
      });
    });
  }
}
