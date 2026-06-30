import { Menu as MenuCore, MenuBtn, Transition } from '@studiometa/ui';

/**
 * Menu
 */
export default class Menu extends MenuCore {
  static config = {
    ...MenuCore.config,
    emits: ['open', 'close'],
    components: {
      Menu,
      MenuBtn,
      Transition,
    },
  };
}
