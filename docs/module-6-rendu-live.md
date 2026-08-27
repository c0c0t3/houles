# Module 6 — Configurateur : Rendu visuel live (colonne gauche)

> Couvre le rendu visuel de la configuration en temps réel : la colonne gauche (`.colG`) qui
> compose un aperçu par superposition de calques, reflétant les choix faits à droite.
> Concerne les collections en `renderMode: live` et `live_colored`. Dépend des Modules 3 et 4.

---

## Périmètre

En `renderMode: live` (et `live_colored`), le configurateur passe en layout **2 colonnes** :

- **Colonne droite** (`.colD`) : le tunnel de configuration (étapes, champs) — inchangé.
- **Colonne gauche** (`.colG`) : l'aperçu visuel, composé en temps réel.

`.colG` est **masquée en `renderMode: none`** (layout 1 colonne) et **visible en `live` / `live_colored`**.

L'affichage/masquage de `.colG` est **déjà codé et fonctionnel** :

```js
const hasLive = ['live', 'live_colored'].includes(this.schema.collection.renderMode);
this.$refs.colG.hidden = !hasLive;
```

Principe clé : la colonne gauche est un **miroir passif** de la configuration. L'utilisateur ne
clique jamais sur l'image ; il configure à droite, et l'aperçu à gauche se met à jour. **Aucune zone
cliquable sur l'image.**

`.colG` reflète l'**intégralité** de `selection.produits`, cumulée à travers toutes les étapes — pas
seulement les champs de l'étape courante. Dès le chargement, les valeurs par défaut (`first_visible`,
voir Module 5) alimentent déjà tous les calques : si support, tube et embout sont tous en premier
« argent » dans leurs `options[]` JSON respectifs, l'aperçu initial est cohérent en argent. **L'ordre
de déclaration des options dans le JSON pilote donc directement l'aperçu par défaut** — une erreur
d'ordre (ex : un tube « or » placé avant un tube « argent » alors que le reste de la config par
défaut est en argent) produit un aperçu visuellement incohérent dès le chargement, sans qu'aucune
erreur ne remonte. L'ordre des options doit donc être rigoureusement vérifié pour les collections
`live` / `live_colored`.

---

## 1. Composition par calques

L'aperçu est composé de plusieurs **images superposées**, un calque par élément de la tringlerie :

```
.colG
  └── conteneur d'aperçu (position: relative)
        ├── calque support   (z-index bas)
        ├── calque tube
        ├── calque anneaux
        └── calque embout    (z-index haut)
```

Chaque calque est une image en `position: absolute`, empilée via `z-index` selon l'ordre de
profondeur physique. L'ensemble forme l'aperçu complet de la tringlerie configurée.

### Ordre d'empilement : déclaratif dans le JSON

L'ordre d'empilement (`z-index`) n'est **pas codé en dur** dans `live-preview.js`. Il est porté par
le JSON de collection, au même titre que le reste du moteur (chaque field/option porte sa propre
propriété d'ordre, ex : `layerOrder`). `live-preview.js` se contente d'appliquer l'ordre lu dans la
donnée — cohérent avec le principe directeur du configurateur (« piloté par la donnée », voir
Module 3). Détail de la propriété à formaliser dans `json-schema-reference.md` lors de
l'implémentation.

**Calque photo + calque SVG du même champ : pas de z-index intermédiaire (2026-08-27).** Un
champ avec `svgUrl` a deux calques (photo `renderImage` + SVG colorisé). Premier essai : donner au
SVG un z-index `layerOrder + 0.5` pour le faire passer au-dessus de sa photo — **invalide en CSS**
(`z-index` n'accepte que des entiers, une valeur comme `2.5` est silencieusement ignorée par le
navigateur, le calque retombe sur l'empilement par défaut). Corrigé : les deux calques d'un même
champ partagent un **wrapper commun** (`getFieldLayerWrapper()`) qui porte le seul z-index entier
(`layerOrder`) ; à l'intérieur, c'est l'**ordre DOM** qui décide — le calque photo est toujours
inséré en premier (`wrapper.prepend`), le calque SVG après, donc visuellement au-dessus. Aucun
calcul de z-index entre les deux n'est plus nécessaire.

### Source des images : `renderImage` (distinct de `variant.image`)

**Les visuels du rendu live sont différents des visuels du `ProductField`.** L'image affichée dans la
carte produit (`variant.image`) est une photo catalogue, cadrée pour la fiche produit. Le calque du
rendu live, lui, doit être un visuel **conçu pour la superposition** (détouré, aligné sur le
référentiel commun, cadré pour s'empiler avec les autres calques).

Chaque `ProductField` porte donc un champ **`renderImage`** dédié au rendu `.colG`, en plus de
`variant.image` utilisé pour la carte produit :

```json
"variants": {
  "35": {
    "id": "66808-35",
    "image": "commun/visuels_articles/6/66808/66808_35_S1_1.jpg",
    "renderImage": "PLACEHOLDER_RENDER_IMG",
    "prix": 42.50,
    "stock": 60
  }
}
```

- `image` → carte produit / mini-modale (colonne droite).
- `renderImage` → calque superposé (colonne gauche).

Comme `image`, le `renderImage` est une **URL fournie dans la donnée** (le front la consomme, ne la
compose pas). En prod, elle vient de la réponse API ; en démo, placeholder.

Quand un `ProductField` change (choix de produit ou de variante coloris), le calque correspondant est
mis à jour avec le `renderImage` de la variante résolue.

### Alignement

Tous les calques doivent partager le même référentiel (même taille de conteneur, même point d'ancrage)
pour que l'empilement soit cohérent — un embout doit tomber au bout du tube, un support à sa place.
Les visuels produits doivent donc être cadrés de façon homogène (à valider avec les visuels fournis
par le client).

**Config double — pas de second point d'ancrage technique.** Le positionnement des calques arrière
(tube arrière, embout arrière) par rapport à l'avant relève de la **retouche photo des visuels
fournis par le client**, pas d'une logique de positionnement gérée par le moteur. Les visuels sont
pré-préparés pour s'aligner correctement sur le même référentiel ; `live-preview.js` n'a donc pas
besoin de gérer un second point d'ancrage.

---

## 2. Mise à jour en temps réel

Le rendu réagit aux `ProductField` de la colonne droite :

1. L'utilisateur sélectionne un produit (ou change sa variante coloris) dans un champ.
2. L'orchestrateur met à jour `selection.produits[<id>]`.
3. Le calque correspondant dans `.colG` est mis à jour avec le `renderImage` de la variante résolue.

Le mapping **champ → calque** est direct : chaque `ProductField` visuellement significatif (support,
tube, anneaux, embout...) pilote un calque. Un champ sans rendu visuel (une option purement
fonctionnelle) ne pilote aucun calque.

### Absence de `renderImage` : pas de calque, pas de rafraîchissement

Si l'option/variante sélectionnée n'a **pas** de `renderImage`, le calque correspondant est **absent
du DOM** — pas de placeholder, pas de calque vide. Concrètement : tant qu'aucun `renderImage` n'est
disponible pour la sélection courante d'un champ, ce calque ne se met pas à jour (il n'apparaît
simplement pas, ou reste dans son dernier état si un `renderImage` valide y était déjà chargé — le
moteur ne l'efface pas activement, il ne le régénère juste pas sans donnée).

Correspondance avec la configuration :
- Config **simple** → un jeu de calques.
- Config **double** → calques additionnels (tube arrière, embout arrière) empilés selon la
  profondeur. Les champs position (`embout`, `embout_arriere`...) pilotent leurs calques respectifs.

---

## 3. `live` vs `live_colored`

| `renderMode` | Calques | Colorisation |
|---|---|---|
| `live` | images produits superposées | aucune — les photos sont utilisées telles quelles |
| `live_colored` | images produits superposées | + couche de colorisation SVG par-dessus |

`live_colored` = `live` + une surcouche SVG colorisable (fill dynamique selon le coloris choisi).

Le moteur de composition des calques est le même pour les deux modes ; seule la surcouche SVG
s'ajoute en `live_colored`.

### Mécanisme de colorisation SVG (2026-08-26)

Un champ produit dont l'option sélectionnée porte `svgUrl` (voir `json-schema-reference.md`) reçoit
un calque SVG supplémentaire, superposé juste au-dessus de son calque photo (`renderImage`) :

1. Le SVG est chargé **en inline via fetch** (jamais en `<img>` ou `url()`), pour pouvoir cibler ses
   éléments en JS — voir CLAUDE.md, section « Rendu SVG ».
2. Chaque élément colorisable porte un attribut `data-fill` (pas de valeur imposée pour l'instant —
   le premier gabarit de test utilise `data-fill=""`, une seule zone).
3. Le fichier SVG est **coloris-agnostique** : `svgUrl` est une propriété d'**option**, pas de
   variante — un seul fichier sert pour toutes les couleurs d'un produit. La couleur réellement
   appliquée vient de `collection.coloris[<coloris sélectionné>].hex`, injectée via
   `element.setAttribute('fill', hex)` sur chaque `[data-fill]`.
4. Le SVG chargé est mis en cache par URL (`svgTextCache` dans `svg-renderer.js`) : changer de
   coloris ne refait pas de `fetch`, seule la couleur des éléments déjà en DOM est mise à jour.
5. Un champ dont l'option sélectionnée n'a pas de `svgUrl`, ou dont le coloris sélectionné n'a pas
   de `hex` dans `collection.coloris[]`, ne pilote aucun calque SVG (comportement cohérent avec
   `renderImage` : pas de placeholder, pas de calque cassé).
6. Le calque SVG porte `mix-blend-mode: multiply` (classe Tailwind `mix-blend-multiply`) — même
   traitement que les photos produit du reste du configurateur — pour que la teinte se fonde avec
   les ombres/reliefs de la photo dessous plutôt que de l'aplatir en couleur opaque.

Implémenté dans `svg-renderer.js` (chargement, cache, application de la couleur) et branché depuis
`live-preview.js` (`refreshLivePreview` prend un 4ᵉ paramètre `coloris` = `collection.coloris[]`).

Testé sur un seul produit (support, collection de démo `auro-concept-live-colored.json`) avec un
SVG placeholder très simple (une forme, un seul `data-fill`) — le cadrage/alignement réel et la
simulation mat/brillant restent à affiner une fois les vrais visuels fournis par Houlès (voir
Points de décision encore ouverts).

### Décorrélation coloris / variants dans `auro-concept-live-colored.json` (2026-08-27)

Cette collection de test n'a plus de `variants` sur ses options produit — toutes sont passées au
modèle `noColoris: true` (id/prix/stock/image/renderImage au niveau option, voir
`json-schema-reference.md` section « Champs produit optionnels »). Périmètre limité à cette
collection : `auro-concept.json` et `auro-concept-live.json` gardent le système `coloris`/`variants`
actuel, inchangé.

### Palette de coloris pour les produits `noColoris` (2026-08-27)

Le champ `coloris` (étape 1, radio `variant: "label_thumbnail"`) est réintroduit dans cette
collection avec **20 options placeholder** (au lieu des 5 couleurs catalogue des autres
collections) — en attendant la vraie palette Houlès. Aucun changement de composant : c'est le même
`RadioField` que pour `auro-concept.json`.

Côté cartes produit, `ProductField` distingue maintenant deux cas dans `_resolveColoris`,
`_fillSwatches`, `_applySwatchVisibility` et `applyGlobalColoris` :
- **`option.variants` présent** (autres collections) : comportement inchangé, résolution par clé de
  variante.
- **`option.noColoris` en `renderMode: "live_colored"`** : la couleur est choisie librement dans
  toute la palette (`collection.coloris[]`), sans variante à faire correspondre — n'importe quelle
  entrée de la palette est valide. Les pastilles utilisent `hex` en fond uni faute de vignette
  dédiée pour les couleurs placeholder.

Le point ouvert précédent (« rien ne renseigne jamais `produit.coloris` ») est levé : le circuit
`coloris` global → `applyGlobalColoris` → `_cardColoris` → `_emitChange` → `selection.produits.
<champ>.coloris` fonctionne pour les options `noColoris` exactement comme pour les options à
`variants` — c'est ce qui alimente `resolveHex()` dans `live-preview.js` pour coloriser le calque
SVG.

---

## 4. Comportement selon le `renderMode`

Un seul moteur gère les trois modes ; il adapte le layout et l'aperçu :

- `none` → `.colG` masquée, layout 1 colonne, aucun rendu.
- `live` → `.colG` visible, layout 2 colonnes, composition de calques images.
- `live_colored` → idem `live` + surcouche colorisation SVG (voir section 3 ci-dessus).

Le passage d'un mode à l'autre est piloté par la seule valeur `renderMode` de la collection. Le front
lit ce champ et active/masque `.colG` en conséquence.

---

## Organisation du code

```
src/js/syh/features/
  live-preview.js      ← composition et mise à jour des calques (colonne gauche)
  svg-renderer.js      ← chargement, cache et colorisation des calques SVG (live_colored)
```

`live-preview.js` écoute les changements de `selection.produits` et met à jour les calques. Il ne
gère aucune interaction sur l'image (pas de zones cliquables) — c'est un rendu en lecture seule.

---

## Points de décision encore ouverts

- Cadrage / alignement des visuels produits fournis par le client (référentiel commun des calques).
- Simulation mat/brillant sur les calques SVG (le mécanisme actuel applique une teinte plate via
  `fill`, sans distinction de finition).
- Convention définitive pour `data-fill` (valeur libre pour l'instant, ex. `"primary"`/`"shadow"`
  pour distinguer plusieurs zones colorisables dans un même SVG — pas encore nécessaire avec un
  seul gabarit de test à une seule zone).

## Décisions tranchées (2026-08-12)

- **Ordre d'empilement** : déclaratif dans le JSON (propriété par field/option, ex : `layerOrder`),
  pas codé en dur — voir section 1.
- **Calque sans `renderImage`** : absent du DOM, pas de placeholder, pas de rafraîchissement — voir
  section 2.
- **Config double** : pas de second point d'ancrage technique — le positionnement relève de la
  retouche photo des visuels fournis, pas du moteur — voir section « Alignement ».
- **Portée de `.colG`** : miroir de l'intégralité de `selection.produits` cumulée à travers toutes
  les étapes ; l'ordre des options JSON pilote donc l'aperçu par défaut (`first_visible`) — voir
  section « Principe clé ».
