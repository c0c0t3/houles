import { Base } from '@studiometa/js-toolkit';
import { removeClass, addClass } from '@studiometa/js-toolkit/utils';

/**
 * Search component
 */
class Search extends Base {
  /**
   * Component Configuration
   */
  static config = {
    name: 'Search',
    refs: [
      'searchbox',
      'searchboxInput',
      'searchboxResults',
      'suggest[]',
      'searchboxResultsItems[]',
      'searchboxContentInner',
    ],
  };

  /**
   * When the searchbox input is input
   * @param {*} event
   */
  onSearchboxInputInput(event) {
    const valeur = event.target.value;
    if (valeur.length >= 1) {
      addClass(this.$refs.searchboxResults, 'is-active');
      addClass(this.$refs.searchboxContentInner, '!overflow-hidden');
      // Tu peux déclencher ici une fonction ou un appel API, etc.
    } else {
      removeClass(this.$refs.searchboxResults, 'is-active');
      removeClass(this.$refs.searchboxContentInner, '!overflow-hidden');
    }

    this.$refs.searchboxResultsItems.forEach((item) => {
      const itemText = item.textContent;
      const searchText = valeur.trim();

      if (!searchText) {
        // Si la recherche est vide, on remet le texte original
        item.innerHTML = itemText;
        return;
      }

      const escapedSearch = searchText.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'gi');

      if (regex.test(itemText)) {
        const highlightedText = itemText.replace(
          regex,
          (match) => `<span class="font-normal">${match}</span>`,
        );
        item.innerHTML = highlightedText;
      } else {
        item.innerHTML = itemText;
      }
    });
  }
}
export default Search;
