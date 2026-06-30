import { Base } from '@studiometa/js-toolkit';
import { fetchCollection } from './configuratorApi.js';

class Syh extends Base {
  static config = {
    name: 'Syh',
  };

  async mounted() {
    console.log('[SYH] mounted');
    const data = await fetchCollection('auro-concept');
    console.log('[SYH] collection chargée', data);
  }
}

export default Syh;
