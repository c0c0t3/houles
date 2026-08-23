# Référence JSON — Schéma de collection

> Ce document décrit toutes les propriétés acceptées dans un fichier JSON de collection.
> Il est la **source de vérité** pour la création de nouvelles collections ou la mise à jour des données existantes.
> La lecture du Module 3 (architecture générale) est un prérequis.

---

## Structure de haut niveau

```json
{
  "collection": { ... },
  "steps": [ ... ]
}
```

---

## `collection`

```json
"collection": {
  "id": "auro-concept",
  "name": "Auro Concept",
  "renderMode": "none",
  "coloris": [ ... ]
}
```

| Propriété | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | oui | Identifiant unique, correspond au nom du fichier JSON |
| `name` | string | oui | Nom affiché dans l'UI |
| `renderMode` | string | oui | `"none"` / `"live"` / `"live_colored"` — voir Module 3 |
| `coloris` | array | non | Liste des coloris disponibles (voir section Coloris) |

### `collection.coloris[]`

```json
{
  "id": "laiton",
  "label": "Laiton brillant",
  "image": "/img/coloris/laiton.jpg",
  "thumbnail": "/img/coloris/laiton-thumb.jpg"
}
```

| Propriété | Type | Description |
|---|---|---|
| `id` | string | Identifiant du coloris, clé des `variants` des produits |
| `label` | string | Libellé affiché dans le nuancier |
| `image` | string | Photo de référence de la couleur (grand format). Non consommée par le moteur actuellement — donnée descriptive, gardée pour référence / usage futur |
| `thumbnail` | string | Vignette compacte de la couleur (petit format, ex : swatch rond). Utilisée pour le champ `coloris` de l'étape 1 (`variant: "label_thumbnail"`, réservé à ce champ — voir Module 4) et pour les pastilles coloris des options `product` déclarées en `variantType: "coloris"` (voir plus bas) |

> **Propagation du coloris global** : cliquer une option du champ `coloris` (étape 1) réaligne le
> coloris de tous les produits déjà sélectionnés qui proposent cette couleur — pas seulement le
> produit actuellement affiché. Comportement moteur, pas une propriété JSON — détaillé au
> Module 3 (« Personnalisation du coloris par élément ») et au Module 5 (section « Coloris par
> élément »).

---

## `steps[]`

```json
{
  "id": "configuration",
  "label": "Configuration",
  "fields": [ ... ]
}
```

| Propriété | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | oui | Identifiant de l'étape |
| `label` | string | oui | Libellé du bouton dans le stepper |
| `fields` | array | oui | Liste des champs de l'étape (voir section Fields) |

---

## `fields[]` — propriétés communes

Toutes les propriétés ci-dessous peuvent figurer sur n'importe quel type de champ.

| Propriété | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | oui | Identifiant unique du champ dans la collection |
| `label` | string | oui | Libellé affiché au-dessus du champ |
| `type` | string | oui | Type de champ — voir section Types |
| `required` | boolean | non | `true` = le champ bloque la progression si vide |
| `isParam` | boolean | non | `true` = la valeur alimente `selection{}` (radio/length) |
| `showIf` | object | non | Conditions de visibilité du champ (voir section Visibilité) |
| `labelByConfig` | object | non | Label dynamique selon la sélection (voir section Labels) |
| `splitByConfig` | string | non | Dédouble le champ selon un paramètre (voir section Split) |
| `configs` | object | non | Variantes de split (obligatoire si `splitByConfig` présent) |
| `_note` | string | non | Commentaire interne, ignoré par le moteur |

---

## Types de champs

### `radio`

Boutons de sélection unique. Alimente `selection[field.id]`.

```json
{
  "id": "type_de_support",
  "label": "Type de support",
  "type": "radio",
  "isParam": true,
  "options": [
    { "id": "simple", "label": "Simple", "image": "/img/simple.jpg" },
    { "id": "double", "label": "Double" }
  ]
}
```

Avec `dependsOn` — les options sont groupées par valeur parente :

```json
{
  "id": "diametre",
  "type": "radio",
  "isParam": true,
  "dependsOn": "type_de_support",
  "options": {
    "simple": [
      { "id": "16", "label": "Ø 16 mm" },
      { "id": "25", "label": "Ø 25 mm" }
    ],
    "double": [
      { "id": "16+25", "label": "Ø 16 + 25 mm" }
    ]
  }
}
```

| Propriété option | Type | Description |
|---|---|---|
| `id` | string | Valeur stockée dans `selection` |
| `label` | string | Libellé affiché |
| `image` | string | Illustration optionnelle |
| `showIf` | object | Visibilité de cette option (voir section Visibilité) |

---

### `length`

Presets de longueur + saisie sur-mesure. Alimente `selection.longueur` (ou autre `id`).

```json
{
  "id": "longueur",
  "label": "Longueur",
  "type": "length",
  "isParam": true,
  "presets": [120, 150, 180, 200, 240],
  "custom": {
    "enabled": true,
    "min": 60,
    "max": 400
  }
}
```

| Propriété | Type | Description |
|---|---|---|
| `presets` | number[] | Valeurs rapides en centimètres |
| `custom.enabled` | boolean | Autorise la saisie libre |
| `custom.min` | number | Longueur minimale (cm) |
| `custom.max` | number | Longueur maximale (cm) |

---

### `product`

Grille de cartes produits avec variantes coloris.

```json
{
  "id": "embout",
  "label": "Embout",
  "type": "product",
  "quantity": { "mode": "fixed", "value": 2 },
  "options": [
    {
      "refBase": "66084",
      "label": "Embout Auro Concept",
      "qtyParUnite": 2,
      "showIf": { "diametre": ["16"] },
      "variants": {
        "laiton": { "id": "66084-24", "prix": 18.00, "stock": 45, "image": "/img/66084-laiton.jpg" }
      }
    }
  ]
}
```

**Propriétés du champ :**

| Propriété | Type | Description |
|---|---|---|
| `quantity` | object | Règle de calcul de quantité (voir section Quantités) |
| `diametreFrom` | string | `"avant"` ou `"arriere"` — lit la part de diamètre correspondante en config double |
| `options` | array | Liste des produits disponibles |
| `layerOrder` | number | Ordre d'empilement (z-index) du calque de rendu visuel — modes `live` / `live_colored` uniquement (voir Module 6) |

> **Note :** `required` n'existe pas sur les champs `product`. Tout champ produit optionnel utilise une option `isNone` (voir ci-dessous). `required` reste réservé aux champs `radio` et `length` pour la validation de progression future.

> **`layerOrder`** : sans effet en `renderMode: "none"` (pas de rendu visuel). En `live` / `live_colored`, plus la valeur est élevée, plus le calque du champ s'affiche au-dessus des autres (ex : support < tube < anneaux < embout). Un champ produit sans rendu visuel (option purement fonctionnelle) omet cette propriété.

**Propriétés d'une option produit :**

| Propriété | Type | Obligatoire | Description |
|---|---|---|---|
| `refBase` | string | oui | Référence famille produit (sans coloris). Vaut `"none"` pour les options `isNone`. |
| `label` | string | oui | Nom affiché sur la carte |
| `isNone` | boolean | non | `true` = option "sans ce produit". Carte grisée, pas de coloris ni de quantité. Exclue du payload panier. |
| `qtyParUnite` | number | non | Conditionnement — divise la quantité calculée (défaut : 1) |
| `showIf` | object | non | Conditions de visibilité de cette option |
| `showIfAny` | array | non | Conditions de visibilité en OU (voir section Visibilité) |
| `defaultIf` | object | non | Même forme que `showIf`, mais influence **uniquement** le choix de l'option par défaut — jamais la visibilité. Voir « Sélection par défaut conditionnelle » ci-dessous |
| `variants` | object | non | Variantes par coloris (absent si produit sans coloris) |
| `variantType` | string | non | `"image"` (défaut) ou `"coloris"` — source du visuel des pastilles coloris de cette option : photo du produit dans la couleur (`variants[coloris].image`), ou vignette de coloris dédiée (`collection.coloris[].thumbnail`, indépendante du produit) |
| `id` | string | non | Référence complète si produit sans coloris (pas de `variants`) |
| `noColoris` | boolean | non | `true` pour les produits sans coloris (visserie, rouleurs…) |
| `tubeLength` | number | non | Longueur du tube en cm — requis sur les options de type tube pour le calcul `segmented` |
| `replacesEmbouts` | boolean | non | `true` sur une option du champ `support` (naissances murales, corners) — voir section dédiée ci-dessous |
| `longueurEmbout` | number | non | Longueur en cm de l'embout — sur les options du champ `embout`, utilisée par la modale "Calcul de longueur" |
| `recouvrementEmbout` | number | non | Recouvrement en cm de l'embout sur le tube — sur les options du champ `embout`, utilisée par la modale "Calcul de longueur" |

**Propriétés d'une variante :**

| Propriété | Type | Description |
|---|---|---|
| `id` | string | Référence article complète (ex : `66084-24`) |
| `prix` | number | Prix unitaire HT |
| `stock` | number | Quantité en stock |
| `image` | string | Image catalogue de la variante — carte produit / mini-modale (colonne droite). Prioritaire sur l'image coloris |
| `renderImage` | string | Image détourée dédiée au calque du rendu visuel — colonne gauche `.colG`. Modes `live` / `live_colored` uniquement (voir Module 6). Distincte de `image` : cadrage différent, pensé pour la superposition |
| `svgUrl` | string | Chemin SVG pour la composition visuelle (mode `live_colored`) |

---

### Champs produit optionnels — `isNone`

Un champ `product` peut proposer une option "sans ce produit" en ajoutant une option avec `"isNone": true`. Le moteur affiche une carte grisée sans image ni prix. Si l'utilisateur la sélectionne, le champ n'apparaît pas dans le payload panier.

**La position dans le tableau détermine la sélection par défaut :**

```json
{ "refBase": "none", "label": "Sans anneaux", "isNone": true }
```

| Position de l'option `isNone` | Sélection par défaut |
|---|---|
| En **dernier** | La première vraie option visible — ex : anneaux (inclus par défaut) |
| En **premier** | L'option `isNone` elle-même — ex : anneaux de blocage (exclus par défaut) |

> Les options `isNone` n'ont pas de `showIf` : elles sont toujours visibles, quelle que soit la configuration.

> `product_toggle` n'existe plus. Tout champ autrefois `product_toggle` doit être converti en `product` avec une option `isNone`.

> **Défaut conditionnel** : si une ou plusieurs options réelles portent un `defaultIf`, placer
> l'option `isNone` **en premier, sans `defaultIf`** — elle sert alors de choix par défaut « neutre »
> tant qu'aucune option réelle ne remplit sa condition, sans jamais masquer ces options. Voir
> « Sélection par défaut conditionnelle — `defaultIf` » plus haut.

---

### Option `replacesEmbouts`

Certaines options du champ `support` (naissances murales, corners) intègrent déjà les embouts.
Quand l'option sélectionnée porte `"replacesEmbouts": true` :

- L'étape **Embouts reste visible** dans le stepper (pas de masquage d'étape).
- Un message d'information s'affiche sur cette étape : *« Les supports sélectionnés remplacent les
  embouts. »*
- Les champs `embout` / `embout_arriere` sont masqués sur cette étape.
- Toute sélection déjà présente sur ces champs est **purgée** de `selection.produits` (donc absente
  du payload panier).

```json
{ "refBase": "66737", "label": "2 Naissances murales Ø 16 mm", "replacesEmbouts": true }
```

---

## Visibilité — `showIf` et `showIfAny`

La visibilité s'évalue à deux niveaux :
- **Champ** (`field.showIf`) — masque ou affiche tout le champ.
- **Option** (`option.showIf` / `option.showIfAny`) — masque ou affiche une carte produit ou un bouton radio individuellement.

### `showIf` — toutes conditions vraies (AND)

```json
"showIf": {
  "type_de_support": ["simple"],
  "diametre": ["25", "31"],
  "longueur": { "gt": 180, "lte": 240 }
}
```

Toutes les clés doivent être satisfaites simultanément.

**Formes de condition :**

| Forme | Exemple | Sens |
|---|---|---|
| Liste de valeurs | `["simple", "double"]` | La valeur sélectionnée doit être dans la liste |
| Seuil numérique `gt` | `{ "gt": 180 }` | valeur > 180 |
| Seuil numérique `gte` | `{ "gte": 180 }` | valeur ≥ 180 |
| Seuil numérique `lt` | `{ "lt": 240 }` | valeur < 240 |
| Seuil numérique `lte` | `{ "lte": 240 }` | valeur ≤ 240 |
| Plage (AND sur la même clé) | `{ "gt": 180, "lte": 240 }` | 180 < valeur ≤ 240 |
| Exclusion | `{ "not": ["corner"] }` | La valeur ne doit PAS être dans la liste |
| Produit sélectionné | `"selected:support": ["66744"]` | Le `refBase` sélectionné dans le champ `support` doit être `66744` |

### `showIfAny` — au moins une condition vraie (OR)

Utilisé quand un produit doit apparaître pour deux plages de valeurs non contiguës.

```json
"showIfAny": [
  { "diametre": ["16"], "longueur": { "lte": 180 } },
  { "diametre": ["16"], "longueur": { "gt": 240 } }
]
```

Chaque entrée du tableau est un bloc `showIf` complet (AND interne). Il suffit qu'**un** bloc soit vrai pour que l'option soit visible.

> **Convention** : `showIf` pour les conditions simples et les plages uniques. `showIfAny` uniquement quand deux plages de longueur non contiguës doivent activer la même option (exemple typique : tube 180 cm visible pour ≤ 180 cm **ou** > 240 cm et donc en plusieurs qty avec coupe).

---

## Sélection par défaut conditionnelle — `defaultIf`

`defaultIf` porte la **même forme** que `showIf` (mêmes formes de condition : liste de valeurs, seuils
`gt`/`gte`/`lt`/`lte`, `not`, `selected:`), mais son rôle est différent : il n'affecte **jamais** la
visibilité d'une option, seulement son éligibilité à devenir le choix pré-sélectionné par défaut.

```json
{
  "refBase": "66732",
  "label": "2 Supports mixtes plafond-mur Ø 16 mm",
  "showIf": { "type_pose": ["mur", "plafond"], "diametre": ["16"] },
  "defaultIf": { "longueur": { "gt": 160 } }
}
```

Dans cet exemple, l'option est **visible et sélectionnable manuellement quelle que soit la
longueur** (le `showIf` ne porte plus de condition de longueur) ; mais elle ne devient le choix
**automatique** que si la longueur configurée dépasse 160 cm.

### Algorithme de résolution du défaut

Parmi les options visibles (déjà filtrées par `showIf`), le moteur choisit dans cet ordre :

1. La première option visible dont le `defaultIf` correspond à la sélection courante.
2. Sinon, la première option visible qui ne porte **aucun** `defaultIf` (comportement historique,
   inchangé pour tout champ qui ne déclare pas cette propriété).
3. Sinon (toutes les options visibles portent un `defaultIf` qui ne correspond pas), la première
   option visible tout court — filet de sécurité qui garantit qu'un champ obligatoire n'est jamais
   laissé sans sélection.

L'option retenue en 2 ou 3 reste un choix par défaut ordinaire ; `defaultIf` ne fait que faire
gagner en priorité une option normalement plus bas dans l'ordre de déclaration quand sa condition
est remplie. Une option jamais choisie par défaut reste toujours sélectionnable manuellement par
l'utilisateur — c'est tout l'intérêt de séparer `defaultIf` de `showIf`.

### Combiner avec une option `isNone`

Pour qu'un champ optionnel ne présélectionne **rien** tant qu'aucune option n'est recommandée,
combiner `defaultIf` avec une option `isNone` (voir plus bas) placée sans `defaultIf` : elle sert de
palier 2 (choix par défaut « neutre ») tant qu'aucune option réelle ne remplit son `defaultIf`.

```json
{ "refBase": "none", "label": "Sans support intermédiaire", "isNone": true },
{ "refBase": "66732", "label": "…", "showIf": { "...": "..." }, "defaultIf": { "longueur": { "gt": 160 } } }
```

En dessous de 160 cm : aucune option réelle ne remplit son `defaultIf` → l'option `isNone` (palier 2,
premier ungated) est retenue par défaut. Au-dessus de 160 cm : l'option réelle remplit son
`defaultIf` → elle passe en palier 1 et devient le défaut, sans jamais avoir été masquée.

---

## Labels dynamiques — `labelByConfig`

Permet d'afficher un label différent selon la valeur d'un paramètre de configuration, sans dupliquer le champ.

```json
{
  "id": "embout",
  "label": "Embout",
  "labelByConfig": {
    "type_de_support": {
      "simple": "Embout",
      "double": "Embout (avant)"
    }
  }
}
```

Le moteur cherche `selection[configKey]` et retourne le label correspondant. Si aucune correspondance, retombe sur `field.label`.

---

## Configuration double — `diametreFrom`

En configuration double, `selection.diametre` est une valeur composée (`"16+25"`, `"28+28"`).
Le format est `"arriere+avant"`.

Un champ peut déclarer `diametreFrom` pour indiquer quelle part de diamètre utiliser lors du filtrage de ses options :

```json
{ "id": "tube_avant",   "diametreFrom": "avant"   }
{ "id": "tube_arriere", "diametreFrom": "arriere"  }
```

Le moteur extrait la bonne valeur avant d'évaluer les `showIf` des options. Un champ sans `diametreFrom` reçoit le diamètre composé tel quel.

---

## Dédoublement automatique — `splitByConfig`

Permet de déclarer **un seul champ** qui génère automatiquement plusieurs variantes selon la valeur d'un paramètre. Évite de dupliquer les `options[]` dans le JSON.

```json
{
  "id": "tube",
  "label": "Tube",
  "type": "product",
  "quantity": { "mode": "segmented" },
  "splitByConfig": "type_de_support",
  "configs": {
    "simple": [
      { "id": "tube" }
    ],
    "double": [
      { "id": "tube_avant",   "label": "Tube (avant)",   "diametreFrom": "avant"   },
      { "id": "tube_arriere", "label": "Tube (arrière)", "diametreFrom": "arriere" }
    ]
  },
  "options": [ ... ]
}
```

**Comportement :** au chargement, le moteur expand ce champ en autant d'instances que nécessaire. Chaque instance hérite de toutes les propriétés du champ de base, surcharge avec ses propres overrides (`id`, `label`, `diametreFrom`), et reçoit un `showIf` automatique sur le paramètre de split.

L'exemple ci-dessus génère en runtime :

```
type_de_support = "simple"  →  1 champ : tube         (showIf: type_de_support = simple)
type_de_support = "double"  →  2 champs : tube_avant  (showIf: type_de_support = double)
                                           tube_arriere (showIf: type_de_support = double)
```

**Les `options[]` ne sont déclarées qu'une seule fois.** Si un nouveau tube est ajouté à une collection, il est ajouté à un seul endroit, quelle que soit la config (simple ou double).

**Cas sans split :** un champ sans `splitByConfig` se comporte normalement. Un champ unique pour simple ET double s'écrit sans `splitByConfig` — il reste unique (exemple : un support mural identique en simple et double).

---

## Quantités — `quantity`

Chaque champ `product` peut porter une règle `quantity` qui indique au moteur comment calculer la quantité à commander.

```json
"quantity": {
  "mode": "fixed",
  "value": 2
}
```

| `mode` | Calcul | Usage typique |
|---|---|---|
| `fixed` | `ceil(value / qtyParUnite)` | Embouts, supports (quantité connue d'avance) |
| `segmented` | `ceil(longueur / option.tubeLength)` | Tubes — dépend de la longueur ET du tube sélectionné |
| `segmented_minus_1` | `max(0, segmented - 1)` | Abouts de tube — nombre de jointures = tubes - 1 |
| `per_interval` | `ceil(longueur / interval)` | Anneaux, crochets (1 tous les N cm) |

### `segmented` et `tubeLength`

Pour `segmented`, le moteur lit la propriété `tubeLength` de l'option sélectionnée :

```json
{
  "refBase": "66084",
  "label": "Tube Ø 16 mm - 180 cm",
  "tubeLength": 180,
  "showIfAny": [
    { "diametre": ["16"], "longueur": { "lte": 180 } },
    { "diametre": ["16"], "longueur": { "gt": 240  } }
  ]
}
```

Calcul : `ceil(265 / 180) = 2` → 2 tubes de 180 cm pour une longueur de 265 cm.

### `segmented_minus_1` et abouts de tube

La quantité d'abouts est calculée par le moteur à partir de la quantité de tubes du champ associé. Elle n'est **pas** à calculer ou déclarer manuellement dans le JSON. Le champ about de tube est automatiquement masqué quand un seul tube suffit (quantité d'abouts = 0).

```json
{
  "id": "about_tube",
  "type": "product",
  "quantity": { "mode": "segmented_minus_1" },
  "splitByConfig": "type_de_support",
  "configs": { ... }
}
```

> **Règle** : ne pas ajouter de `showIf` sur `longueur` pour les champs about de tube. La visibilité est entièrement gérée par le moteur via le calcul de quantité.

---

## Récapitulatif des responsabilités data / JS

| Responsabilité | Data (JSON) | JS (moteur) |
|---|---|---|
| Quels produits sont disponibles pour ce diamètre | `showIf.diametre` | — |
| Quelle longueur de tube afficher | `showIf.longueur` / `showIfAny` | — |
| Combien de tubes commander | `tubeLength` sur l'option | `ceil(longueur / tubeLength)` |
| Afficher ou non les abouts de tube | — | `tubeQty > 1` |
| Combien d'abouts commander | — | `tubeQty - 1` |
| Dédoublement simple/double | `splitByConfig` + `configs` | expansion au render |
| Quel diamètre filtrer pour tube avant/arrière | `diametreFrom` | extraction `avant`/`arriere` |
| Label "Embout" vs "Embout (avant)" | `labelByConfig` | lecture + affichage |
| Produit inclus ou exclu par défaut | position de l'option `isNone` dans le tableau | sélection automatique de `options[0]` visible |
| Exclure un produit optionnel du panier | `isNone: true` sur l'option | emit `refBase: null` → supprimé de `selection.produits` |
