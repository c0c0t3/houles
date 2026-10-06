import { Base } from '@studiometa/js-toolkit';
import { isVisible, resolveLabel } from './show-if.js';

export default class ProductField extends Base {
  static config = {
    name: 'ProductField',
    refs: ['label', 'cards', 'defaultMessage', 'defaultMessageTitle', 'defaultMessageText'],
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
      // En `live_colored`, les cartes sont horizontales (voir `product-card--live-colored` dans
      // index.twig) et s'empilent en colonne — la grille par défaut reste en ligne/wrap.
      if (this._renderMode === 'live_colored') {
        this.$refs.cards.classList.remove('m:flex-wrap');
        this.$refs.cards.classList.add('flex-col');
      }
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
   * prioritaire, `isNone` inclus — c'est ce qui permet à sa **position** de piloter le défaut :
   *   1. Dans l'ordre de déclaration, la première option réelle (hors `isNone`) qui est éligible :
   *      - si aucune option `isNone` ne la précède dans le tableau, elle est **toujours éligible**
   *        qu'elle ait un `defaultIf` ou non (`isNone` en dernier, ou absent → "en dernier" du
   *        tableau ci-dessous) ;
   *      - si une option `isNone` la précède, elle n'est éligible que si son `defaultIf` correspond
   *        à la sélection courante — sans `defaultIf` du tout, elle n'est **jamais** auto-éligible
   *        (`isNone` en premier → "en premier" ci-dessous, y compris sans aucun `defaultIf` nulle
   *        part dans le champ, ex : accessoires purement optionnels).
   *      Une option gatée ne devient donc le défaut que si aucune option éligible ne la précède.
   *   2. Sinon (aucune option réelle éligible), la première option `isNone` si le champ en a une
   *      (ex : "Sans support intermédiaire" tant que la longueur ne dépasse pas le seuil).
   *   3. Sinon, la première option visible tout court — filet de sécurité pour ne jamais laisser un
   *      champ obligatoire sans sélection.
   *
   * | Position de `isNone` | Défaut |
   * |---|---|
   * | Absente, ou après toutes les options réelles | La première option réelle visible |
   * | Avant une ou plusieurs options réelles | `isNone`, sauf si l'une de ces options a un `defaultIf` qui correspond |
   *
   * `defaultIf` (même forme que `showIf`) ne filtre jamais la visibilité — seulement le choix du
   * défaut. Une option non retenue comme défaut reste sélectionnable manuellement par
   * l'utilisateur. Voir docs/module-5-etapes-intermediaires.md et json-schema-reference.md.
   *
   * @param {object[]} visible - Options déjà filtrées par `showIf`.
   * @param {object} effectiveSelection - Sélection courante (diamètre déjà résolu avant/arrière).
   * @returns {object} L'option retenue comme défaut.
   */
  _resolveDefault(visible, effectiveSelection) {
    const noneIndex = visible.findIndex((o) => o.isNone);

    const eligible = visible.find((o, index) => {
      if (o.isNone) return false;
      const precededByNone = noneIndex !== -1 && noneIndex < index;
      if (!o.defaultIf) return !precededByNone;
      return isVisible({ showIf: o.defaultIf }, effectiveSelection);
    });
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
   * Icône fixe dans le Twig (box jaune) ; titre et texte viennent de la donnée. Le titre est
   * généré ici, pas déclaré dans le JSON — "{label du champ} recommandé" (ex : "Support
   * intermédiaire recommandé"), via `resolveLabel` pour rester cohérent avec le label affiché
   * au-dessus de la grille (`labelByConfig` déjà résolu le cas échéant).
   *
   * @param {object[]} visible - Options déjà filtrées par `showIf`.
   * @param {object} effectiveSelection - Sélection courante (diamètre déjà résolu avant/arrière).
   */
  _updateDefaultMessage(visible, effectiveSelection) {
    const el = this.$refs.defaultMessage;
    if (!el) return;

    // trim() : exclut aussi un defaultMessage réduit à des espaces, pas seulement vide/absent.
    const matching = visible.find(
      (o) => o.defaultIf && o.defaultMessage?.trim() && isVisible({ showIf: o.defaultIf }, effectiveSelection)
    );
    const message = matching?.defaultMessage?.trim() || null;

    if (message) {
      this.$refs.defaultMessageTitle.textContent = `${resolveLabel(this._field, this._selection)} recommandé`;
      this.$refs.defaultMessageText.textContent = message;
      // style.display plutôt que .hidden : la box porte la classe Tailwind "flex", qui
      // l'emporterait sinon sur [hidden] dans la cascade (utilities après preflight).
      el.style.display = '';
    } else {
      el.style.display = 'none';
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
    const isSelected = option.refBase === this._selectedRefBase;

    const radio = card.querySelector('input[type="radio"]');
    radio.name = this._field.id;
    radio.dataset.product = option.refBase;
    radio.checked = isSelected;

    // Fallback au niveau option (pas variante) pour les produits `noColoris: true` — un seul
    // prix/id/stock/image, pas de déclinaison par coloris. Corrige un manque préexistant : ces
    // champs n'étaient lus que depuis `variant`, jamais depuis l'option elle-même.
    const img = card.querySelector('[data-ref="productImage"]');
    const imageSrc = variant?.image ?? option.image;
    if (imageSrc) { img.src = imageSrc; img.alt = option.label; }

    card.querySelector('[data-ref="productName"]').textContent = option.label;
    card.querySelector('[data-ref="productRef"]').textContent = variant?.id ?? option.id ?? option.refBase;

    // Lien fiche produit — base portée par l'option (une fiche par produit), suffixée par le
    // coloris affiché sur cette carte : convention Houlès, l'URL produit se termine toujours par
    // "-{coloris}". Masqué si pas de productUrl (mock incomplet) plutôt que de pointer vers "#".
    const link = card.querySelector('[data-ref="productLink"]');
    if (option.productUrl) {
      link.href = coloris ? `${option.productUrl}-${coloris}` : option.productUrl;
    } else {
      link.style.display = 'none';
    }

    const prix = variant?.prix ?? option.prix;
    card.querySelector('[data-ref="productPrice"]').textContent =
      prix != null
        ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(prix)
        : '—';

    card.querySelector('[data-ref="productQty"]').textContent = this._computeQty(option) ?? '—';

    this._fillStock(card.querySelector('[data-ref="productStock"]'), variant?.stock ?? option.stock ?? null);
    this._applyColorisUI(card, option, coloris, isSelected);

    return card;
  }

  /**
   * Pilote l'affichage des pastilles de coloris sur une card. Toujours visibles quand il y a
   * quelque chose à afficher — plus de bouton "Changer de couleur" à basculer, dans aucun mode.
   *
   * - `none` / `live` : coloris par variante (`option.variants`), pastilles visibles en permanence
   *   dès que l'option en a.
   * - `live_colored` : plus de variante par coloris. Les pastilles (nuancier complet, voir
   *   `_fillSwatches`) n'existent que pour les produits réellement teintés (`option.svgUrl`) et
   *   **seulement sur la card du produit sélectionné** — elle s'agrandit pour les accueillir. Les
   *   autres cards du champ n'ont aucune pastille. Pas de modale ici : la sélection d'une couleur se
   *   fait directement dans la card (voir docs/module-8b, historique de la décision — la modale
   *   envisagée un temps a été abandonnée).
   *
   * @param {HTMLElement} card - Carte produit clonée.
   * @param {object} option - Option JSON correspondante.
   * @param {string|null} coloris - Coloris actif résolu par `_resolveColoris` pour cette option.
   * @param {boolean} isSelected - Vrai si `option` est l'option actuellement sélectionnée du champ.
   */
  _applyColorisUI(card, option, coloris, isSelected) {
    const swatches = card.querySelector('[data-ref="colorSwatches"]');
    if (!swatches) return;

    if (this._renderMode === 'live_colored') {
      const showSwatches = Boolean(option.svgUrl) && isSelected;
      if (showSwatches) {
        this._fillSwatches(swatches, option, coloris);
        swatches.style.display = '';
      } else {
        swatches.replaceChildren();
        swatches.style.display = 'none';
      }
      return;
    }

    // none / live : coloris par variante, visibles en permanence dès que l'option en a.
    // style.display plutôt que l'attribut hidden : colorSwatches porte la classe Tailwind "flex"
    // (display:flex), qui l'emporterait sur [hidden] dans la cascade (utilities après preflight).
    if (!option.variants) {
      swatches.style.display = 'none';
      return;
    }
    this._fillSwatches(swatches, option, coloris);
    swatches.style.display = '';
  }

  /**
   * Affiche ou masque les pastilles de coloris d'une card précise (`live_colored`), sans
   * reconstruire toute la grille — utilisé par `onCardsChange` pour ne toucher que les deux cards
   * concernées par un changement de sélection (l'ancienne et la nouvelle). Sans effet si l'option
   * n'a pas de calque SVG (pas de coloris à choisir pour elle, voir `_applyColorisUI`).
   *
   * @param {string|null} refBase - Réf de l'option dont la card doit être mise à jour.
   * @param {boolean} show
   */
  _toggleCardColoris(refBase, show) {
    if (!refBase) return;
    const card = this.$refs.cards.querySelector(`input[data-product="${refBase}"]`)?.closest('label');
    const option = this._field.options?.find((o) => o.refBase === refBase);
    const swatches = card?.querySelector('[data-ref="colorSwatches"]');
    if (!option || !swatches || !option.svgUrl) return;

    if (show) {
      this._fillSwatches(swatches, option, this._resolveColoris(option));
      swatches.style.display = '';
    } else {
      swatches.replaceChildren();
      swatches.style.display = 'none';
    }
  }

  // `variantType` (par option, JSON) choisit la source du visuel de chaque pastille coloris :
  // "image" (défaut) = photo du produit dans cette couleur (option.variants[coloris].image) ;
  // "coloris" = vignette de coloris dédiée (collection.coloris[].thumbnail), indépendante du
  // produit — utile quand les photos produit par coloris ne sont pas toutes disponibles.
  //
  // Cas `noColoris` (live_colored) : itère toute la palette (`this._coloris`) plutôt que les clés
  // de `variants` (il n'y en a pas) — nuancier complet, pas de limite. Pastille = vignette si
  // fournie, sinon `hex` en fond uni — les couleurs placeholder n'ont pas de vignette dédiée.
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

    // Injectée par refreshTubeStep() (features/tube-step.js) avant chaque refresh().
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
    const previousRefBase = this._selectedRefBase;
    this._selectedRefBase = radio.dataset.product;
    this._isDefaultSelection = false; // choix explicite : ne plus suivre defaultIf automatiquement

    // live_colored : les pastilles ne vivent que sur la card sélectionnée (voir _applyColorisUI) —
    // bascule l'affichage entre l'ancienne et la nouvelle card sans reconstruire toute la grille.
    if (this._renderMode === 'live_colored' && previousRefBase !== this._selectedRefBase) {
      this._toggleCardColoris(previousRefBase, false);
      this._toggleCardColoris(this._selectedRefBase, true);
    }

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
    // Contrairement au reste de la carte, la fiche produit varie par coloris même en `noColoris`
    // (convention Houlès : l'URL se termine toujours par "-{coloris}") — mise à jour dans tous les cas.
    if (option.productUrl) {
      const link = card.querySelector('[data-ref="productLink"]');
      if (link) link.href = `${option.productUrl}-${colorisId}`;
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
                    '[data-ref="productLink"]',
                    '[data-ref="productPrice"]', '[data-ref="productQty"]',
                    '[data-ref="productStock"]', '[data-ref="colorSwatches"]',
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

  // En `live_colored`, la carte est horizontale (image à gauche, colonne texte + swatchs à droite,
  // swatchs dans le flux) — template Twig distinct `product-card--live-colored`. Fallback sur la
  // carte standard s'il est absent. Mêmes data-ref dans les deux, le reste du build est inchangé.
  _cloneCardTemplate() {
    const key = this._renderMode === 'live_colored' ? 'product-card--live-colored' : 'product-card';
    const tpl =
      this.$el.querySelector(`[data-template="${key}"]`) ??
      this.$el.querySelector('[data-template="product-card"]');
    if (!tpl) { console.warn('[ProductField] template "product-card" introuvable'); return document.createElement('div'); }
    return tpl.content.cloneNode(true).firstElementChild;
  }

  _cloneSwatchTemplate() {
    const tpl = this.$el.querySelector('[data-template="product-swatch"]');
    if (!tpl) return null;
    return tpl.content.cloneNode(true).firstElementChild;
  }
}
