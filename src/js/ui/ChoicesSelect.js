import 'choices.js/public/assets/styles/choices.css';
import Choices from 'choices.js';

import { Base } from '@studiometa/js-toolkit';

/**
 *
 */
class ChoicesSelect extends Base {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'ChoicesSelect',
  };

  /**
   * When Element is mounted, instances a new Choices.js instance.
   */
  mounted() {
    const searchEnabled = this.$el.dataset.search !== 'false';

    // Récupération des <option> existants
    const options = Array.from(this.$el.options).map((opt) => ({
      value: opt.value,
      label: opt.dataset.customHtml || opt.text,
      selected: opt.selected,
    }));

    // 💥 Supprimer les options existantes AVANT init
    this.$el.innerHTML = '';

    // Initialiser Choices sur <select vide>
    this.choicesInstance = new Choices(this.$el, {
      allowHTML: true,
      searchEnabled,
      itemSelectText: '',
      shouldSort: false,
    });

    // Injecter les options correctement
    this.choicesInstance.setChoices(options, 'value', 'label', false);

    // 🎯 Écouter l'événement "choice"
    this.$el.addEventListener('choice', (event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;
      const choice = event.detail;

      console.log('Choix sélectionné:', choice.value, choice.label);

      // Exemple : Si l'utilisateur choisit "IT", on ajoute un nouvel élément new/New Choices
      if (choice.value === 'IT') {
        this.choicesInstance.setChoices(
          [
            {
              value: 'it-clicked',
              label: 'Nouvel élément ajouté dynamiquement si IT est sélectionné',
              selected: true,
            },
          ],
          'value',
          'label',
          false,
        );
      }
    });
  }
}

export default ChoicesSelect;
