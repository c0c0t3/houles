# Module 4 — Configurateur : Étape 1 (Configuration) & moteur d'interactivité

> Couvre la vue Twig, les composants fields, l'orchestrateur JS qui fait vivre le tunnel,
> et l'étape 1 (Configuration) en détail. Dépend du Module 3 (modèle de données, fetch).
> À lire avant toute implémentation de l'interface du configurateur.

---

## Périmètre

Ce module pose la **mécanique du configurateur** : comment le DOM est généré depuis le JSON,
comment l'utilisateur navigue entre les étapes, comment la sélection est tenue en mémoire, et
comment les champs réagissent entre eux. L'étape 1 (Configuration) sert de premier terrain
d'application, mais le moteur est générique et sert toutes les étapes.

Frontière : ce module produit un **front intégrable** avec faux back (fetch mock). La logique
métier réelle (panier réactif, pricing, stock) est côté client. Voir CLAUDE.md.

---

## 1. Vue Twig (squelette)

Fichier : `src/templates/pages/configurateurTringlerie/index.twig`

La vue fournit la coquille statique : conteneurs que le JS remplit, jamais les options elles-mêmes
(injectées dynamiquement depuis le JSON). Elle déclare :

- Le conteneur racine du configurateur (`data-component="Configurator"`)
- Le stepper (navigation entre étapes)
- Le conteneur de l'étape courante (zone réécrite à chaque changement d'étape)
- Le conteneur du prix temps réel
- Le point d'ancrage du panier (drawer)
- En mode `live` / `live_colored` uniquement : la zone de rendu visuel (2 colonnes)

Le layout (1 ou 2 colonnes) découle du `renderMode` de la collection (voir Module 3).

---

## 2. Composants fields

Les champs du formulaire sont des composants Twig réutilisables, pilotés par le `type` déclaré dans
le JSON. Le moteur de rendu est un switch sur `field.type` :

| `type` | Composant | Rôle |
|---|---|---|
| `radio` | RadioField | choix unique, variantes d'affichage via `variant` |
| `length` | LengthField | presets + saisie sur-mesure (min/max) |
| `product` | ProductField | carte produit, défaut + mini-modale d'alternatives |
| `product_toggle` | ProductToggleField | produit avec bascule AVEC / SANS |
| `coloris` | ColorisField | nuancier + recherche (nom, Pantone, hex) |

### Le composant RadioField et ses variantes

Un seul composant gère tous les radios. La forme d'affichage est portée par `variant`, pas par des
composants séparés (le châssis — bordure, indicateur de sélection — est identique) :

| `variant` | Contenu affiché | Layout |
|---|---|---|
| `label` | label seul | compact, centré |
| `label_image` | label + image | titre + image |
| `card` | label + image + description | image à gauche, texte à droite |

Les classes sont calculées en haut du template Twig (map de variantes), le markup reste lisible.
Le `variant` est **explicite dans le JSON**, jamais déduit des données présentes.

### Label dynamique : `labelByConfig`
 
Un champ peut adapter son label selon la valeur d'un paramètre, via `labelByConfig`. Utile quand le
même champ a un sens différent selon la configuration.
 
```json
{
  "id": "embout",
  "label": "Embout",
  "labelByConfig": { "simple": "Embout", "double": "Embout (avant)" }
}
```
 
Comportement du moteur : si `labelByConfig` est présent, le composant affiche
`labelByConfig[valeur_du_param]` ; sinon il retombe sur `label`. Le paramètre observé est déduit du
contexte (ici `type_de_support`) — à défaut d'un mapping explicite, le champ `label` sert de valeur
par défaut.
 
Cas d'usage réel : l'étape embouts a un champ `embout` visible en simple ET en double. En simple il
n'y a pas d'avant/arrière, donc le label reste « Embout » ; en double, un second champ
`embout_arriere` apparaît, et le champ principal devient « Embout (avant) » pour lever l'ambiguïté.
`labelByConfig` évite de dédoubler le champ juste pour changer son titre.

### Le composant LengthField

Presets cliquables + un choix « sur-mesure » qui révèle un input number. La valeur finale du champ
est unifiée (toujours un nombre), que la source soit un preset ou la saisie custom. Validation
contre `custom.min` / `custom.max` ; tant que la valeur est invalide, elle n'est pas propagée
(blocage de l'étape suivante).

### Le composant ProductField

Affiche le produit par défaut (`default` : `refBase` fixe ou `first_visible`), avec une mini-modale
pour choisir une alternative parmi les options visibles. Détail du comportement produit, du défaut
et des dépendances : Module 5.

### Génération du DOM

Le DOM des champs est **généré en JS** depuis le JSON, pas écrit en dur dans la vue. Approche
recommandée : composants Twig déclarés en `<template>`, clonés et remplis par le JS, puis montés
par JS Toolkit. Les composants ajoutés dynamiquement sont montés automatiquement (voir section 3).

---

## 3. Moteur d'interactivité (orchestrateur)

Fichier : `src/js/syh/configurator.js` (+ point d'entrée `syh.js`)

Le configurateur est un composant `Base` (JS Toolkit) qui détient l'état et orchestre les champs.

### État central

```js
selection = {
  // paramètres (isParam)
  type_de_support: "double",
  diametre: "16+25",
  type_pose: "mur",
  longueur: 220,
  coloris: "35",
  // produits sélectionnés, indexés par id de champ
  produits: {
    support:      { refBase: "66778", coloris: "35" },
    tube:         { refBase: "66105", coloris: "35" },
    embout_avant: { refBase: "66896", coloris: "35" }
    // un par champ produit, à travers toutes les étapes
  }
}
```

`selection.produits` est indexé par **id de champ** (pas par étape) — c'est ce qui permet aux
dépendances `selected:<id>` de fonctionner à travers les étapes (voir Module 3). **Les id de champs
doivent donc être uniques sur toute la collection.**

### Cycle de rendu

À chaque changement de sélection, l'orchestrateur :
1. Met à jour `selection`
2. Réévalue les options visibles de l'étape courante (`isVisible` / `showIf`)
3. Re-rend la zone concernée
4. Recalcule les quantités et le panier (Module 5)
5. Met à jour le prix affiché

Le re-render est **explicite** (pas de réactivité automatique type Vue). Sur un tunnel à étapes,
ça donne un contrôle prévisible du moment et de la portée du rendu.

### Montage des composants injectés (JS Toolkit v3)

Les champs sont injectés à chaque étape, donc absents du DOM au `createApp` initial. JS Toolkit monte
automatiquement les `data-component` ajoutés tardivement. Si du code doit accéder à un enfant juste
après l'avoir injecté, `await this.$update()` (les méthodes de cycle de vie sont asynchrones en v3).

Contraintes v3 à respecter :
- Chaque composant déclare les events qu'il émet via `emits` dans `static config`.
- Les handlers d'events reçoivent un seul argument de contexte `{ event, args, index, target }`.
- Convention d'écoute parent→enfant : `on{ChildName}{EventName}`.
- `$children` / `$parent` / `$root` sont dépréciés (suppression v4) → utiliser `$query()` / `$closest()`.

### Invalidation en cascade

Au changement d'un champ amont, les sélections aval potentiellement incompatibles doivent être
réinitialisées. Exemple : changer `type_de_support` (simple↔double) invalide le diamètre choisi, donc
tous les produits dépendant du diamètre. Sans ce reset, on obtient des paniers incohérents.

Règle : quand un champ change, réévaluer la visibilité des champs/produits aval ; si une sélection
n'est plus visible, la réinitialiser (et propager).

---

## 4. Étape 1 — Configuration : les champs

L'étape 1 ne contient que des **paramètres** (`isParam: true`) — aucun produit, aucune ligne panier.
Ces paramètres servent de critères de filtrage pour les étapes produit suivantes.

| Champ | type | variant | Rôle |
|---|---|---|---|
| `type_de_support` | radio | label_image | simple / double |
| `diametre` | radio | label | dépend du type (`dependsOn`), décomposé avant/arrière en double |
| `type_rideau` | radio | label_image | simple / double |
| `type_pose` | radio | label_image | mur, plafond, mur à mur, corner (corner conditionnel) |
| `longueur` | length | — | presets + sur-mesure (min/max) |
| `coloris` | radio | — | coloris global, pré-remplit les produits (modifiable par pièce ensuite) |

### Points spécifiques de l'étape 1

- **`diametre` utilise `dependsOn: "type_de_support"`** : bascule entre le groupe `simple` et le
  groupe `double` (voir Module 3). En double, chaque option porte sa décomposition `avant`/`arriere`.
- **`type_pose` peut filtrer une option par `showIf`** (ex : corner visible seulement si diamètre 25).
- **`coloris` pré-remplit** le coloris de chaque produit aval, mais la couleur reste modifiable par
  pièce dans les étapes produit (Module 5).
- **`longueur`** alimente les calculs de quantité aval (anneaux, tubes segmentés) et les seuils
  `showIf` (ex : supports `longueur > 160`).

---

## 5. Affichage du prix temps réel

Dès l'étape 1 (puis à chaque sélection), le prix total se met à jour. Il est calculé à partir des
produits sélectionnés et de leurs quantités. Le prix d'affichage vient du JSON de collection
(données Elastic, voir Module 3) ; la validation d'autorité a lieu à l'ajout panier (côté client).

---

## Organisation du code

```
src/js/syh/
  syh.js                 ← point d'entrée : createApp(Configurator)
  configurator.js        ← orchestrateur (état, cycle de rendu, invalidation)
  configuratorApi.js     ← couche fetch (Module 3)
  features/
    radio-field.js
    length-field.js
    product-field.js
    product-toggle.js
    coloris-field.js
    show-if.js           ← isVisible (Module 3)
```

Note : pas de fichier `steps.js` séparé — la navigation et le cas `replacesEmbouts` sont gérés
directement dans `configurator.js` (voir Module 5, section 3).

Chaque field-feature est un composant `Base` autonome avec son `data-component`. L'orchestrateur les
déclare dans `components` et les monte. Un fichier = un composant = un `data-component`.

---

## Points de décision encore ouverts

- Style d'accroche du JS client (data-attributes, événements, API de composant) — détermine les
  hooks à exposer.
- Comportement exact de l'invalidation en cascade (reset total des champs aval, ou tentative de
  conservation des sélections encore valides).
- Persistance de la sélection en cours (reprendre où l'utilisateur s'est arrêté) — si demandé.