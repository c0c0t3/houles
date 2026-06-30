import { Panel as CoreModal } from '@studiometa/ui';

/**
 * Modal
 */
export default class Panel extends CoreModal {
  /**
   * Mounted
   */
  mounted() {
    super.mounted();
    this.$el.open = () => this.open();
    this.$el.close = () => this.close();
  }
}
