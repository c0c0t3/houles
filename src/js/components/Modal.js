import { Modal as CoreModal } from '@studiometa/ui';

/**
 * Modal
 */
export default class Modal extends CoreModal {
  /**
   * Mounted
   */
  mounted() {
    super.mounted();
    this.$el.open = () => this.open();
    this.$el.close = () => this.close();
  }
}
