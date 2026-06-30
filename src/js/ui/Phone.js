import { Base } from '@studiometa/js-toolkit';
import intlTelInput from 'intl-tel-input';
import 'intl-tel-input/build/css/intlTelInput.css';

/**
 * Phone component
 */
export default class Phone extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'Phone',
  };

  /**
   * On mounted element
   */
  mounted() {
    const phone = this.$el;
    if (!(phone instanceof HTMLInputElement)) return;

    intlTelInput(phone, {
      initialCountry: 'fr',
      nationalMode: true,
      separateDialCode: true,
      geoIpLookup: (callback) => {
        fetch('https://ipapi.co/json')
          .then((res) => res.json())
          .then((data) => callback(data.country_code))
          .catch(() => callback('us'));
      },
      loadUtils: () => import('intl-tel-input/utils'),
    });
    const iti = intlTelInput.getInstance(phone);

    phone.addEventListener('countrychange', () => {
      const number = iti.getNumber();
      console.log('number', number);
    });
  }
}
