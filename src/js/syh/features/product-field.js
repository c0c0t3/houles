import { Base } from '@studiometa/js-toolkit';
import { isVisible, resolveLabel } from './show-if.js';

export default class ProductField extends Base {
  static config = {
    name: 'ProductField',
    refs: ['label', 'cards'],
    emits: ['changed'],
  };

  _field = null;
  _selection = null;
  _coloris = [];
  _selectedRefBase = null;
  _cardColoris = new Map(); // refBase → coloris sélectionné sur cette carte

  mounted() {
    try {
      this._field = this.$el._syhField ?? null;
      this._selection = this.$el._syhSelection ?? {};
      this._coloris = this.$el._syhColoris ?? [];
      if (!this._field) return;
      this.$refs.label.textContent = resolveLabel(this._field, this._selection);
      this._render();
      // Ne pas émettre si le champ est masqué (showIf non satisfait) :
      // évite de polluer selection.produits avec des valeurs hors config courante.
      if (!this.$el.hidden) this._emitChange();
    } catch (err) {
      console.error('[ProductField] mounted ERROR:', this._field?.id, err);
    }
  }

  refresh(selection) {
    if (!this._field) return;
    this._selection = selection;
    this.$refs.label.textContent = resolveLabel(this._field, this._selection);
    const prev = this._selectedRefBase;
    this._render();
    if (this._selectedRefBase !== prev) this._emitChange();
  }

  /**
   * Réaligne le coloris de TOUTES les options de ce champ sur le coloris global choisi à
   * l'étape 1 — pas seulement l'option actuellement sélectionnée : une option masquée aujourd'hui
   * (showIf non satisfait) peut redevenir le défaut plus tard (ex : après un changement de
   * diamètre qui invalide la sélection courante), elle doit donc déjà porter le bon coloris en
   * cache. Les options qui n'ont pas cette variante gardent leur coloris actuel (pas de fallback
   * ici — volontaire, voir docs/module-5-etapes-intermediaires.md).
   * Appelé par le Configurator à chaque changement du champ `coloris` global.
   *
   * @param {string} coloris - Id du coloris global sélectionné.
   */
  applyGlobalColoris(coloris) {
    let selectedChanged = false;
    for (const option of this._field?.options ?? []) {
      if (!option.variants?.[coloris]) continue;
      this._cardColoris.set(option.refBase, coloris);
      if (option.refBase === this._selectedRefBase) selectedChanged = true;
    }
    this._render();
    if (selectedChanged) this._emitChange();
  }

  // -------------------------------------------------------------------------
  // Rendu — reconstruit toutes les cartes visibles, n'émet jamais
  // -------------------------------------------------------------------------

  _render() {
    const { options = [] } = this._field;
    const effectiveSel = this._effectiveSelection();
    const visible = options.filter((o) => isVisible(o, effectiveSel));
    const container = this.$refs.cards;
    container.innerHTML = '';

    if (!visible.length) {
      this.$refs.label.style.display = 'none';
      this._selectedRefBase = null;
      return;
    }

    this.$refs.label.style.display = '';

    // Sélection par défaut ou fallback si le produit actuel n'est plus visible
    if (!this._selectedRefBase || !visible.find((o) => o.refBase === this._selectedRefBase)) {
      this._selectedRefBase = visible[0].refBase;
    }

    for (const option of visible) {
      const coloris = this._resolveColoris(option);
      container.appendChild(this._buildCard(option, coloris));
    }
  }

  // Sélection effective : remplace diametre par la part avant/arriere si diametreFrom est déclaré.
  _effectiveSelection() {
    const { diametreFrom } = this._field;
    if (!diametreFrom || !String(this._selection.diametre ?? '').includes('+')) {
      return this._selection;
    }
    const [arriere, avant] = String(this._selection.diametre).split('+');
    return { ...this._selection, diametre: diametreFrom === 'avant' ? avant : arriere };
  }

  // Coloris mémorisé sur cette carte, sinon coloris global, sinon premier dispo
  _resolveColoris(option) {
    const cached = this._cardColoris.get(option.refBase);
    if (cached && option.variants?.[cached]) return cached;

    if (!option.variants) return null;
    const globalColoris = String(this._selection.coloris ?? '');
    const coloris = option.variants[globalColoris]
      ? globalColoris
      : Object.keys(option.variants)[0];
    this._cardColoris.set(option.refBase, coloris);
    return coloris;
  }

  // -------------------------------------------------------------------------
  // Construction d'une carte
  // -------------------------------------------------------------------------

  _buildCard(option, coloris) {
    if (option.isNone) return this._buildNoneCard(option);
    const card = this._cloneCardTemplate();
    const variant = option.variants?.[coloris] ?? null;

    const radio = card.querySelector('input[type="radio"]');
    radio.name = this._field.id;
    radio.dataset.product = option.refBase;
    radio.checked = option.refBase === this._selectedRefBase;

    const img = card.querySelector('[data-ref="productImage"]');
    if (variant?.image) { img.src = variant.image; img.alt = option.label; }

    card.querySelector('[data-ref="productName"]').textContent = option.label;
    card.querySelector('[data-ref="productRef"]').textContent = variant?.id ?? option.refBase;

    card.querySelector('[data-ref="productPrice"]').textContent =
      variant?.prix != null
        ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(variant.prix)
        : '—';

    card.querySelector('[data-ref="productQty"]').textContent = this._computeQty(option) ?? '—';

    this._fillStock(card.querySelector('[data-ref="productStock"]'), variant?.stock ?? null);
    this._fillSwatches(card.querySelector('[data-ref="colorSwatches"]'), option, coloris);

    return card;
  }

  // `variantType` (par option, JSON) choisit la source du visuel de chaque pastille coloris :
  // "image" (défaut) = photo du produit dans cette couleur (option.variants[coloris].image) ;
  // "coloris" = vignette générique de la couleur (collection.coloris[].image), indépendante du
  // produit — utile quand les photos produit par coloris ne sont pas toutes disponibles.
  _fillSwatches(container, option, activeColoris) {
    if (!container || !option.variants) return;
    container.innerHTML = '';
    const useColorisImage = option.variantType === 'coloris';
    for (const colorisId of Object.keys(option.variants)) {
      const btn = this._cloneSwatchTemplate();
      if (!btn) continue;
      const info = this._coloris.find((c) => String(c.id) === String(colorisId));
      btn.dataset.coloris = colorisId;
      btn.dataset.product = option.refBase;
      btn.title = info?.label ?? colorisId;
      btn.classList.toggle('is-active', colorisId === activeColoris);
      const swatchImage = useColorisImage ? info?.image : option.variants[colorisId]?.image;
      if (swatchImage) { btn.style.backgroundImage = `url(${swatchImage})`; btn.style.backgroundSize = 'cover'; }
      container.appendChild(btn);
    }
  }

  _fillStock(el, stock) {
    if (!el) return;
    el.className = 'text-xs';
    if (stock === null || stock === undefined) { el.textContent = ''; return; }
    if (stock === 0) { el.textContent = 'Rupture de stock'; el.className += ' text-red-500'; }
    else if (stock < 5) { el.textContent = `${stock} restant${stock > 1 ? 's' : ''}`; el.className += ' text-orange-500'; }
    else { el.textContent = 'En stock'; el.className += ' text-green-600'; }
  }

  _computeQty(option) {
    const { quantity } = this._field;
    if (!quantity) return null;

    if (quantity.mode === 'fixed') {
      return Math.ceil(quantity.value / (option.qtyParUnite ?? 1));
    }

    // ceil(longueur / tubeLength) — chaque option tube expose sa longueur via tubeLength.
    if (quantity.mode === 'segmented') {
      const longueur = Number(this._selection.longueur);
      const tubeLength = option.tubeLength;
      if (!longueur || !tubeLength) return null;
      return Math.ceil(longueur / tubeLength);
    }

    // Injectée par Configurator._refreshTubeStep() avant chaque refresh().
    if (quantity.mode === 'segmented_minus_1') {
      return this._field._segmentQty ?? null;
    }

    // ceil(longueur / interval) + extra, divisé par le conditionnement (packs de N).
    if (quantity.mode === 'per_interval') {
      const longueur = Number(this._selection.longueur);
      if (!longueur || !quantity.interval) return null;
      const raw = Math.ceil(longueur / quantity.interval) + (quantity.extra ?? 0);
      return Math.ceil(raw / (option.qtyParUnite ?? 1));
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Événements
  // -------------------------------------------------------------------------

  // Sélection d'un produit via le radio
  onCardsChange({ event }) {
    const radio = event.target.closest('input[type="radio"]');
    if (!radio) return;
    this._selectedRefBase = radio.dataset.product;
    this._emitChange();
  }

  // Clic sur un swatch — change le coloris de la carte concernée uniquement
  // Le clic sur un <button> dans un <label> ne déclenche pas le radio, pas besoin de stopPropagation
  onCardsClick({ event }) {
    const btn = event.target.closest('[data-coloris]');
    if (!btn) return;

    const refBase = btn.dataset.product;
    const colorisId = btn.dataset.coloris;
    if (!refBase || !colorisId) return;

    this._cardColoris.set(refBase, colorisId);

    const option = this._field.options.find((o) => o.refBase === refBase);
    if (!option) return;

    // Mise à jour partielle de la carte (image, ref, prix, stock, swatches)
    const card = btn.closest('label');
    const variant = option.variants?.[colorisId];
    if (variant?.image) card.querySelector('[data-ref="productImage"]').src = variant.image;
    card.querySelector('[data-ref="productRef"]').textContent = variant?.id ?? refBase;
    if (variant?.prix != null) {
      card.querySelector('[data-ref="productPrice"]').textContent =
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(variant.prix);
    }
    this._fillStock(card.querySelector('[data-ref="productStock"]'), variant?.stock ?? null);
    this._fillSwatches(card.querySelector('[data-ref="colorSwatches"]'), option, colorisId);

    if (refBase === this._selectedRefBase) this._emitChange();
  }

  // -------------------------------------------------------------------------
  // Carte "aucune option" (isNone)
  // -------------------------------------------------------------------------

  // Construit une carte grisée sans image/prix/coloris pour l'option "sans X".
  _buildNoneCard(option) {
    const card = this._cloneCardTemplate();

    const radio = card.querySelector('input[type="radio"]');
    radio.name = this._field.id;
    radio.dataset.product = option.refBase;
    radio.checked = option.refBase === this._selectedRefBase;

    // Style grisé : remplace l'anneau coloré par un anneau neutre.
    card.className = card.className
      .replace('ring-purple/20', 'ring-gray-200')
      .replace('has-[:checked]:ring-purple/80', 'has-[:checked]:ring-gray-400');
    card.classList.add('opacity-60');

    card.querySelector('[data-ref="productName"]').textContent = option.label;

    // Masque tous les éléments qui n'ont pas de sens pour une option "sans".
    const toHide = ['[class*="aspect-square"]', '[data-ref="productRef"]',
                    '[data-ref="productPrice"]', '[data-ref="productQty"]',
                    '[data-ref="productStock"]', '[data-ref="colorSwatches"]',
                    '.text-gray-400']; // le séparateur "×"
    toHide.forEach((sel) => {
      card.querySelectorAll(sel).forEach((el) => { el.hidden = true; });
    });

    return card;
  }

  _emitChange() {
    if (!this._field || !this._selectedRefBase) return;
    // Option "sans X" : signal au configurateur de supprimer ce champ de selection.produits.
    const selectedOption = this._field.options?.find((o) => o.refBase === this._selectedRefBase);
    if (selectedOption?.isNone) {
      this.$emit('changed', { fieldId: this._field.id, value: { refBase: null, coloris: null } });
      return;
    }
    this.$emit('changed', {
      fieldId: this._field.id,
      value: {
        refBase: this._selectedRefBase,
        coloris: this._cardColoris.get(this._selectedRefBase) ?? null,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Clonage des templates
  // -------------------------------------------------------------------------

  _cloneCardTemplate() {
    const tpl = this.$el.querySelector('[data-template="product-card"]');
    if (!tpl) { console.warn('[ProductField] template "product-card" introuvable'); return document.createElement('div'); }
    return tpl.content.cloneNode(true).firstElementChild;
  }

  _cloneSwatchTemplate() {
    const tpl = this.$el.querySelector('[data-template="product-swatch"]');
    if (!tpl) return null;
    return tpl.content.cloneNode(true).firstElementChild;
  }
}
