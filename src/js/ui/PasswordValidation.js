import { Base } from '@studiometa/js-toolkit';
import { addClass, removeClass } from '@studiometa/js-toolkit/utils';

/**
 * PasswordValidation component
 */
export default class PasswordValidation extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'PasswordValidation',
    refs: ['password[]', 'number', 'capital', 'length', 'letter', 'special', 'message', 'match'],
  };

  /**
   * On click on the burger menu button
   * @param {*} event
   */
  onPasswordInput(event) {
    this.checkPassword(event);
  }

  /** On focus on the password field */
  onPasswordFocus() {
    removeClass(this.$refs.message, 'hidden');
  }

  /** On blur on the password field */
  onPasswordBlur() {
    addClass(this.$refs.message, 'hidden');
  }

  /**
   * Check the password validity
   * @param {*} event
   */
  checkPassword(event) {
    const password = event.target.value;

    // Store the validation results in an object
    const results = {
      number: /[0-9]/.test(password),
      capital: /[A-Z]/.test(password),
      length: password.length >= 8,
      letter: /[a-z]/.test(password),
      special: /[!@#$%^&*]/.test(password),
    };

    const refsToCheck = ['number', 'capital', 'length', 'letter', 'special'];

    refsToCheck.forEach((refToCheck) => {
      const value = results[refToCheck];
      if (value) {
        addClass(this.$refs[refToCheck], 'text-green-light');
        removeClass(this.$refs[refToCheck], 'text-red-400');
      } else {
        addClass(this.$refs[refToCheck], 'text-red-400');
        removeClass(this.$refs[refToCheck], 'text-green-light');
      }
    });

    // Vérifier si les deux mots de passe sont identiques
    const passwords = this.$refs.password;
    const arePasswordsMatching = passwords[0].value === passwords[1].value;

    if (arePasswordsMatching) {
      addClass(this.$refs.match, 'text-green-light');
      removeClass(this.$refs.match, 'text-red-400');
    } else {
      addClass(this.$refs.match, 'text-red-400');
      removeClass(this.$refs.match, 'text-green-light');
    }

    // Use the results directly to determine overall validity
    const isValid = Object.values(results).every(Boolean);

    if (isValid) {
      this.$refs.password.classList.remove('valid');
    } else {
      this.$refs.password.classList.add('valid');
    }
  }
}
