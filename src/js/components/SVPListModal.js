import { Base } from '@studiometa/js-toolkit';

/**
 * SVPListModal component
 */
export default class SVPListModal extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'SVPListModal',
    refs: ['location[]', 'mybutton'],
  };

  /**
   * On mybutton click
   */
  onMybuttonClick() {
    console.log(this.$refs.mybutton);
    const checkedRadio = this.$refs.location.find((radio) => radio.checked);
    if (checkedRadio) {
      this.$refs.mybutton.href = checkedRadio.value;
    }
  }
}
