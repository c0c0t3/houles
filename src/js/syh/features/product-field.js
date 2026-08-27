import { Base } from '@studiometa/js-toolkit';
import { isVisible, resolveLabel } from './show-if.js';

export default class ProductField extends Base {
  static config = {
    name: 'ProductField',
    refs: ['label', 'cards', 'defaultMessage'],
    emits: ['changed'],
  };

  _field = null;
  _selection = null;
  _coloris = [];
  _renderMode = 'none';
  _selectedRefBase = null;
  _cardColoris = new Map(); // refBase → coloris sélectionné sur cette carte
  // Vrai tant que la sélection courante vient de la résolution automatique (jamais cliquée par
  // l'utilisateur) : dans ce cas elle continue à suivre `defaultIf` en temps réel (ex : un
  // changement de longueur peut la faire basculer). Devient faux dès qu'un clic explicite a lieu
  // (onCardsChange) — la sélection de l'utilisateur n'est alors plus jamais réécrasée tant qu'elle
  // reste visible. Voir docs/module-5-etapes-intermediaires.md.
  _isDefaultSelection = true;

  mounted() {
    try {
      this._field = this.$el._syhField ?? null;
      this._selection = this.$el._syhSelection ?? {};
      this._coloris = this.$el._syhColoris ?? [];
      this._renderMode = this.$el._syhRenderMode ?? 'none';
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
   *
   * Cas `noColoris` (renderMode `live_colored`, pas de `variants` du tout — voir Module 6) :
   * n'importe quel coloris de la palette (`this._coloris`) est accepté sans vérification, il n'y a
   * pas de variante à faire correspondre — la couleur ne fait que teinter le calque SVG.
   *
   * Appelé par le Configurator à chaque changement du champ `coloris` global.
   *
   * @param {string} coloris - Id du coloris global sélectionné.
   */
  applyGlobalColoris(coloris) {
    let selectedChanged = false;
    for (const option of this._field?.options ?? []) {
      const matches = option.noColoris ? true : Boolean(option.variants?.[coloris]);
      if (!matches) continue;
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

    // Sélection par défaut : recalculée tant que l'utilisateur n'a rien cliqué explicitement
    // (_isDefaultSelection), pour suivre defaultIf en temps réel (ex : changement de longueur qui
    // fait franchir un seuil). Sinon, seulement si le choix de l'utilisateur n'est plus visible.
    if (this._isDefaultSelection || !this._selectedRefBase || !visible.find((o) => o.refBase === this._selectedRefBase)) {
      this._selectedRefBase = this._resolveDefault(visible, effectiveSel).refBase;
      this._isDefaultSelection = true;
    }

    this._updateDefaultMessage(visible, effectiveSel);

    for (const option of visible) {
      const coloris = this._resolveColoris(option);
      container.appendChild(this._buildCard(option, coloris));
    }
  }

  /**
   * Résout l'option par défaut parmi les options visibles. L'ordre de déclaration reste
   * prioritaire — `defaultIf` ne fait jamais sauter une option gatée devant une option normale
   * déclarée avant elle, il ne comble que l'absence d'alternative :
   *   1. Parmi les options réelles (hors `isNone`), dans l'ordre de déclaration : la première qui
   *      n'a pas de `defaultIf` (toujours éligible), OU dont le `defaultIf` correspond à la
   *      sélection courante. Une option gatée ne devient donc le défaut que si aucune option non
   *      gatée ne la précède dans la liste.
   *   2. Sinon (aucune option réelle éligible — toutes gatées, aucune ne correspond), la première
   *      option `isNone` si le champ en a une (ex : "Sans support intermédiaire").
   *   3. Sinon, la première option visible tout court — filet de sécurité pour ne jamais laisser un
   *      champ obligatoire sans sélection.
   *
   * `defaultIf` (même forme que `showIf`) ne filtre jamais la visibilité — seulement le choix du
   * défaut. Une option non retenue comme défaut reste sélectionnable manuellement par
   * l'utilisateur. Voir docs/module-5-etapes-intermediaires.md.
   *
   * @param {object[]} visible - Options déjà filtrées par `showIf`.
   * @param {object} effectiveSelection - Sélection courante (diamètre déjà résolu avant/arrière).
   * @returns {object} L'option retenue comme défaut.
   */
  _resolveDefault(visible, effectiveSelection) {
    const real = visible.filter((o) => !o.isNone);
    const eligible = real.find(
      (o) => !o.defaultIf || isVisible({ showIf: o.defaultIf }, effectiveSelection)
    );
    if (eligible) return eligible;

    const none = visible.find((o) => o.isNone);
    if (none) return none;

    return visible[0];
  }

  /**
   * Affiche le message qui justifie une recommandation (option.defaultMessage) dès qu'une option
   * visible du champ a un `defaultIf` qui correspond **actuellement** à la sélection — que cette
   * option soit sélectionnée ou non. C'est une recommandation liée à la configuration, pas à la
   * sélection : elle reste affichée même si l'utilisateur choisit explicitement "Sans" ou une
   * autre option, tant que la condition (ex : longueur) reste remplie. Masqué uniquement si aucune
   * option ne correspond à son `defaultIf`.
   *
   * @param {object[]} visible - Options déjà filtrées par `showIf`.
   * @param {object} effectiveSelection - Sélection courante (diamètre déjà résolu avant/arrière).
   */
  _updateDefaultMessage(visible, effectiveSelection) {
    const el = this.$refs.defaultMessage;
    if (!el) return;

    const matching = visible.find(
      (o) => o.defaultIf && o.defaultMessage && isVisible({ showIf: o.defaultIf }, effectiveSelection)
    );
    const message = matching?.defaultMessage ?? null;

    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.hidden = true;
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

  /**
   * Coloris mémorisé sur cette carte, sinon coloris global, sinon premier disponible.
   * `noColoris` (renderMode `live_colored`) : résout depuis la palette complète
   * (`this._coloris` = `collection.coloris[]`) plutôt que depuis les clés de `variants`, puisqu'il
   * n'y a pas de variante par coloris — n'importe quelle couleur de la palette est valide.
   */
  _resolveColoris(option) {
    if (option.noColoris) {
      const cachedNone = this._cardColoris.get(option.refBase);
      if (cachedNone && this._coloris.some((c) => String(c.id) === String(cachedNone))) return cachedNone;
      if (!this._coloris.length) return null;
      const globalNone = String(this._selection.coloris ?? '');
      const colorisNone = this._coloris.some((c) => String(c.id) === globalNone)
        ? globalNone
        : this._coloris[0].id;
      this._cardColoris.set(option.refBase, colorisNone);
      return colorisNone;
    }

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

    // Fallback au niveau option (pas variante) pour les produits `noColoris: true` — un seul
    // prix/id/stock/image, pas de déclinaison par coloris. Corrige un manque préexistant : ces
    // champs n'étaient lus que depuis `variant`, jamais depuis l'option elle-même.
    const img = card.querySelector('[data-ref="productImage"]');
    const imageSrc = variant?.image ?? option.image;
    if (imageSrc) { img.src = imageSrc; img.alt = option.label; }

    card.querySelector('[data-ref="productName"]').textContent = option.label;
    card.querySelector('[data-ref="productRef"]').textContent = variant?.id ?? option.id ?? option.refBase;

    const prix = variant?.prix ?? option.prix;
    card.querySelector('[data-ref="productPrice"]').textContent =
      prix != null
        ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(prix)
        : '—';

    card.querySelector('[data-ref="productQty"]').textContent = this._computeQty(option) ?? '—';

    this._fillStock(card.querySelector('[data-ref="productStock"]'), variant?.stock ?? option.stock ?? null);
    this._fillSwatches(card.querySelector('[data-ref="colorSwatches"]'), option, coloris);
    this._applySwatchVisibility(card, option);

    return card;
  }

  /**
   * Masque les swatches de coloris derrière un bouton "Changer de couleur" en `renderMode`
   * `none` / `live` — visibles en permanence en `live_colored` (surcouche colorisée, pas besoin
   * d'un clic supplémentaire). Sans effet si le produit n'a pas de coloris (rien à basculer).
   *
   * Cas `noColoris` : masqué partout SAUF en `live_colored`, où au contraire la palette complète
   * est ce qui pilote la teinte du calque SVG — c'est le seul mode où ces produits ont un coloris
   * à choisir du tout.
   *
   * @param {HTMLElement} card - Carte produit clonée.
   * @param {object} option - Option JSON correspondante.
   */
  _applySwatchVisibility(card, option) {
    const toggleBtn = card.querySelector('[data-ref="toggleColoris"]');
    const swatches = card.querySelector('[data-ref="colorSwatches"]');
    if (!swatches) return;

    // style.display plutôt que l'attribut hidden : colorSwatches porte la classe Tailwind "flex"
    // (display:flex), qui l'emporterait sur [hidden] dans la cascade (utilities après preflight).
    const alwaysVisible = this._renderMode === 'live_colored';

    if (option.noColoris) {
      swatches.style.display = alwaysVisible ? '' : 'none';
      // Toujours visible en live_colored, jamais ailleurs — pas de bouton à basculer ici.
      if (toggleBtn) toggleBtn.style.display = 'none';
      return;
    }

    if (!option.variants) {
      swatches.style.display = 'none';
      if (toggleBtn) toggleBtn.style.display = 'none';
      return;
    }

    swatches.style.display = alwaysVisible ? '' : 'none';
    if (toggleBtn) toggleBtn.style.display = alwaysVisible ? 'none' : '';
  }

  // `variantType` (par option, JSON) choisit la source du visuel de chaque pastille coloris :
  // "image" (défaut) = photo du produit dans cette couleur (option.variants[coloris].image) ;
  // "coloris" = vignette de coloris dédiée (collection.coloris[].thumbnail), indépendante du
  // produit — utile quand les photos produit par coloris ne sont pas toutes disponibles.
  //
  // Cas `noColoris` (live_colored) : itère toute la palette (`this._coloris`) plutôt que les clés
  // de `variants` (il n'y en a pas). Pastille = vignette si fournie, sinon `hex` en fond uni — les
  // couleurs placeholder n'ont pas de vignette dédiée.
  _fillSwatches(container, option, activeColoris) {
    if (!container) return;

    if (option.noColoris) {
      container.innerHTML = '';
      for (const info of this._coloris) {
        const btn = this._cloneSwatchTemplate();
        if (!btn) continue;
        btn.dataset.coloris = info.id;
        btn.dataset.product = option.refBase;
        btn.title = info.label ?? info.id;
        btn.classList.toggle('is-active', String(info.id) === String(activeColoris));
        if (info.thumbnail) {
          btn.style.backgroundImage = `url(${info.thumbnail})`;
          btn.style.backgroundSize = 'cover';
        } else if (info.hex) {
          btn.style.backgroundColor = info.hex;
        }
        container.appendChild(btn);
      }
      return;
    }

    if (!option.variants) return;
    container.innerHTML = '';
    const useColorisThumbnail = option.variantType === 'coloris';
    for (const colorisId of Object.keys(option.variants)) {
      const btn = this._cloneSwatchTemplate();
      if (!btn) continue;
      const info = this._coloris.find((c) => String(c.id) === String(colorisId));
      btn.dataset.coloris = colorisId;
      btn.dataset.product = option.refBase;
      btn.title = info?.label ?? colorisId;
      btn.classList.toggle('is-active', colorisId === activeColoris);
      const swatchImage = useColorisThumbnail ? info?.thumbnail : option.variants[colorisId]?.image;
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
    this._isDefaultSelection = false; // choix explicite : ne plus suivre defaultIf automatiquement
    this._emitChange();
  }

  // Clic sur un swatch — change le coloris de la carte concernée uniquement
  // Le clic sur un <button> dans un <label> ne déclenche pas le radio, pas besoin de stopPropagation
  onCardsClick({ event }) {
    // Bouton "Changer de couleur" : bascule l'affichage des swatches de cette carte uniquement.
    // Le bouton lui-même reste toujours visible (c'est lui qui permet de rouvrir les swatches
    // après les avoir refermées) — seul l'état des swatches change.
    const toggleBtn = event.target.closest('[data-ref="toggleColoris"]');
    if (toggleBtn) {
      const card = toggleBtn.closest('label');
      const swatches = card?.querySelector('[data-ref="colorSwatches"]');
      if (swatches) {
        const isHidden = swatches.style.display === 'none';
        swatches.style.display = isHidden ? '' : 'none';
      }
      return;
    }

    const btn = event.target.closest('[data-coloris]');
    if (!btn) return;

    const refBase = btn.dataset.product;
    const colorisId = btn.dataset.coloris;
    if (!refBase || !colorisId) return;

    this._cardColoris.set(refBase, colorisId);

    const option = this._field.options.find((o) => o.refBase === refBase);
    if (!option) return;

    // Mise à jour partielle de la carte (image, ref, prix, stock, swatches). Sautée pour les
    // produits `noColoris` : rien de tout ça ne varie par coloris (prix/réf/image sont fixes au
    // niveau option, déjà posés par _buildCard) — seule la couleur du calque SVG change ailleurs
    // (via selection.produits[fieldId].coloris, résolu par live-preview.js).
    const card = btn.closest('label');
    if (!option.noColoris) {
      const variant = option.variants?.[colorisId];
      if (variant?.image) card.querySelector('[data-ref="productImage"]').src = variant.image;
      card.querySelector('[data-ref="productRef"]').textContent = variant?.id ?? refBase;
      if (variant?.prix != null) {
        card.querySelector('[data-ref="productPrice"]').textContent =
          new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(variant.prix);
      }
      this._fillStock(card.querySelector('[data-ref="productStock"]'), variant?.stock ?? null);
    }
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
                    '[data-ref="toggleColoris"]',
                    '.text-gray-400']; // le séparateur "×"
    // style.display plutôt que l'attribut hidden : certains éléments (colorSwatches) portent une
    // classe Tailwind de display ("flex") qui l'emporterait sinon dans la cascade.
    toHide.forEach((sel) => {
      card.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
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
