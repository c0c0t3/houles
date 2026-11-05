# Module 9 — Configurateur : Système de tirage

> Spécifie l'intégration du système de tirage dans le configurateur de tringlerie, d'après le modèle
> de référence **ALIUM** (modeleId 1029). Dépend des Modules 3, 4 et 5.
>
> **Périmètre de ce doc : le configurateur uniquement** — les champs, le JSON, les règles d'affichage.
> Les API de **prix** et de **panier** (`POST /api/configurateur-tringlerie/prix` et `/panier`) sont
> pilotées serveur et documentées ailleurs. Elles ne sont évoquées ici que pour le contexte.

---

## Principe directeur

**Pas de nouvelle étape.** Le tirage est un choix de l'étape 1 (`systeme_tirage` : non / oui). Les 7
étapes du tunnel ne changent pas ; seul leur **contenu** change selon `systeme_tirage`, via le
`showIf` habituel. Un modèle sans tirage ne contient aucun des éléments décrits ici (tout est
optionnel).

Le serveur calcule les prix et agrège le forfait de montage ; le front lit la donnée et affiche. Il
n'y a **aucune logique de collision / écrasement de panier côté front** (c'était une hypothèse d'une
version antérieure de ce module, abandonnée).

---

## 1. Le parcours (tringle vs tirage)

Sur ALIUM (rail seul), les étapes 3 et 4 s'appellent Rail et Galets — les noms viennent du JSON.
En **gras**, ce qui change en tirage.

| Étape | `systeme_tirage = non` | `systeme_tirage = oui` |
|---|---|---|
| 1 Configuration | rideau simple/double, pose, longueur, coloris | rideau simple, **double avec recouvrement** ou **double sans recouvrement** ; pose ; longueur ; **hauteur du cordon** ; **position du cordon** ; coloris |
| 2 Support | supports | supports |
| 3 Rail | rail, about | rail **(longueur − 6 ou 5,4 cm)**, about |
| 4 Galets | galets : un seul choix (galets / rouleurs / kits Wave) | galets : un seul choix (galets / rouleurs / **packs Wave**) ; **guide Wave** si pack Wave |
| 5 Embouts | embouts | embouts (**arrière remplacé par un article du montage**) |
| 6 Accessoire | pattes de retour, accessoires tirage | pattes de retour, accessoires tirage |
| 7 Récapitulatif | lignes | lignes **+ une ligne « Forfait de montage »** |

---

## 2. Les champs de l'étape 1 en tirage

### `systeme_tirage` (le déclencheur)

```json
{ "id": "systeme_tirage", "type": "radio", "isParam": true,
  "options": [ { "id": "non", "label": "Non" }, { "id": "oui", "label": "Oui" } ] }
```

Tous les éléments réservés au tirage portent la condition `showIf: { "systeme_tirage": ["oui"] }`.

### Hauteur et position du cordon

```json
{ "id": "hauteur_cordon", "type": "number", "isParam": true,
  "showIf": { "systeme_tirage": ["oui"] }, "min": 100, "max": 600, "default": 200, "unit": "cm" }

{ "id": "position_cordon", "type": "radio", "isParam": true,
  "showIf": { "systeme_tirage": ["oui"] },
  "options": [ { "id": "gauche", "label": "Cordon à gauche" },
               { "id": "droite", "label": "Cordon à droite" } ] }
```

- La **hauteur** alimente la longueur du cordon (calcul serveur).
- La **position** détermine le code de montage atelier (`A0000-LCMD` / `A0000-RCMD`) ajouté par le
  serveur. Rien à saisir dans les articles côté front.

### Le type de rideau change de valeurs en tirage

| Valeur | Visible si |
|---|---|
| `simple` | toujours |
| `double` | `systeme_tirage = non` |
| `double_avec_recouvre` (Double avec recouvrement) | `systeme_tirage = oui` |
| `double_sans_recouvre` (Double sans recouvrement) | `systeme_tirage = oui` |

Subtilité ALIUM à noter : en tirage, le **dédoublement passe par `type_rideau`** (avec/sans
recouvrement), et `type_de_support` « double » n'est proposé qu'**hors** tirage. En tirage,
`type_de_support` est donc résolu à `simple` (et caché, voir §3.2).

---

## 3. Trois nouveaux mécanismes front

C'est l'essentiel du travail de ce module. Le reste est piloté par la donnée ou par le serveur.

### 3.1 Nouveau type de field : `number`

Saisie numérique bornée (`min`, `max`, `default`, `unit`), qui alimente `selection` comme la longueur.
Distinct de `length` (qui a presets + custom) : `number` est une simple saisie bornée, sans presets.

### 3.2 Radio à une seule option : choisi d'office, non affiché

Un `radio` dont **une seule option est visible** (après `showIf`) n'est **pas montré**, mais sa valeur
entre quand même dans `selection`.

Exemple réel ALIUM (étape 1) — ces trois params ont une seule option et sont cachés :
> « Choisi d'office, non affiché (une seule réponse) : Type de configuration : Simple · Tube ou rail :
> Rail · Diamètre : Ø 28 mm »

**Exception** : ne s'applique **pas** au coloris (un nuancier à une seule couleur reste affiché).

Interaction avec `first_visible` (Module 5) : un champ à option unique est de fait auto-sélectionné ;
la règle ne fait qu'ajouter le masquage de l'affichage.

### 3.3 Cartes à couleurs propres : `couleurPropre`

```json
{ "refBase": "carte-23902", "label": "GALETS POUR SYSTÈME VAGUE 6CM", "couleurPropre": true,
  "variants": { "blanc": { "id": "23902-00", "image": "…" },
                "noir":  { "id": "23904-00", "image": "…" } } }
```

Différence fondamentale avec les variantes coloris standard (Module 3) :

- Les clés de `variants` sont les **couleurs propres de l'article** (blanc, gris, noir), **pas** les
  finitions du modèle (coloris de l'étape 1).
- La finition de l'étape 1 **ne pilote pas** la pastille : la **1ʳᵉ pastille** est retenue d'office.
- Une pastille peut pointer une **autre référence** (noir = `23904`) : c'est `variants[couleur].id`
  qui est la ref à commander.

Conséquence : le `ProductField` doit gérer **deux voies de résolution** — produit standard (variante
résolue par le coloris global) vs produit `couleurPropre` (couleurs propres, 1ʳᵉ par défaut,
indépendant du coloris global).

---

## 4. L'étape Galets : trois champs, un visible à la fois

La condition est portée par le **champ** (pas seulement l'article) :

| Champ | Visible si | Contenu |
|---|---|---|
| `anneaux` | `systeme_tirage = non` | « Aucun », kits Wave, galets, rouleurs |
| `galets_tirage` | `systeme_tirage = oui` | galets, packs Wave, rouleurs (**pas de « Aucun »**) |
| `opt_guide_wave` | `systeme_tirage = oui` **et** pack Wave coché | « Aucun », guide Wave |

Le guide Wave illustre le `showIf` de **champ** avec `selected:` :

```json
"showIf": { "systeme_tirage": ["oui"],
            "selected:galets_tirage": ["carte-23902", "carte-23903", "carte-23906"] }
```

- Même clé = OU, clés différentes = ET (identique à notre `isVisible`).
- `selected:galets_tirage` se compare sur le **`refBase`** sélectionné (`carte-23902`), pas sur l'`id`
  de variante.
- `galets_tirage` doit être déclaré **avant** `opt_guide_wave` (dépendance vers l'amont).

### Confirmation de faisabilité (question de Michael)

`selected:<champ>` sur un **champ entier** est **supporté sans nouveau mécanisme** : le `showIf` de
champ existe déjà dans le modèle (ex : `embout_arriere` visible seulement en double), et `selected:`
est une clé de `showIf` résolue contre `selection.produits[champ].refBase`. Les deux se combinent
directement. **Réponse : oui.**

---

## 5. Forfait de montage et longueur du rail (données)

- **`field.forfait: true`** sur un champ → en tirage, ses articles sont **dans le forfait**, affichés
  sans prix unitaire. Ignoré hors tirage. Sur ALIUM : about de rail, galets, pattes de retour,
  accessoires tirage sont « dans le forfait ».
- **`collection.forfait`** : `{ "id": "89199", "label": "Forfait de montage" }`.
- **`collection.retraitsLongueur`** : `{ "mur_a_mur": 6, "autre": 5.4 }`. En tirage, longueur de rail
  = longueur − retrait selon la pose ; nombre de rails = `ceil((longueur − retrait) / tubeLength)`.
  Exemple ALIUM : 180 cm en mur à mur → rail de 174 cm, 1 rail.
- Les pièces jamais proposées (cordon, poulies, ruban, agrafes, galets internes…) ne sont **pas dans
  le JSON** : le serveur les ajoute au forfait. Le front ne les voit ni ne les affiche.

Ces éléments résolvent l'ancienne inquiétude du double-comptage du rail : le rail est à l'étape Rail
(longueur réduite), le forfait ne porte que le montage.

---

## 6. Ce qui est hors périmètre de ce doc

Documenté ailleurs (piloté serveur) :

- **Prix** : `POST /api/configurateur-tringlerie/prix` `{ modeleId, choix, picks }` → lignes +
  forfait (une ligne « Forfait de montage » suivie de `forfait.detail`, choix du client déjà rédigés)
  + total HT. Le front affiche les quantités telles quelles.
- **Panier** : `POST /api/configurateur-tringlerie/panier`, même corps.
- Les **composants du forfait** (`forfait.composants`) et les `codesMontage` ne sont **jamais
  affichés**.

---

## 7. Points de décision encore ouverts

- Valeurs exactes des presets de longueur et min/max par modèle (ALIUM : 180/240/300, 40–600) — déjà
  couvert par le modèle `length` existant.
- Confirmer le comportement de `number` au recalcul (la hauteur de cordon invalide-t-elle quelque
  chose en amont ? a priori non, c'est un simple paramètre serveur).
- Gestion de l'« article absent dans une finition » (ex ALIUM : anneaux de blocage `23876` absent en
  Bronze Brossé mat) — comportement d'affichage à caler (masquer l'option ou signaler).

Rappel : la règle « mono-option cachée » et le routage `anneaux` / `galets_tirage` / `opt_guide_wave`
sont du rendu piloté par la donnée — aucune règle collection en dur.
