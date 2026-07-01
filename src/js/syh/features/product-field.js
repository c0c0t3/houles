import { Base } from '@studiometa/js-toolkit';
import { isVisible } from './show-if.js';

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
      this.$refs.label.textContent = this._field.label;
      this._render();
      this._emitChange();
    } catch (err) {
      console.error('[ProductField] mounted ERROR:', this._field?.id, err);
    }
  }

  refresh(selection) {
    if (!this._field) return;
    this._selection = selection;
    const prev = this._selectedRefBase;
    this._render();
    if (this._selectedRefBase !== prev) this._emitChange();
  }

  // -------------------------------------------------------------------------
  // Rendu — reconstruit toutes les cartes visibles, n'émet jamais
  // -------------------------------------------------------------------------

  _render() {
    const { options = [] } = this._field;
    const visible = options.filter((o) => isVisible(o, this._selection));
    const container = this.$refs.cards;
    container.innerHTML = '';

    if (!visible.length) {
      this._selectedRefBase = null;
      return;
    }

    // Sélection par défaut ou fallback si le produit actuel n'est plus visible
    if (!this._selectedRefBase || !visible.find((o) => o.refBase === this._selectedRefBase)) {
      this._selectedRefBase = visible[0].refBase;
    }

    for (const option of visible) {
      const coloris = this._resolveColoris(option);
      container.appendChild(this._buildCard(option, coloris));
    }
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

  _fillSwatches(container, option, activeColoris) {
    if (!container || !option.variants) return;
    container.innerHTML = '';
    for (const colorisId of Object.keys(option.variants)) {
      const btn = this._cloneSwatchTemplate();
      if (!btn) continue;
      const info = this._coloris.find((c) => String(c.id) === String(colorisId));
      btn.dataset.coloris = colorisId;
      btn.dataset.product = option.refBase;
      btn.title = info?.label ?? colorisId;
      btn.classList.toggle('is-active', colorisId === activeColoris);
      if (info?.image) { btn.style.backgroundImage = `url(${info.image})`; btn.style.backgroundSize = 'cover'; }
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
    if (!quantity || quantity.mode !== 'fixed') return null;
    return Math.ceil(quantity.value / (option.qtyParUnite ?? 1));
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

  _emitChange() {
    if (!this._field || !this._selectedRefBase) return;
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
