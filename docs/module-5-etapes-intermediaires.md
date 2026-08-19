# Module 5 — Configurateur : Étapes intermédiaires & moteur de quantités

> Couvre les étapes produit du tunnel (Support, Tube/Rail, Anneaux/Galets, Embouts, Accessoires)
> et le **moteur de calcul de quantités**, cœur métier de ce module.
> Dépend du Module 3 (modèle de données, couche fetch). À lire avant toute implémentation.

---

## Périmètre

Ce module gère toutes les étapes qui proposent des **produits** (champs `product` et
`product_toggle`), par opposition à l'étape 1 qui ne contient que des paramètres.

Étapes concernées (l'ordre et la présence exacts dépendent du JSON de chaque collection) :
Support, Tube/Rail, Anneaux/Galets, Embouts, Accessoires.

Chaque étape est décrite dans le JSON de collection ; ce module fournit le moteur générique qui
les rend et calcule les quantités. Il ne contient aucune donnée produit en dur.

---

## 1. Le champ `product`

Affiche un produit sélectionnable, avec un **produit par défaut** pré-sélectionné selon la
sélection amont, et une **mini-modale** pour choisir une alternative.

### Comportement

- Le produit par défaut est déterminé par `default` : un `refBase` fixe, ou `"first_visible"`
  (premier produit compatible selon la sélection — voir ci-dessous).
- Les options sont filtrées par `showIf` (voir Module 3).
- Une mini-modale informative présente les alternatives (visuel, label, prix, variantes coloris).
- Le coloris du produit est pré-rempli par le coloris global de l'étape 1, mais reste modifiable
  par pièce (voir section Coloris).

### Champs facultatifs

Certains champs produit sont optionnels (`required: false`, `default: null`) : jambes de force,
supports intermédiaires, agrafes, accessoires. Ils ne sont pas sélectionnés au départ.

### Sélection par défaut : `first_visible`

Le champ `default` accepte un `refBase` fixe, ou le mot-clé `"first_visible"`. Avec `first_visible`,
le défaut s'adapte à la sélection courante — utile quand le produit compatible change selon le
diamètre, la pose, etc.

La résolution se fait en **deux temps** :

```js
function resolveDefault(field, selection) {
  // 1. Filtrer les produits compatibles (showIf : type, diamètre, pose, selected:...)
  const visibles = field.options.filter(o => isVisible(o, selection));
  if (!visibles.length) return null;

  // 2. Premier visible (l'ordre de déclaration des options fait foi)
  const produit = visibles[0];

  // 3. Résolution du coloris : coloris global si dispo, sinon fallback
  let coloris = null;
  if (produit.variants) {
    coloris = produit.variants[selection.coloris]
      ? selection.coloris
      : Object.keys(produit.variants)[0]; // fallback : premier coloris dispo
  }
  return { refBase: produit.refBase, coloris };
}
```

Deux choses importantes :

- **L'ordre de déclaration des options compte** : le premier produit qui passe `showIf` devient le
  défaut. Ranger les options par ordre de préférence commerciale.
- **Fallback coloris** : si le coloris global de l'étape 1 n'existe pas pour ce produit, le moteur
  prend le premier coloris disponible. Pour les collections où tous les produits ont tous les coloris
  (ex : ACEA, Auro), ce cas ne se présente pas. Pour les collections hétérogènes, à décider :
  fallback silencieux (comportement actuel) ou message « produit indisponible dans ce coloris ».

### Dépendance produit → produit

Une option peut dépendre du **produit sélectionné dans un autre champ**, pas seulement des
paramètres, via `selected:` dans `showIf`. L'option n'est visible que si le `refBase` choisi dans
un autre champ correspond (ou ne correspond pas, avec `not`).

```json
// Adaptateur visible seulement si le support corner 225mm (66744) est choisi
"showIf": { "selected:support": ["66744"] }

// Anneaux fermés masqués si le support est un modèle anneaux ouverts
"showIf": { "selected:support": { "not": ["66764", "66769"] } }
```

C'est le cas du support intermédiaire (dont les options compatibles dépendent du support principal
choisi), des jambes de force (liées à certains supports), des adaptateurs corner, et du choix anneaux
fermés/ouverts.

Le moteur lit le `refBase` sélectionné via `selection.produits[champ].refBase`. La logique de
`isVisible` étendue (égalité, seuil, `not`, `selected:`) est détaillée au Module 3.

> Un mécanisme `sameAs` (copie automatique du produit ET du coloris d'un autre champ, pour une
> dépendance totale sans liste d'options) a été envisagé puis écarté : aucun champ de la collection
> de démo ne correspond à une dépendance **strictement** totale — même le support intermédiaire,
> qui semblait être ce cas, dépend du support principal de façon conditionnelle (`selected:`), pas
> par copie systématique. Retiré de la spec tant qu'un cas d'usage réel ne le justifie pas.

---

## 2. Le champ `product_toggle` (AVEC / SANS)

Produit avec une bascule. Cas type : les anneaux (AVEC anneaux → produit ajouté ; SANS → produit
retiré du panier).

- État `with` → le produit est ajouté, sa quantité est calculée.
- État `without` → la ligne est retirée du panier, ainsi que ses éventuelles dépendances
  (ex : sans anneaux → retirer aussi agrafes et anneaux de blocage si présents).

---

## 3. Cas `replacesEmbouts`

Certains produits (naissances murales, corners) portent `replacesEmbouts: true`. Quand l'un d'eux
est sélectionné à l'étape Support :

- L'étape **Embouts reste visible** dans le stepper (décision UX : masquer complètement l'étape
  risque de dérouter un utilisateur non-connaisseur, qui pourrait croire à un bug ou penser avoir
  sauté une étape).
- Un **message d'information** s'affiche sur l'étape Embouts : « Les supports sélectionnés
  remplacent les embouts. »
- Les champs `embout` / `embout_arriere` sont **masqués** sur cette étape (mais l'étape et son
  bouton stepper restent accessibles).
- Toute ligne embout déjà présente est **purgée** de `selection.produits` (donc absente du payload
  panier).

Comme le support se choisit à l'étape 3 (avant l'étape Embouts), l'utilisateur ne peut pas se
retrouver déjà positionné sur l'étape Embouts au moment où le flag bascule — aucune redirection de
navigation n'est nécessaire.

Implémenté dans `features/embouts.js` (pas de module `steps.js` séparé) : `supportReplacesEmbouts()`
(lecture du flag), `purgeEmboutsIfReplaced()` (purge de la sélection), `refreshEmboutsStep()`
(affichage du message + masquage des champs), `selectedEmboutValue()` (valeur `emboutValue` de
l'embout sélectionné, utilisée par la modale de calcul de longueur), `createEmboutsMessageElement()`
(élément DOM du message). `configurator.js` reste l'orchestrateur : il appelle ces fonctions au
montage, après changement de support, après tout changement de paramètre qui recalcule le support
par défaut, et à chaque refresh de l'étape Embouts.

---

## 4. Moteur de quantités (cœur du module)

**Responsabilité : Alain (front), en démo comme en production.**

Le calcul de quantité est une logique front déclarative. Il n'y a **pas** d'appel réseau pour
calculer une quantité — les règles vivent dans le JSON, le calcul se fait localement dans
`quantities.js`.

### La chaîne de calcul complète

```
besoin brut  (règle quantity appliquée à la longueur / config)
   ↓
arrondi au conditionnement  (division par qtyParUnite, arrondi au supérieur)
   ↓
quantité commandable  (ce qui est affiché au panier et envoyé au pricing)
```

L'arrondi au `qtyParUnite` est **toujours fait côté front**. La quantité envoyée au pricing est la
quantité **commandable** (nombre de lots / cartes), jamais le besoin brut.

### Les modes de calcul (`quantity.mode`)

| `mode` | Description | Paramètres |
|---|---|---|
| `fixed` | quantité fixe | `value` |
| `fixed_by_config` | quantité dépendant d'un paramètre (hors dédoublement avant/arrière) | `valueMap`, `configFrom` |
| `per_interval` | calcul sur la longueur | `interval`, `extra`, `lengthFrom`, `lotSize`, `multiplyBy` |
| `segmented` | découpe en segments + produit lié | `segmentLength`, `lengthFrom`, `linkedProduct` |

### Exemples concrets

**Anneaux** — 1 tous les 10 cm, +1 pour les extrémités, vendus par lot de 10 :

```json
"quantity": {
  "mode": "per_interval",
  "interval": 10,
  "extra": 1,
  "lengthFrom": "configuration.longueur"
}
```

```
Longueur 180 cm → besoin brut = ceil(180/10) + 1 = 19 anneaux
qtyParUnite = 10 → quantité commandable = ceil(19/10) = 2 lots
Panier : "2 lots" (20 anneaux livrés)
```

### Configuration double : lignes séparées

En configuration double, un élément qui se dédouble génère **deux lignes de panier distinctes**,
jamais une seule ligne avec quantité ×2. Raison physique : l'élément avant et l'élément arrière sont
des produits différents (codes articles distincts, diamètres potentiellement distincts, coloris
potentiellement différents).

Le dédoublement **n'est pas une règle automatique du moteur** ("double = ×2"). Il est porté par la
**déclaration explicite des champs** dans le JSON de la collection (voir Module 3). Un élément qui
se dédouble est déclaré en deux champs préfixés (`tube_avant` / `tube_arriere`), chacun lisant sa
part de diamètre via `diametreFrom`. Un élément unique en double reste un champ simple.

Le moteur reste bête : il rend les champs déclarés, chaque champ génère sa ligne avec sa propre
résolution coloris et sa propre quantité. Il n'a aucune logique de dédoublement à coder.

Les trois cas réels, sans logique en dur :

```
Auro double  — barre arrière sans embout par design :
  un seul champ "embout"          → 1 ligne (1 paire)

Alium double 28+28 — deux champs même Ø :
  embout_avant + embout_arriere   → 2 lignes "1 paire Ø28"

ACEA double 19+28 — deux champs Ø différents :
  embout_avant (Ø28)              → 1 ligne "1 paire Ø28"
  embout_arriere (Ø19)            → 1 ligne "1 paire Ø19"
```

Dans le récap, les lignes se suivent dans l'ordre de déclaration des champs (avant puis arrière) ;
pas de regroupement ni d'étiquette avant/arrière nécessaire à l'affichage.

Ne jamais fusionner deux champs en une ligne ×2 : cela masquerait les codes articles réels et
fausserait le pricing (prix avant ≠ prix arrière possible).

**Tube segmenté** — tube fournisseur de 100 cm, raccord entre chaque segment :

```json
"quantity": {
  "mode": "segmented",
  "segmentLength": 100,
  "lengthFrom": "configuration.longueur",
  "linkedProduct": { "refBase": "RACCORD", "quantityRule": "segments_minus_1" }
}
```

```
Longueur 240 cm → ceil(240/100) = 3 tubes
Raccords = 3 - 1 = 2
→ 2 lignes de panier : 3 tubes + 2 raccords
```

**Agrafes** — par lot, quantité doublée en configuration double :

```json
"quantity": {
  "mode": "per_interval",
  "interval": 10,
  "lengthFrom": "configuration.longueur",
  "multiplyBy": "configuration.type",
  "multiplyMap": { "simple": 1, "double": 2 }
}
```

### Implémentation de référence

```js
// quantities.js
export function computeQty(rule, selection, qtyParUnite = 1) {
  const L = getValue(selection, rule.lengthFrom);
  let brut;

  switch (rule.mode) {
    case 'fixed':
      brut = rule.value;
      break;
    case 'fixed_by_config':
      brut = rule.valueMap[getValue(selection, rule.configFrom)];
      break;
    case 'per_interval':
      brut = Math.ceil(L / rule.interval) + (rule.extra || 0);
      if (rule.multiplyBy) brut *= rule.multiplyMap[getValue(selection, rule.multiplyBy)];
      break;
    case 'segmented':
      brut = Math.ceil(L / rule.segmentLength);
      break;
  }

  // Arrondi au conditionnement (toujours côté front)
  return Math.ceil(brut / qtyParUnite);
}
```

---

## 5. Coloris par élément

Le coloris choisi à l'étape 1 **pré-remplit** le coloris de chaque produit, mais l'utilisateur peut
le **changer indépendamment par pièce** (toute combinaison autorisée — ex : tube laiton + embout
rose). Voir Module 3 pour la résolution variante.

Pour les produits **sans coloris** (rouleurs, raccords...), pas de sélecteur couleur : l'`id` est
pris à la racine du produit (voir Module 3, section Produits sans coloris).

### Propagation : `ProductField.applyGlobalColoris(coloris)`

Chaque `ProductField` monté (un par champ produit, **toutes étapes confondues** — pas seulement
celle affichée, voir Module 3 sur le montage anticipé de tous les champs) mémorise en interne le
coloris résolu par `refBase` (`_cardColoris`, une `Map`), pour que chaque carte produit garde sa
couleur d'une carte à l'autre sans redemander la résolution à chaque rendu.

À chaque changement du champ `coloris` global, l'orchestrateur (`configurator.js`) appelle
`applyGlobalColoris(coloris)` sur **tous** les `ProductField` montés. La méthode parcourt **toutes
les options déclarées du champ** (`field.options`, pas uniquement les options actuellement visibles
ni le `refBase` actuellement sélectionné) :

```js
applyGlobalColoris(coloris) {
  let selectedChanged = false;
  for (const option of this._field.options) {
    if (!option.variants?.[coloris]) continue;       // option sans cette couleur : inchangée
    this._cardColoris.set(option.refBase, coloris);  // met à jour le cache, visible ou non
    if (option.refBase === this._selectedRefBase) selectedChanged = true;
  }
  this._render();
  if (selectedChanged) this._emitChange();            // selection.produits mis à jour seulement
}                                                       // si le produit AFFICHÉ a changé de couleur
```

Deux points importants :

- **Toutes les options, pas seulement celle sélectionnée ou visible.** Une option masquée par
  `showIf` au moment du clic (ex : un support Ø25 alors que le diamètre courant est 16) reçoit
  quand même sa mise à jour de cache, pour que la couleur soit déjà correcte si cette option
  redevient le défaut plus tard (changement de diamètre → nouvelle résolution `first_visible`,
  voir section 1). Sans cette règle, revenir sur une étape après un changement de config ferait
  retomber le produit sur le premier coloris disponible (`Object.keys(variants)[0]`) au lieu du
  coloris global — bug corrigé le 2026-08-19.
- **Pas de fallback.** Une option qui n'a pas cette couleur garde son coloris actuel — cohérent
  avec la règle « pas de fallback silencieux vers un autre coloris à cette étape » (le fallback
  premier-coloris-disponible ne s'applique qu'à la toute première résolution du défaut, section 1
  ci-dessus).

### `variantType` — source visuelle des pastilles coloris

Chaque option produit peut déclarer `variantType: "image"` (défaut) ou `"coloris"` — voir
`json-schema-reference.md`. Ça ne change que la **source de l'image** affichée dans les pastilles
de sélection coloris d'une carte produit (`variants[coloris].image` vs `collection.coloris[].thumbnail`
dédié) ; ça ne touche ni la résolution du coloris, ni `applyGlobalColoris`. Utile quand les
photos produit dans chaque coloris ne sont pas toutes disponibles : la pastille tombe alors sur la
vignette générique de la couleur plutôt que sur une image manquante ou incohérente.

---

## 6. Lien avec le pricing

Après chaque changement de sélection, le panier reconstruit ses lignes (id + quantité commandable)
et appelle `fetchPricing(items)` (voir Module 3).

- L'`id` envoyé est le code article complet résolu (`code_famille-code_coloris`, ou code famille
  seul si sans coloris).
- La `qty` envoyée est la **quantité commandable** (déjà arrondie au conditionnement).
- Le pricing réel (tarifs, remises) est côté client ; la démo utilise le mock pricing.

---

## 7. Modale "Calcul de longueur"

Outil d'aide au calcul, portage fidèle de la logique métier de l'ancien configurateur (calcul
autrefois fait côté serveur via AJAX, désormais recalculé localement en live à chaque saisie).
Implémenté dans `features/longueur-calculator.js` (calcul) et `features/modal-router.js` (affichage
dans le panel partagé). Voir `docs/json-schema-reference.md` pour `longueurEmbout` /
`recouvrementEmbout`.

**Paramètres saisis par l'utilisateur :**

| Paramètre | Signification | Bornes |
|---|---|---|
| A | Largeur de la fenêtre | ≥ 80 cm |
| B | Distance fenêtre - support | 15 à 40 cm |
| C | Distance support - embout | 5 à 50 cm |

Une saisie hors bornes est corrigée silencieusement à la perte de focus du champ (pas à chaque
frappe, pour ne pas gêner la saisie en cours).

**Valeurs par défaut à la toute première ouverture :** A = 120, B = 20, C = 10. Les valeurs saisies
sont ensuite conservées d'une ouverture à l'autre (état en mémoire, pas de persistance serveur).

**Calculs (dans cet ordre) :**

1. `D = A + 2×B` — distance entre les supports d'extrémité (affichage uniquement).
2. `Longueur de tube suggérée = A + 2×B + 2×C = D + 2×C` — c'est cette valeur, **pas D**, qui est
   appliquée au champ `longueur` du configurateur au clic sur "Valider".
3. `Longueur totale estimée = Longueur de tube - 2×recouvrementEmbout + 2×longueurEmbout` — calculée
   uniquement à partir de l'embout **actuellement sélectionné** dans le configurateur. Affichage
   seul, jamais appliqué. Ce calcul ne doit pas être modifié (règle métier explicite).

---

## Organisation du code

```
src/js/syh/features/
  product-field.js     ← champ product (défaut + mini-modale)
  quantities.js        ← moteur de calcul de quantités
  embouts.js           ← cas replacesEmbouts (voir section 3 ci-dessus)
  cart-payload.js      ← construction du payload panier (items, quantités, coupes)
  recap.js             ← récapitulatif persistant de l'étape 1
```

Note : `product-toggle.js` n'existe plus (voir `isNone` dans le Module 3 / `json-schema-reference.md`).
Il n'y a pas de fichier `steps.js` séparé : la navigation entre étapes reste dans `configurator.js`
(orchestrateur, état + cycle de rendu).

---

## Points de décision encore ouverts

Aucun point ouvert restant sur `replacesEmbouts` — comportement tranché (voir section 3).