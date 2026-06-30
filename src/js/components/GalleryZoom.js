import { Base, withBreakpointObserver } from '@studiometa/js-toolkit';

/**
 * DriftZoom class
 */
export default class GalleryZoom extends withBreakpointObserver(Base) {
  isEnter = false;
  /**
   * Component Configuration
   */
  static config = {
    name: 'GalleryZoom',
    activeBreakpoints: ['l', 'xl', 'xxl', 'xxxl'],
    refs: ['projectImgContent', 'contentZoom', 'zoom', 'box'],
  };

  /**
   *
   */
  mounted() {
    this.zoomRect = this.$el.getBoundingClientRect();
  }

  /**
   *
   */
  onMousemove({ event }) {
    const zoomFactor = 2;
    let displayZoom = false;
    if (this.zoomRect) {
      if (
        event.clientX - this.zoomRect.x < 0 ||
        event.clientY + window.scrollY - this.zoomRect.y < 0 ||
        event.clientX - this.zoomRect.x > this.zoomRect.width ||
        event.clientY + window.scrollY - this.zoomRect.y > this.zoomRect.height
      ) {
        this.$refs.zoom.style.opacity = '0';
        this.$refs.zoom.style.visibility = 'hidden';
      } else {
        if (this.$refs.contentZoom.innerHTML !== this.$refs.projectImgContent.innerHTML) {
          this.$refs.contentZoom.innerHTML = this.$refs.projectImgContent.innerHTML;
        }
        displayZoom = true;
        this.$refs.zoom.style.opacity = '1';
        this.$refs.zoom.style.visibility = 'visible';
      }
      if (displayZoom) {
        this.$refs.box.style.left = `${event.clientX - this.zoomRect.x - 100}px`;
        this.$refs.box.style.top = `${event.clientY - this.zoomRect.y + window.scrollY - 110}px`;
        this.$refs.contentZoom.style.top = `${-Number.parseInt(this.$refs.box.style.top, 10) * zoomFactor - 110}px`;
        this.$refs.contentZoom.style.left = `${-Number.parseInt(this.$refs.box.style.left, 10) * zoomFactor - 100}px`;
        this.$refs.contentZoom.style.width = `${Number.parseInt(this.zoomRect.width, 10) * zoomFactor}px`;
        this.$refs.contentZoom.style.height = `${Number.parseInt(this.zoomRect.height, 10) * zoomFactor}px`;
      }
    }
  }
}
