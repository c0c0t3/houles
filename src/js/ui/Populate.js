import { Base } from '@studiometa/js-toolkit';

/**
 * @typedef {{
 *  $el: HTMLElement;
 *  $refs: {
 *    add: HTMLElement;
 *    target: HTMLElement;
 *    template: HTMLTemplateElement;
 *    remove: HTMLElement[];
 *  };
 *  $options: { limit: number; };
 * }} PopulateProps
 */

/**
 * Composant Populate
 * @augments {Base<PopulateProps>}
 */
export default class Populate extends Base {
  static config = {
    name: 'Populate',
    refs: ['add', 'target', 'template', 'remove[]'],
    options: {
      limit: {
        type: Number,
        default: -1,
      },
    },
  };

  /**
   * Méthode appelée lors du montage du composant
   * Vérifie que tous les éléments requis sont présents
   */
  mounted() {
    if (!this.$refs.add || !this.$refs.target || !this.$refs.template) {
      this.$destroy();
    }
  }

  /**
   * Getter retournant le nombre d'éléments actuellement dans le conteneur cible
   * @returns {number} Nombre d'éléments enfants dans le conteneur target
   */
  get length() {
    return this.$refs.target.children.length;
  }

  /**
   * Gestionnaire d'événement pour l'ajout d'un nouvel élément
   * Clone le template et l'ajoute au conteneur cible si la limite n'est pas atteinte
   */
  onAddClick() {
    if (this.$options.limit !== -1 && this.length >= this.$options.limit) {
      return;
    }

    this.$refs.target.append(this.$refs.template.content.cloneNode(true));
    this.$update();
  }

  /**
   * Gestionnaire d'événement pour la suppression d'un élément
   * @param {object} props Paramètres de l'événement
   * @param {number} props.index Index de l'élément à supprimer
   */
  onRemoveClick({ index }) {
    this.$refs.target.children[index].remove();
    this.$update();
  }
}
