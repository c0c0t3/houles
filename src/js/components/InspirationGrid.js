import { Base } from '@studiometa/js-toolkit';
import Isotope from 'isotope-layout';

class InspirationGrid extends Base {
  static config = {
    name: 'InspirationGrid',
    refs: [
      'InspirationGridItem[]',
      'filterBtn[]',
      'sortBtn[]',
      'TheGrid'
    ],
  };

  isotope = null;

  mounted() {
    this.loadImagesAndInit();
    this.clickFilters();
  }

  async loadImagesAndInit() {
    const images = this.$el.querySelectorAll('img');
    
    const imagePromises = Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.complete && img.naturalHeight !== 0) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });
    });

    await Promise.all(imagePromises);
    this.initIsotope();
  }

  initIsotope() {
    console.log(this.$refs);
    this.isotope = new Isotope(this.$refs.theGrid, {
      itemSelector: '[data-ref="InspirationGridItem[]"]',
      layoutMode: 'masonry',
      percentPosition:true,
      
      masonry: {
        // columnWidth: 25,
        gutter: 8
      },
    //   percentPosition: true,
      transitionDuration: '0.4s',
      getSortData: {
        name: '[data-name]',
        price: function(itemElem) {
          const price = itemElem.getAttribute('data-price');
          return price ? parseFloat(price) : 0;
        }
      }
    });
    console.log(this.isotope)




  }

  onSortBtnClick(event) {
    const sortValue = event.target.dataset.sort;
    
    this.$refs.sortBtn.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    this.isotope.arrange({ sortBy: sortValue });
  }

  destroyed() {
    if (this.isotope) {
      this.isotope.destroy();
    }
  }


  clickFilters() {
    const filterButtons = document.querySelectorAll('[data-filter]')

    filterButtons.forEach((filterButton) => {
      filterButton.addEventListener("click", (event) => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const filter = target.closest('[data-filter]');
        if (!filter) return;

        const filterValue = filter.getAttribute('data-filter');
        console.log(filterValue);


        this.$refs.filterBtn.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        this.isotope.arrange({ filter: filterValue });

        this.isotope.once('arrangeComplete', items => {
          const visibleItems = items.filter(item => !item.isHidden);

          // On enleve les data-filtered-index a tous les items de la grille
          this.$refs.inspirationGridItem.forEach(gridItem => gridItem.removeAttribute('data-filtered-index'));

          // A chaque element visible on ajoute un data-filtered-index pour que inspirationSlider.js le recupere via goToFilteredIndex()
          // Cela permet d'ouvrir le slider depuis l'item clique de la grille.
          visibleItems.forEach((visibleItem, index) => {
            visibleItem.element.dataset.filteredIndex = index;
          });

          /*
          console.log(
            'filtered order:',
            visibleItems.map(i => ({
              id: i.element.dataset.id,
              filteredIndex: i.element.dataset.filteredIndex,
            }))
          );
          */

          // On dispatach un event inspiration:filter qui permet de lancer onFilterChange() depuis un bind !
          window.dispatchEvent(
            new CustomEvent('inspiration:filter', {
              detail: {
                items: visibleItems.map(i => i.element),
              },
            })
          );
        });
      });
    })

  }


}

export default InspirationGrid;