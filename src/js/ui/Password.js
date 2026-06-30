import { Base } from '@studiometa/js-toolkit';

/**
 * Password component
 */
export default class Password extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'Password',
    refs: ['passwordToggle', 'passwordInput', 'icon-eye-encrypted', 'icon-eye-unencrypted'],
  };

  /**
   * On password toggle click
   */
  onPasswordToggleClick() {
    const password = this.$refs.passwordInput;

    if (password.type === 'password') {
      password.type = 'text';
      this.$refs.iconEyeEncrypted.classList.add('hidden');
      this.$refs.iconEyeUnencrypted.classList.remove('hidden');
    } else {
      password.type = 'password';
      this.$refs.iconEyeEncrypted.classList.remove('hidden');
      this.$refs.iconEyeUnencrypted.classList.add('hidden');
    }

    password.focus();
  }
}
