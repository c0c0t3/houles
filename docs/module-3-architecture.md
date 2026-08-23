# Module 3 — Configurateur : Architecture & modèle de données

> Module fondation. Il définit la structure de données commune à toutes les collections,
> la couche d'accès aux données, et les conventions SVG. Tous les autres modules en dépendent.
> **À implémenter en premier.**

---

## Objectif

Poser une architecture **ouverte et générique** : un seul moteur de configurateur capable de
gérer les 20 collections de tringlerie, sans réécriture ni rework du modèle de données quand
une nouvelle collection est ajoutée (autres embouts, autres diamètres, autres coloris).

Le principe directeur : **le configurateur est piloté par la donnée**. La structure du formulaire,
les étapes, les champs et les produits sont décrits dans un schéma JSON par collection. Le code JS
lit ce schéma et construit l'interface ; il ne contient aucune donnée produit en dur.

---

## Livrables du module

1. Vue Twig (squelette de la page configurateur)
2. Modèle de données générique commun à toutes les collections
3. Système de règles de compatibilité (filtrage des options)
4. Couche d'accès data `fetch` (mock API, point de bascule vers le vrai back)
5. Fausses données JSON pour le développement local
6. Système de chargement dynamique des SVG par sélection
7. Convention de nommage et routing SVG

---

## 1. Vue Twig (squelette)

Fichier : `src/templates/pages/configurateurTringlerie/index.twig`

La vue Twig fournit la **coquille statique** de la page. Elle ne contient aucune option produit
(celles-ci sont injectées en JS depuis le JSON). Elle déclare les conteneurs que le JS viendra remplir :

- Conteneur du stepper (navigation entre étapes)
- Conteneur de l'étape courante (zone réécrite à chaque changement d'étape)
- Zone de rendu visuel : composition de produits (modes `live` / `live_colored`)
- Conteneur du prix temps réel
- Conteneur / point d'ancrage du panier (drawer)

Les composants de champ (fields) sont des partials Twig réutilisables, déclarés en `<template>`
pour pouvoir être clonés et remplis en JS. Voir Module 4.

---

## 2. Modèle de données générique

Le schéma JSON décrit une collection complète. Il est **commun à toutes les collections** :
seule la donnée change, jamais la structure.

### Structure de haut niveau

```json
{
  "collection": {
    "id": "auro",
    "name": "Auro",
    "renderMode": "none",
    "coloris": [ ... ]
  },
  "steps": [ ... ]
}
```

### Mode de rendu `renderMode`

Détermine le **layout** de la page et le **type de rendu visuel** de la collection.
Il existe trois cas :

| `renderMode` | Layout | Rendu visuel | Colorisation SVG |
|---|---|---|---|
| `none` | 1 colonne (form seul) | aucun | non |
| `live` | 2 colonnes (rendu + form) | composition de photos produits réelles | non |
| `live_colored` | 2 colonnes (rendu + form) | photos + calques SVG colorisés (ex : Alvero) | oui |

- `live` = `none` + rendu photo (activé quand le client a fourni tous ses shoots produits).
- `live_colored` = `live` + couche de colorisation SVG par-dessus.

Un seul moteur gère les trois modes : il adapte le layout et active ou non la zone de rendu / la
colorisation selon `renderMode`.

### Personnalisation du coloris par élément (tous les modes)

**Important** : la personnalisation du coloris par pièce existe dans **tous les modes de rendu**,
y compris `none`. Elle ne dépend pas du `renderMode`.

- Le coloris choisi à l'étape 1 **pré-remplit** le coloris par défaut de chaque produit.
- L'utilisateur peut ensuite **changer la couleur d'une pièce indépendamment** (ex : tube laiton
  brillant + embouts rose mat — toute combinaison est permise).

Ce qui varie d'un mode à l'autre, c'est le **rendu visuel**, pas la possibilité de personnaliser
les coloris.

### Propagation du coloris global après sélection

Le pré-remplissage ne joue pas qu'au premier chargement : **cliquer une option du champ `coloris`
répercute la couleur sur tous les produits déjà sélectionnés qui proposent cette couleur** — pas
seulement le produit actuellement affiché à l'écran. Un produit dont l'étape n'est pas visible au
moment du clic (pas encore visitée, ou masqué par `showIf`) est mis à jour de la même façon, pour
qu'il affiche déjà la bonne couleur le jour où il redevient le défaut (ex : après un changement de
diamètre qui invalide la sélection courante et fait retomber le moteur sur `first_visible`).

Un produit qui ne propose pas la couleur choisie **garde sa couleur actuelle** — pas de fallback
vers un autre coloris à cette étape (le fallback « premier coloris disponible » ne s'applique qu'à
la résolution du défaut initial, voir Module 5). Ce réalignement est un geste volontaire de
l'utilisateur (« repartir sur cette base de couleur ») ; une fois fait, chaque pièce reste à nouveau
librement modifiable indépendamment, comme décrit ci-dessus.

Implémenté par `ProductField.applyGlobalColoris()` (un par champ produit monté, y compris ceux des
étapes non affichées), appelé par l'orchestrateur à chaque changement du champ `coloris` — voir
Module 5, section « Coloris par élément ».

### Étapes (`steps`)

`steps` est un **tableau** (l'ordre est garanti, on itère dessus pour générer le stepper).
Chaque étape a un `id`, un `label`, et un tableau de `fields`.

### Champs (`fields`)

Chaque champ porte un `type` qui pilote son rendu DOM. Le moteur est un switch sur `field.type` :

| `type` | Rôle | Génère une ligne panier ? |
|---|---|---|
| `radio` | choix unique (param de config) | non |
| `radio` + `dependsOn` | options filtrées selon un champ amont | non |
| `length` | presets + saisie sur-mesure (min/max) | non |
| `coloris` | nuancier + recherche (sélection par élément, tous modes) | non |
| `product` | carte produit avec variantes | oui |
| `product_toggle` | produit avec bascule AVEC / SANS | oui (si AVEC) |

Règle : **si le champ a un prix, c'est un produit ; sinon c'est un paramètre.**
Les paramètres servent de critères de filtrage pour les étapes produit suivantes.

### Variantes coloris

Un produit s'affiche **une seule fois** (un `refBase`, un label, une image) et porte un objet
`variants` keyé par coloris. Le coloris choisi à l'étape 1 résout la variante réelle (id, prix,
stock, svgUrl) au moment de l'ajout au panier.

```json
{
  "refBase": "SUP-MUR-110",
  "label": "Supports extensibles 110mm mur",
  "qtyParUnite": 2,
  "showIf": { "type_pose": ["mur_plafond"], "diametre": ["16"] },
  "variants": {
    "laiton": { "id": "66776-24", "prix": 40.98, "stock": 108 },
    "nickel": { "id": "66776-12", "prix": 43.20, "stock": 22 }
  }
}
```

Le prix peut varier selon le coloris → il vit au niveau variante, pas produit.

**Prix et stock dans la réponse de collection.** `prix` et `stock` sont présents sur chaque produit
(au niveau variante, ou à la racine pour les produits sans coloris). Ils sont servis côté client
depuis Elastic (couche de lecture rapide qui décharge la BDD), rafraîchis toutes les 5 minutes.

Conséquences :
- La réponse de collection porte des données **tièdes** (5 min de fraîcheur). Elle n'est donc pas
  cacheable très longtemps ; le front rappelle `fetchCollection` à chaque ouverture du configurateur
  pour des prix/stocks frais, plutôt qu'un cache long.
- Un prix ou stock affiché pendant la configuration peut avoir jusqu'à 5 min. Ce n'est pas un
  problème : le **check d'autorité a lieu à l'ajout panier** (côté client), qui revalide prix et
  stock réels au moment qui engage. Le front n'est responsable d'aucune validation prix/stock — il
  affiche ce qu'on lui donne et transmet la sélection à l'ajout.
- En démo, les valeurs prix/stock sont des placeholders.

**Codification des identifiants** : l'`id` d'une variante est le code article complet, au format
`code_famille-code_coloris` (ex : `64060-55` = famille `64060` + coloris `55`). Le `refBase` porte
la famille, la clé de variante porte le coloris. Le front **lit** l'`id` complet fourni, il ne le
**compose jamais** lui-même.

### Produits sans coloris

Certains produits techniques (rouleurs, raccords, visserie) n'ont **pas de coloris** — leur code
article est la famille seule (ex : `23085 — 32 rouleurs silencieux`, sans suffixe `-XX`).

Ces produits ne portent pas d'objet `variants` : l'`id` est directement à la racine du produit.

```json
{
  "refBase": "23085",
  "id": "23085",
  "noColoris": true,
  "label": "32 rouleurs silencieux pour rail",
  "qtyParUnite": 1,
  "prix": 17.44
}
```

Règle pour le moteur : **si le produit a un objet `variants`, résoudre par coloris ; sinon prendre
l'`id` et le `prix` à la racine.** Les deux structures coexistent dans une même collection.

### Calcul de quantité (déclaratif)

Chaque champ produit peut porter une règle `quantity` interprétée par le moteur.
**En démo, le calcul est affiché à titre indicatif ; le calcul réel est côté client.**

| `mode` | Usage |
|---|---|
| `fixed` | quantité fixe |
| `fixed_by_config` | dépend de simple/double |
| `per_interval` | calcul sur la longueur (ex : anneaux 1/10cm) |
| `segmented` | découpe en segments + produit lié (ex : tube 100cm → tubes + raccords) |

### Configuration double : décomposition du diamètre et champs position

En configuration double, le diamètre est une valeur composée (`16+25`, `28+28`, `19+28`).
Il se **décompose à la source** en parts `avant` / `arriere` dès la définition de l'option :

```json
"options": {
  "double": [
    { "id": "19+28", "label": "Ø 19 + 28 mm", "avant": "28", "arriere": "19" },
    { "id": "28+28", "label": "Ø 28 + 28 mm", "avant": "28", "arriere": "28" }
  ]
}
```

Le dédoublement des éléments **n'est pas une règle automatique** ("double = ×2"). Il est porté par
la **déclaration explicite des champs** dans le JSON de chaque collection. Un élément qui se dédouble
est déclaré en deux champs préfixés par leur position ; un élément unique en double reste un champ
simple.

Convention de nommage des champs :
- `tube_avant` / `tube_arriere`, `embout_avant` / `embout_arriere`, etc. → l'élément se dédouble.
- nom de base seul (`embout`, `support`) → l'élément est unique même en config double.
- La présence du suffixe `_avant` / `_arriere` **est** le signal de dédoublement.

Chaque champ position lit la part de diamètre qui le concerne via `diametreFrom` :

```json
{ "id": "tube_avant",   "type": "product", "diametreFrom": "avant" }
{ "id": "tube_arriere", "type": "product", "diametreFrom": "arriere" }
```

Cela couvre les trois cas réels sans logique en dur :
- **Auro double** : barre arrière sans embout par design → un seul champ `embout` → 1 ligne.
- **Alium double 28+28** : `embout_avant` + `embout_arriere`, même Ø → 2 lignes identiques.
- **ACEA double 19+28** : `embout_avant` (Ø28) + `embout_arriere` (Ø19) → 2 lignes différentes.

### Autres cas particuliers

- `replacesEmbouts: true` sur une option support (naissances murales, corners) → l'étape Embouts
  reste visible avec un message d'information, ses champs produit sont masqués, et toute ligne
  embout déjà présente est purgée du panier (voir Module 5, section 3).

---

## 3. Système de règles de compatibilité

Le filtrage des options s'appuie sur les paramètres choisis en amont (diamètre, type de pose,
système, coloris...).

### Filtrage front via `showIf`

Le `showIf` de chaque option est **contenu dans la réponse de l'API** (mock comme réelle).
Le front lit `showIf` et filtre les options de façon **identique en démo et en production** — seule
l'URL d'où provient le JSON change, jamais la logique.

Une option n'est affichée que si **toutes** ses conditions matchent la sélection courante.
Le `showIf` supporte quatre formes de condition :

| Forme | Exemple | Sens |
|---|---|---|
| Égalité (liste de valeurs admises) | `"diametre": ["25", "31"]` | la valeur sélectionnée doit être dans la liste |
| Seuil numérique | `"longueur": { "gt": 160 }` | la valeur doit être > 160 (aussi `gte`, `lt`, `lte`) |
| Négation / exclusion | `"selected:support": { "not": ["66764"] }` | la valeur ne doit PAS être dans la liste |
| Référence à un autre champ produit | `"selected:support": ["66744"]` | lit le `refBase` sélectionné dans le champ `support` |

Les deux dernières formes introduisent la **dépendance produit → produit** : une option peut dépendre
de ce qui a été choisi dans un autre champ produit, pas seulement des paramètres. Le préfixe
`selected:` indique au moteur de lire le `refBase` sélectionné dans le champ nommé.

```js
function isVisible(option, selection) {
  if (!option.showIf) return true;
  return Object.entries(option.showIf).every(([key, cond]) => {
    // Résolution de la valeur courante selon le type de critère
    let valeur;
    if (key.startsWith('selected:')) {
      const champ = key.slice(9);                       // ex: "support"
      valeur = selection.produits?.[champ]?.refBase;    // refBase sélectionné
    } else {
      valeur = selection[key];                          // paramètre normal
    }

    // Évaluation selon la forme de la condition
    if (Array.isArray(cond)) return cond.includes(valeur);            // égalité
    if (cond.not)  return !cond.not.includes(valeur);                 // négation
    if (cond.gt  !== undefined) return Number(valeur) >  cond.gt;     // seuils
    if (cond.gte !== undefined) return Number(valeur) >= cond.gte;
    if (cond.lt  !== undefined) return Number(valeur) <  cond.lt;
    if (cond.lte !== undefined) return Number(valeur) <= cond.lte;
    return true;
  });
}
```

Tolérance aux attributs absents : une condition portant sur une valeur non encore sélectionnée
est traitée comme non bloquante au choix du moteur (à caler — typiquement on masque tant que le
critère amont n'est pas renseigné).

### Sélection par défaut : premier visible, ou `defaultIf`

Le moteur pré-sélectionne **la première option qui passe le filtrage `showIf`** selon la sélection
courante (type, diamètre, pose...), puis résout sa variante coloris. L'ordre de déclaration des
options est donc significatif : le premier visible = le défaut.

> **Précision (2026-08-23) :** le champ `default` (`refBase` fixe ou `"first_visible"`) décrit à
> l'origine dans ce document n'est **pas lu par le moteur** — il n'a jamais été implémenté ainsi.
> Le vrai mécanisme est le premier-visible décrit ci-dessus, éventuellement réordonné par
> `defaultIf` (propriété d'option, voir `json-schema-reference.md` et Module 5) pour faire
> gagner en priorité une option dont une condition (souvent un seuil de longueur) est remplie,
> sans jamais la retirer de la liste des choix possibles. `default` reste toléré dans le JSON
> (ignoré silencieusement) mais ne doit plus être utilisé comme documentation du comportement réel.

La résolution détaillée (filtrage produits, priorité `defaultIf`, puis résolution coloris avec
fallback) est décrite au Module 5.

### Contexte

Volume : ~30 produits par collection. Le `showIf` filtre **côté front**, en mémoire, instantanément
(aucun appel réseau quand l'utilisateur change un champ de config — pas de loader sur la config).

Côté production, le back utilise Elastic pour aller chercher les produits. Que le back filtre déjà
en amont via Elastic ou renvoie l'ensemble de la collection, **le front filtre toujours avec
`showIf`** : c'est ce qui garantit la réactivité instantanée de la config. Le `showIf` est dans la
réponse (mock ou réelle), le front l'applique de façon identique. Le front n'appelle jamais Elastic
directement — c'est invisible pour lui, il consomme un JSON.

---

## 4. Couche d'accès data (fetch)

Fichier : `src/js/syh/configuratorApi.js`

Toutes les requêtes data passent par ce module unique. C'est le **seul point de bascule** entre le
mock et le vrai back : le client n'a qu'à changer l'URL de base.

```js
const BASE = '/mock-api'; // ← point de bascule unique vers le vrai back

export async function fetchCollection(slug) {
  const res = await fetch(`${BASE}/collections/${slug}.json`);
  if (!res.ok) throw new Error(`Collection ${slug} introuvable`);
  return res.json();
}
```

### Pricing / check à l'ajout panier

Le prix et le stock d'affichage sont déjà dans la réponse de collection (servis depuis Elastic,
voir section Variantes). L'appel pricing dédié sert donc au **check d'autorité à l'ajout panier** :
au clic « Ajouter au panier », le client revalide prix et stock réels au moment qui engage.

```js
export async function checkCart(items) {
  // items: [{ id: "64060-55", qty: 1 }, ...]  (qty = quantité commandable, déjà arrondie)
  const res = await fetch(`${BASE}/cart-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Vérification panier indisponible');
  return res.json(); // { lines: [{ id, prixUnitaire, prixTotal, dispo }], total }
}
```

Le calcul réel (remises — ex : 45%) et la validation stock sont **côté client**. Le front transmet
la sélection et affiche le retour ; il ne décide rien. En démo, un retour de succès basique suffit
à démontrer le flux.

### Quantités : pas de mock

Le calcul de quantité (anneaux 1/10cm, tubes segmentés...) n'est **pas** un appel réseau. C'est une
logique front déclarative (règles `quantity` du JSON), calculée localement dans `quantities.js`. La
quantité calculée (arrondie au `qtyParUnite`) alimente l'item envoyé au check panier, mais ne
nécessite aucun endpoint.

Règles :
- Aucun `fetch` ailleurs dans le code que dans ce module.
- Simuler une latence (~300ms) sur les mocks pour reproduire le comportement réel (états de chargement).
- Prévoir la gestion d'erreur (réseau, 404) dès la démo.

---

## 5. Fausses données JSON (développement local)

Emplacement : `mock-api/collections/`

- Un fichier JSON par collection de démo, respectant strictement le modèle générique.
- Commencer par 1 à 2 collections représentatives (pas les 20).
- Couvrir les modes de rendu : au moins une collection `none`, une `live` et une `live_colored`.
- Inclure les cas limites : `replacesEmbouts`, configuration double, longueur sur-mesure.

Ces fichiers JSON **sont le contrat d'API** : ils servent de spécification au client pour le format
que son back devra renvoyer. À soigner comme une doc d'interface.

---

## 6 & 7. Chargement et routing des SVG

### Principe

Les SVG sont chargés en **inline via fetch** (jamais en `<img>` ou `url()`), pour pouvoir cibler les
paths en JS et appliquer la colorisation. Voir Module 6 pour la composition et la colorisation.

### Le chemin SVG est une donnée, pas une constante

Le chemin du SVG provient du champ `svgUrl` de la réponse API, au niveau de la variante (ou du
produit selon les cas). Le code **lit toujours `svgUrl`, ne le construit jamais en dur**.

```json
"variants": {
  "laiton": { "id": "63001-24", "prix": 18.00, "svgUrl": "/svg/syh/embout-vase-35.svg" }
}
```

- **Démo** : `svgUrl` pointe vers `public/svg/syh/` (copié dans `dist/` au build, servi statiquement).
- **Production** : l'API fournit l'URL réelle. Le front ne change pas.

### Convention de nommage (démo uniquement)

Pour organiser les fichiers de démo localement, convention recommandée :

```
{element}-{modele}-{diametre}.svg
ex : embout-vase-35.svg, support-mur-25.svg
```

Cette convention sert à **organiser les fichiers de démo**. Le code ne s'appuie pas dessus pour
router (il consomme `svgUrl`). Le client pourra nommer ses fichiers autrement sans casser le front.

---

## Organisation du code JS

Découpage par responsabilité, un module = une responsabilité. Le préfixe `syh-` est inutile
(les fichiers sont déjà dans `syh/`).

```
src/js/syh/
  syh.js                 ← point d'entrée : instancie et branche tout
  configurator.js        ← orchestrateur (état, sélection, cycle de vie)
  configuratorApi.js     ← couche fetch (mock / réel)
  features/
    show-if.js           ← filtrage des options
    quantities.js        ← moteur de calcul de quantités
    svg-renderer.js      ← composition + colorisation SVG (mode live_colored)
    embouts.js           ← cas replacesEmbouts (voir Module 5, section 3)
    cart-payload.js      ← construction du payload panier (items, quantités, coupes)
    recap.js             ← récapitulatif persistant de l'étape 1
```

Note : pas de fichier `steps.js` séparé — la navigation entre étapes reste dans `configurator.js`
(orchestrateur). Le cas `replacesEmbouts` est implémenté dans `features/embouts.js` (voir Module 5,
section 3).

Règles :
- Chaque module exporte des fonctions pures ou une classe ; il ne connaît les autres que par import.
- `syh.js` est le seul à assembler.
- Ne pas sur-découper en amont : extraire un module quand un fichier dépasse ~150 lignes ou qu'une
  responsabilité devient claire.

---

## Points de décision encore ouverts

À confirmer avec le client avant ou pendant l'implémentation (ne pas trancher seul) :

- Format de ligne attendu par le JS panier du client (pour le markup templatisable).
- Style d'accroche du JS client : data-attributes, événements custom, ou API de composant.