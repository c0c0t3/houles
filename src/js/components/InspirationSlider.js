import { Base } from '@studiometa/js-toolkit';
import { toggleClass } from '@studiometa/js-toolkit/utils';
import Tooltip from './Tooltip.js';
import InspirationSlide from './InspirationSlide.js';
import Swiper from 'swiper';
import { Navigation, Thumbs, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';


class InspirationSlider extends Base {
  static config = { 
    name: 'InspirationSlider',
    refs: [
      'mainSlider',
    ],
    components: {
      InspirationSlide,
      Tooltip,
    },
  };

  slider = null;
  thumbs = null;
  

mounted() {
  this.initPool();           // pool rempli une fois
  this.injectSlidesAll();    // injecter toutes les slides au départ
  this.initSliders();        // init Swiper avec toutes les slides

  this.scheduleToolkitUpdate();

  // écouter filtre Isotope
  window.addEventListener('inspiration:filter', this.onFilterChange.bind(this));
  
}
/**
 * Copie les slides de pool vers les 2 swiper-wrapper
 * @returns 
 */
injectSlidesAll() {
  const pool = document.querySelector('.swiper-slide-pool');
  if (!pool) return;

  const mainWrapper = this.$el.querySelector('.main-slider .swiper-wrapper');
  const thumbsWrapper = this.$el.querySelector('.thumbs-slider .swiper-wrapper');

  mainWrapper.innerHTML = '';
  thumbsWrapper.innerHTML = '';

  // injecte toutes les slides du pool (clone)
[...pool.children].forEach(slide => {
  if (slide.classList.contains('main-slide')) {
    const clone = slide.cloneNode(true);
    clone.querySelectorAll('img').forEach(img => {
      if (img.dataset.src) img.src = img.dataset.src;
    });
    mainWrapper.appendChild(clone);
  }

  if (slide.classList.contains('thumb-slide')) {
    const clone = slide.cloneNode(true);
    clone.querySelectorAll('img').forEach(img => {
      if (img.dataset.src) img.src = img.dataset.src;
    });
    thumbsWrapper.appendChild(clone);
  }
});


  // console.log('Wrappers initialisés au load:', mainWrapper.children.length, thumbsWrapper.children.length);
}


  // =====================
  // Pool slides ... Copie toutes les slides du DOM avant toute action JS
  // =====================
  initPool() {
    const pool = document.querySelector('.swiper-slide-pool');
    if (!pool) return;

    document.querySelectorAll('.main-slide, .thumb-slide').forEach(slide => {
      pool.appendChild(slide);
    });

    // console.log('Pool initialisé:', pool.children.length);
  }

updateRaf = 0;
updateCount = 0;

scheduleToolkitUpdate(reason = 'unknown') {
  this.updateCount += 1;

  console.log(
    `%c[scheduleToolkitUpdate] #${this.updateCount} | reason: ${reason}`,
    'color: #7c3aed; font-weight: bold;',
  );

  cancelAnimationFrame(this.updateRaf);

  this.updateRaf = requestAnimationFrame(() => {
    /*
    console.log(
      `%c[$update call] #${this.updateCount} | root:`,
      'color: #16a34a; font-weight: bold;',
      this.$root
    );
    */

    if (this.$root && typeof this.$root.$update === 'function') {
      this.$root.$update();
      // console.log('%c[$update DONE]', 'color:#16a34a;font-weight:bold;');
    } else {
      // console.warn('⚠️ this.$root.$update introuvable !');
    }
  });
}


  // =====================
  // Filtre Isotope : au click sur un filtre isotope, on detruit le slider, injection des slides allowed, init swiper
  // =====================
  onFilterChange(event) {

    const allowedIds = event.detail.items.map(el => el.dataset.id);
    // console.log('onFilterChange allowedIds:', allowedIds);

    this.destroySliders();
    this.injectSlides(allowedIds);

    // ✅ Remonte les components Meta sur les clones
    this.scheduleToolkitUpdate();
    this.initSliders();
  }

  // =====================
  // Inject slides filtrées (clone depuis pool)
  // =====================
  injectSlides(allowedIds) {
    const pool = document.querySelector('.swiper-slide-pool');
    if (!pool) return;

    const mainWrapper = this.$el.querySelector('.main-slider .swiper-wrapper');
    const thumbsWrapper = this.$el.querySelector('.thumbs-slider .swiper-wrapper');

    // vider uniquement les wrappers
    mainWrapper.innerHTML = '';
    thumbsWrapper.innerHTML = '';

    allowedIds.forEach(id => {
      const main = [...pool.children].find(
        s => s.dataset.id === id && s.classList.contains('main-slide')
      );
      const thumb = [...pool.children].find(
        s => s.dataset.id === id && s.classList.contains('thumb-slide')
      );

      if (main) mainWrapper.appendChild(main.cloneNode(true));
      if (thumb) thumbsWrapper.appendChild(thumb.cloneNode(true));
    });

    // console.log('Wrappers après injection:', mainWrapper.children.length, thumbsWrapper.children.length);
  }

  // =====================
  // Destroy sliders
  // =====================
  destroySliders() {
    // console.log('destroySliders')
    if (this.slider) {
      this.slider.destroy(true, true);
      this.slider = null;
    }
    if (this.thumbs) {
      this.thumbs.destroy(true, true);
      this.thumbs = null;
    }
  }

  // =====================
  // Init sliders
  // =====================
  initSliders() {
    // console.log('initSliders')
let thumbsPerViews = 4;

switch (true) {
  case window.innerWidth >= 1440: thumbsPerViews = 18; break;
  case window.innerWidth >= 1280: thumbsPerViews = 12; break;
  case window.innerWidth >= 768: thumbsPerViews = 8; break;
  default: thumbsPerViews = 4;
}

// Initialiser les thumbs d'abord
this.thumbs = new Swiper(this.$el.querySelector('.thumbs-slider'), {
  slidesPerView: 'auto',
  spaceBetween: 8,
  centeredSlides: true,
  // loop: true,
  slideToClickedSlide: true,
  watchSlidesProgress: true,
  speed: 300,
  on: {
    // Déclenché à la fin du touch/drag
    touchEnd: (swiper) => {
      console.log('touchEnd', swiper.activeIndex);
      if (this.slider) {
        this.slider.slideToLoop(swiper.activeIndex);
      }
    },
    // OU utiliser transitionEnd
    transitionEnd: (swiper) => {
      console.log('transitionEnd', swiper.activeIndex);
      if (this.slider) {
        this.slider.slideToLoop(swiper.activeIndex);
      }
    }
  }
});

// Puis le slider principal
this.slider = new Swiper(this.$el.querySelector('.main-slider'), {
  modules: [Navigation, Thumbs, EffectFade],
  effect: 'fade',
  fadeEffect: {
    crossFade: true
  },
  slidesPerView: 1,
  loop: true,
  watchSlidesProgress: true,
  speed: 300,
  navigation: {
    nextEl: '.main-swiper-button-next',
    prevEl: '.main-swiper-button-prev'
  },
  thumbs: { 
    swiper: this.thumbs,
    slideThumbActiveClass: 'thumb-active'
  },
  on: {
    slideChange: (swiper) => {
      if (!this.thumbs) return;

      // index réel (sans les clones)
      const realIndex = swiper.realIndex;

      // on force le thumbs swiper à s'aligner
      this.thumbs.slideToLoop(realIndex);
    }
  }
});
    
  

  }

// updateComponents() {
//   setTimeout(() => {
//     console.log(this.$root)
//     if (this.$root) {
//       this.$root.$update();
//     }
//   }, 0);
// }

  // =====================
  // Panel open (ouvre la bonne slide filtrée)
  // =====================
    onPanelOpen(event) {
      const trigger = event.detail?.trigger;
      if (!trigger || !this.slider || !this.thumbs) return;

      const slideId = trigger.dataset.id || trigger.dataset.slideIndex; // ID unique
      if (!slideId) return;

      const mainWrapper = this.$el.querySelector('.main-slider .swiper-wrapper');

      // trouver l'index réel dans le wrapper filtré
      const realIndex = [...mainWrapper.children].findIndex(
          slide => slide.dataset.id === slideId
      );

      if (realIndex === -1) {
          // console.warn('Slide non trouvée dans le wrapper filtré:', slideId);
          return;
      }

      //   console.log('panelOpen slideId:', slideId, 'realIndex:', realIndex);

      this.slider.slideTo(realIndex, 0, false);
      this.thumbs.slideTo(realIndex, 0, false);
    }

    goToFilteredIndex() {
      // élément cliqué (img)
      // On recupere le data-filtered-index si il existe, sinon on prends le data-id
      let index;

      const gridItem = event.currentTarget.parentNode.dataset.filteredIndex;

      if (gridItem) {
          index = gridItem;
      } else {
          const realIndex = event.currentTarget.parentNode.dataset.id;
          index = realIndex - 1;
      }
      this.slider.slideTo(index, 0, false);
      this.thumbs.slideTo(index, 0, false);
    }


  destroyed() {
    this.destroySliders();
  }
}

export default InspirationSlider;
