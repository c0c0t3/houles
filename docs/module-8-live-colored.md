# Module 8 — Configurateur : Rendu `live_colored` (colorisation par pièce)

> Module autonome qui gère la colorisation individuelle des pièces via un nuancier Pantone appliqué
> à des calques SVG. Il **réutilise** les fonctions de composition du Module 6 (rendu `live`) mais a
> ses propres structures de données et son propre template de card. Ne s'applique qu'aux collections
> en `renderMode: live_colored`.

---

## Positionnement

`live_colored` **dérive fonctionnellement** de `live` (Module 6) — il réutilise la composition et
l'empilement des calques, la mise à jour temps réel, le layout 2 colonnes. Mais ce n'est **pas** une
simple surcouche : il change le modèle de sélection du coloris, la structure des produits, et le
template des cards. D'où un module à part.

Différence fondamentale avec `live` / `none` :

| | `none` / `live` | `live_colored` |
|---|---|---|
| Coloris | champ global (`id: "coloris"`) à l'étape 1 | **aucun coloris global** |
| Sélection couleur | un choix pour toute la config | **par pièce**, indépendamment |
| Modèle couleur | codes coloris → variantes pré-définies | nuancier Pantone libre appliqué au SVG |
| Rendu | image (`renderImage`) | image + **calque SVG teinté** |
| Card produit | template standard | **template distinct** (avec nuancier) |
| Prix | par variante coloris | **unique par produit** |

---

## 1. Plus de coloris global

En `live_colored`, le champ `coloris` de l'étape 1 **n'existe pas**. La couleur n'est plus un
paramètre de configuration global.

Chaque pièce (embout, tube, support, anneaux...) porte **sa propre couleur**, choisie individuellement.
L'embout peut être lie-de-vin, le tube bleu nuit, le support rose — sans aucune contrainte d'accord.

Conséquence sur l'invalidation : changer une couleur n'affecte aucun autre champ (contrairement au
coloris global qui, en `live`, re-résolvait les variantes de toutes les pièces).

---

## 2. Structure d'un produit colorisable

Un produit colorisable **n'a pas de `variants` par code coloris** (la couleur est appliquée
dynamiquement, pas stockée). Sa structure est parallèle à celle d'un produit standard :

```json
{
  "refBase": "63001",
  "id": "63001",
  "label": "Embout Vase",
  "prix": 18.00,
  "stock": 90,
  "renderImage": "PLACEHOLDER_RENDER_IMG",
  "renderSvg": "PLACEHOLDER_SVG_URL"
}
```

- **`prix` unique** au niveau produit (la couleur n'affecte pas le prix — une laque Pantone coûte le
  même prix quelle que soit la teinte).
- **`renderSvg`** : nouveau champ, le calque SVG teintable (voir section 4). Présent dès qu'il y a un
  `renderImage` en `live_colored`.
- Pas de bloc `variants`, pas de code coloris.

La couleur choisie par l'utilisateur est stockée dans l'état de sélection, au niveau de la pièce :

```js
selection.produits = {
  "embout": {
    refBase: "63001",
    couleur: { pantone: "Pantone 7527 C", nom: "Lin naturel", hex: "#D4C5A9" },
    finition: "mat"
  }
}
```

---

## 3. Le nuancier Pantone

Le nuancier est la source des couleurs sélectionnables. Chaque entrée porte un libellé et un code
hexa (et le code Pantone) :

```json
"nuancier": [
  { "pantone": "Pantone 7527 C", "nom": "Lin naturel",     "hex": "#D4C5A9" },
  { "pantone": "Pantone 2985 C", "nom": "Bleu Nuit Océan", "hex": "#1B3A5C" },
  { "pantone": "Pantone Black C", "nom": "Lie de vin",     "hex": "#5A1F2A" }
]
```

Le nuancier vit au **niveau collection** : il est global, partagé par toutes les pièces. Toutes les
pièces piochent leur couleur dans le même nuancier Pantone.

**Moteur de recherche coloris** : chaque sélecteur couleur permet de chercher par nom, code Pantone
ou hexa. C'est un composant réutilisable (`ColorisSearchField`), branché sur le nuancier.

---

## 4. Colorisation SVG

Le rendu d'une pièce colorisable superpose, sur le calque image, un **calque SVG teinté** avec la
couleur choisie.

- Le SVG (`renderSvg`) est chargé **inline** (fetch + injection DOM), jamais en `<img>`, pour pouvoir
  cibler ses paths en JS.
- Les paths colorisables portent un attribut `data-fill` : `primary` pour la teinte principale,
  `shadow` pour les effets de relief.
- Le JS applique la couleur : `path[data-fill="primary"]` reçoit le hexa choisi ; `path[data-fill="shadow"]`
  reçoit une version assombrie calculée automatiquement (relief sans SVG supplémentaire).

```js
svgEl.querySelectorAll('[data-fill="primary"]').forEach(p => p.setAttribute('fill', hex));
svgEl.querySelectorAll('[data-fill="shadow"]').forEach(p => p.setAttribute('fill', darken(hex, 0.25)));
```

Algorithme `darken` proposé (assombrissement par réduction de luminosité, ~25 %) :

```js
function darken(hex, amount = 0.25) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
```

L'intensité (0.25) est à ajuster visuellement selon le rendu voulu sur les visuels réels. Une approche
plus fidèle passerait par l'espace HSL (baisser la luminosité plutôt que multiplier les canaux RGB),
mais la multiplication RGB est suffisante pour un premier rendu et se règle en une constante.

Tous les SVG partagent le même `viewBox` et le même point d'ancrage que les calques images, pour
rester alignés dans l'empilement (réutilise la logique de composition du Module 6).

### Finition mat / brillant

La finition se simule sans SVG supplémentaire : une couche de gradient blanc semi-transparent en
overlay pour le brillant, absente pour le mat. Appliquée par-dessus le calque teinté.

---

## 5. Template de card distinct

Le `ProductField` en `live_colored` utilise un **template Twig distinct** de la card standard. En
plus du produit, la card colorisable intègre :

- Le sélecteur de couleur (nuancier + recherche par nom/Pantone/hexa).
- Le sélecteur de finition (mat / brillant).
- L'aperçu de la couleur sélectionnée.

Le composant `ProductField` choisit son template selon le `renderMode` : template standard en
`none`/`live`, template colorisable en `live_colored`.

---

## 6. Fonctions réutilisées du Module 6 (`live`)

`live_colored` s'appuie sur le socle `live` sans le réécrire :

- Composition et empilement des calques (`.colG`, z-index, référentiel commun).
- Mise à jour temps réel du rendu au changement d'un champ.
- Layout 2 colonnes (affichage/masquage `.colG` — déjà codé).

Ce que `live_colored` ajoute par-dessus : le calque SVG teinté, le nuancier, la recherche coloris, la
finition, le template de card colorisable.

---

## Organisation du code

```
src/js/syh/features/
  live-preview.js        ← composition des calques (Module 6, réutilisé)
  svg-colorizer.js       ← chargement inline SVG + application fill + shadow + finition
  coloris-search.js      ← moteur de recherche nuancier (nom / Pantone / hex)
```

Le template de card colorisable vit dans `src/templates/components/configurator/` à côté du template
standard.

---

## Décisions actées

- **Nuancier** : global au niveau collection, partagé par toutes les pièces.
- **`renderSvg`** : URL fournie dans la donnée (le front ne compose jamais le chemin), comme `renderImage`.
- **Accord des couleurs** : liberté totale — toute pièce peut prendre toute couleur, aucune contrainte.
- **Prix** : aucune modification par couleur ni par finition. Prix unique par produit.

## Points de décision encore ouverts

- Intensité de l'assombrissement `darken` (constante 0.25 proposée) — à régler visuellement sur les
  visuels réels. Éventuel passage en HSL si le rendu RGB ne convient pas.
- Confirmer que la finition mat/brillant n'a strictement aucun impact prix (a priori non).