import { Base, useResize } from '@studiometa/js-toolkit';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
const { props } = useResize();
/**
 * Component component.
 * @augments {Base<ComponentProps>}
 */
export default class StoreLocator extends Base {
  map = null;
  retailers = [];
  isLoaded = false;

  /**
   * Class config.
   * @type {import('@studiometa/js-toolkit').BaseConfig}
   */
  static config = {
    name: 'StoreLocator',
    refs: [
      'container',
      'StoreLocatorNav',
      'distributors[]',
      'DistributorsList[]',
      'b2c',
      'b2b',
      'geolocation',
      'back',
    ],
    options: {
      lat: {
        type: Number,
        default: 46.232192999999995,
      },
      lng: {
        type: Number,
        default: 2.209666999999996,
      },
      accessToken: {
        type: String,
        default:
          'pk.eyJ1IjoiYWdlbmNlc3R1ZGlvbWV0YSIsImEiOiJjbTZxZm8zMDQwNzQ3MmlxemczOWVobGM3In0.GjiF2BZC_ewkWHZXIjX4ZQ',
      },
      language: {
        type: String,
        default: 'fr',
      },
      geocoderPlaceholder: {
        type: String,
        default: '',
      },
    },
  };

  /**
   * Check if the screen is desktop
   * @returns {boolean}
   */
  static get isDesktop() {
    return ['m', 'l', 'xl', 'xxl'].includes(props().breakpoint);
  }

  /**
   * Get the padding for the map
   * @returns {object}
   */
  paddingMap() {
    if (StoreLocator.isDesktop) {
      return {
        left: 50,
        right: window.innerWidth / 2 + 100,
        top: 130,
        bottom: 0,
      };
    } else {
      return {
        left: 50,
        right: 50,
        top: 50,
        bottom: 50,
      };
    }
  }

  /**
   * Mounted Component
   */
  mounted() {
    this.initMap();
  }

  /**
   * Add custom markers
   */
  addImages() {
    const map = this.$parent.map || this.map;

    if (!map.hasImage('marker-A')) {
      map.loadImage(this.$el.dataset.pinRetailer, (error, image) => {
        if (error) throw error;
        map.addImage('marker-A', image);
      });
    }

    if (!map.hasImage('marker-B')) {
      map.loadImage(this.$el.dataset.pinStore, (error, image) => {
        if (error) throw error;
        map.addImage('marker-B', image);
      });
    }
  }

  /**
   * Initialize the map and call functions
   */
  initMap() {
    this.mapbox = mapboxgl;
    mapboxgl.accessToken = this.$options.accessToken;

    this.map = new this.mapbox.Map({
      container: 'map',
      center: [this.$options.lng, this.$options.lat],
      style: 'mapbox://styles/agencestudiometa/cm8o9fc30003501sb7rp485bc',
      zoom: 10,
      cooperativeGestures: true,
    });

    this.map.on('load', () => {
      this.addImages();
      this.displayMarkers('b2b');
      this.setGeoLocation();
      this.setGeoCoder();
    });

    this.setNav();
    this.disableInteraction();
  }

  /**
   * Disable interaction on the map
   */
  disableInteraction() {
    this.map.boxZoom.enable();
    this.map.dragRotate.enable();
    this.map.dragPan.enable();
    this.map.keyboard.enable();
    this.map.doubleClickZoom.enable();
    this.map.touchZoomRotate.enable();
  }

  /**
   * Display markers on the map and control the interaction
   * @param {string} ref The reference to the list of distributors, aka b2c or b2b with data-ref="StoreLocator.b2c" or data-ref="StoreLocator.b2b"
   */
  displayMarkers(ref) {
    // 1. Préparer les données GeoJSON
    const features = [];
    const distributors = this.$refs[ref].querySelectorAll('.distributor-card');

    distributors.forEach((distributor) => {
      const lng = Number.parseFloat(distributor.dataset.lng);
      const lat = Number.parseFloat(distributor.dataset.lat);
      const nom = distributor.dataset.nom;
      const type = distributor.dataset.type;
      const address = distributor.querySelector('address').innerHTML;

      // Vérifie que lng et lat sont valides
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        features.push({
          type: 'Feature',
          properties: { nom, type, address },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        });
      }
    });

    // 2. Ajouter la source avec clustering
    if (this.map.getSource('distributors')) {
      this.map.removeLayer('clusters');
      this.map.removeLayer('cluster-count');
      this.map.removeLayer('unclustered-point');
      this.map.removeSource('distributors');
    }

    // 2. Ajouter la source avec clustering
    this.map.addSource('distributors', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
      cluster: true,
      clusterMaxZoom: 14, // max zoom pour clustériser
      clusterRadius: 50, // taille des clusters
    });

    // 3. Couches
    // 3a. Clusters
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'distributors',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#533B3B',
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // 3b. Nombre de points dans le cluster
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'distributors',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#fff',
      },
    });

    // 3c. Points non clusterisés
    this.map.addLayer({
      id: 'unclustered-point',
      type: 'symbol',
      source: 'distributors',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['case', ['==', ['get', 'type'], 'showroom'], 'marker-A', 'marker-B'],
        'icon-size': 1, // ajuste la taille selon tes images
        'icon-allow-overlap': true,
        'icon-anchor': 'bottom',
      },
    });

    // 4. Optional: click to zoom on cluster

    this.map.on('click', 'clusters', (e) => {
      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });

      const clusterId = features[0].properties.cluster_id;
      const source = this.map.getSource('distributors');

      source.getClusterLeaves(clusterId, 1000, 0, (err, leaves) => {
        if (err) return;

        const bounds = new mapboxgl.LngLatBounds();

        leaves.forEach((leaf) => {
          bounds.extend(leaf.geometry.coordinates);
        });

        this.map.fitBounds(bounds, {
          padding: this.paddingMap(),
          duration: 1000,
        });
      });
    });

    this.map.on('click', 'unclustered-point', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const { nom } = e.features[0].properties;
      const address = e.features[0].properties.address;
      const lng = coordinates[0];
      const lat = coordinates[1];
      this.openPopup(coordinates[0], coordinates[1], nom, address);

      // this.onDistributorsClick(e);
      // Active the back button
      this.$refs.back.classList.add('is-active');

      // Open popup for this distributor
      this.openPopup(lng, lat, nom, address);
    });

    // 5. Fit la carte à tous les points
    const bounds = new mapboxgl.LngLatBounds();

    features.forEach((f) => {
      if (f.geometry && f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
        bounds.extend(f.geometry.coordinates);
      }
    });

    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds, {
        padding: this.paddingMap(),
      });
    }

    // Sauvegarde les bounds des points de vente pour pouvoir les récupérer plus tard
    this.distributorBounds = bounds;
  }

  /**
   * Close any open popups on the map
   */
  closePopup() {
    const popups = document.querySelectorAll('.mapboxgl-popup');
    popups.forEach((popup) => {
      popup.remove();
    });
  }

  /**
   * Open a popup for a distributor
   * @param {number} lng Longitude
   * @param {number} lat Latitude
   * @param {string} nom Distributor name
   * @param {string} address Distributor address
   */
  openPopup(lng, lat, nom, address) {
    this.closePopup();
    new mapboxgl.Popup()
      .setLngLat([lng, lat])
      .setHTML(`<strong class="text-sm uppercase font-medium">${nom}</strong><br>${address}`)
      .addTo(this.map);
  }

  /**
   * On click on a distributor
   * @param {*} event
   */
  onDistributorsClick(event) {
    console.log(event);

    const lat = Number.parseFloat(event.target.dataset.lat);
    const lng = Number.parseFloat(event.target.dataset.lng);
    const nom = event.target.dataset.nom;
    const address = event.target.querySelector('address').innerHTML;

    console.log(address);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    this.map.flyTo({
      center: [lng, lat],
      zoom: 14,
      padding: this.paddingMap(),
    });

    // Remove the background color from the distributor card
    if (Array.isArray(this.$refs.distributors)) {
      this.$refs.distributors.forEach((el) => {
        if (el.classList.contains('bg-sand-darker/50')) {
          el.classList.remove('bg-sand-darker/50');
        }
      });
    }

    // Add the background color to the distributor card
    event.target.classList.add('bg-sand-darker/50');

    // Active the back button
    this.$refs.back.classList.add('is-active');

    // Open popup for this distributor
    this.openPopup(lng, lat, nom, address);
  }

  /**
   * On click on the back button
   */
  onBackClick() {
    if (this.distributorBounds && !this.distributorBounds.isEmpty()) {
      // Fit the map to the distributor bounds
      this.map.fitBounds(this.distributorBounds, {
        padding: this.paddingMap(),
        duration: 1000,
      });

      // Close all the popups
      const popups = document.querySelectorAll('.mapboxgl-popup');
      popups.forEach((popup) => {
        popup.remove();
      });

      // Unactive the back button
      this.$refs.back.classList.remove('is-active');

      // Remove the background color from the distributor card
      if (Array.isArray(this.$refs.distributors)) {
        this.$refs.distributors.forEach((el) => {
          if (el.classList.contains('bg-sand-darker/50')) {
            el.classList.remove('bg-sand-darker/50');
          }
        });
      }
    }
  }

  /**
   * Set the geolocation control
   */
  setGeoLocation() {
    this.geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
    });

    this.geolocate.on('geolocate', (e) => {
      const lng = e.coords.longitude;
      const lat = e.coords.latitude;
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.$options.accessToken}&language=fr&limit=1`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.features.length > 0) {
            const address = data.features[0].place_name;
            this.geocoder.setInput(address);
          }
        });
    });
    this.map.addControl(this.geolocate, 'bottom-left');
  }

  /**
   *
   */
  setGeoCoder() {
    this.geocoder = new MapboxGeocoder({
      accessToken: this.$options.accessToken,
      mapboxgl: this.mapbox,
      marker: false,
      language: this.$options.language,
      placeholder: this.$options.geocoderPlaceholder,
      flyTo: {
        maxZoom: 12,
      },
    });

    this.geocoder.on('result', () => {
      this.$refs.back.classList.add('is-active');
    });

    document.querySelector('#geocoder').append(this.geocoder.onAdd(this.map));
  }

  /**
   *
   */
  setNav() {
    const nav = new mapboxgl.NavigationControl({
      showCompass: false,
    });

    this.map.addControl(nav, 'bottom-left');
  }

  /**
   * Click on geolocation button
   */
  onGeolocationClick() {
    console.log('onGeolocationClick');
    this.geolocate.trigger();
    this.$refs.back.classList.add('is-active');
  }
}
