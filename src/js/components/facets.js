import { Base } from '@studiometa/js-toolkit';
/**
 * Facets component
 */
class Facets extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'Facets',
    refs: [
      'facetsCheckbox[]',
      'facetsRadio[]',
      'facetsRangeSlider[]',
      'resetFacets[]',
      'facetsForm',
    ],
  };

  /**
   * EVENT LISTENERS
   */

  /**
   * On mounted
   */
  mounted() {
    this.restoreFacetsFromURL();
  }

  /**
   * On click on Reset Facets
   */
  onResetFacetsClick() {
    this.resetFacets();
  }

  /**
   * Reset the facets inputs
   */
  resetFacets() {
    this.$el.querySelectorAll('input').forEach((input) => {
      if (input.checked) {
        input.checked = false;
      }
      if (input.value) {
        input.value = '';
        const url = new URL(window.location.href);
        url.searchParams.delete(input.name);
        window.history.replaceState({}, '', url);
      }
    });
    this.toggleFacets();
    this.$el.querySelector('form').submit();
  }

  /**
   * Restore the facets from the URL
   */
  restoreFacetsFromURL() {
    const form = this.$refs.facetsForm;
    const params = new URLSearchParams(window.location.search);

    for (const [key, value] of params.entries()) {
      // Handle multiple values (e.g., brand=nike&brand=adidas)
      const matchingInputs = form.querySelectorAll(`[name="${key}"]`);

      matchingInputs.forEach((input) => {
        if (input.type === 'checkbox' || input.type === 'radio') {
          if (input.value === value) {
            input.checked = true;
          }
        } else {
          // For inputs like text/select/etc.
          input.value = value;
        }
      });
    }
  }
}

export default Facets;
