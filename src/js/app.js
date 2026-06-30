import { Base, createApp } from '@studiometa/js-toolkit';
import { Action, Figure, FigureVideo, Tabs, Menu } from '@studiometa/ui';
import ChoicesSelect from './ui/ChoicesSelect.js';
import Slider from './components/Slider/Slider.js';
import Modal from './components/Modal.js';
import BlocSurMesure from './components/BlocSurMesure.js';
import NavigableSections from './components/NavigableSections.js';
import ScrollableNavigation from './components/ScrollableNavigation.js';
import Header from './header/header.js';
import AccordionItem from './ui/Accordion/AccordionItem.js';
import Facets from './components/facets.js';
import RangeInputSlider from './ui/RangeInputSlider.js';
import Tooltip from './components/Tooltip.js';
import VariantPicker from './components/VariantPicker.js';
import ProductStickyBar from './components/ProductStickyBar.js';
import PasswordValidation from './ui/PasswordValidation.js';
import Password from './ui/Password.js';
import Populate from './ui/Populate.js';
import Phone from './ui/Phone.js';
import Cart from './components/Cart.js';
import StoreLocator from './components/StoreLocator.js';
import SVPListModal from './components/SVPListModal.js';
import 'simplebar';
import 'simplebar/dist/simplebar.min.css';
import Panel from './components/Panel.js';
import GalleryZoom from './components/GalleryZoom.js';
import InspirationGrid from './components/InspirationGrid.js';
import InspirationSlider from './components/InspirationSlider.js';
import InspirationSlide from './components/InspirationSlide.js';
import Syh from './syh/syh.js';

globalThis.$root = null;

/**
 * App
 */
class App extends Base {
  /**
   * Config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'App',
    components: {
      ChoicesSelect,
      Action,
      Slider,
      Figure,
      FigureVideo,
      BlocSurMesure,
      Tabs,
      Menu,
      NavigableSections,
      ScrollableNavigation,
      Header,
      AccordionItem,
      Facets,
      RangeInputSlider,
      Modal,
      Panel,
      Tooltip,
      GalleryZoom,
      VariantPicker,
      ProductStickyBar,
      PasswordValidation,
      Password,
      Populate,
      Phone,
      Cart,
      StoreLocator,
      SVPListModal,
      InspirationGrid,
      InspirationSlide,
      InspirationSlider,
      Syh
    },
  };

  /**
   * Mounted hook.
   */
  mounted() {
    globalThis.$root = this;
    console.log('kaboom')
  }
}

export default createApp(App);
