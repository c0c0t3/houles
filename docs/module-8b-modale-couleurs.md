# Module 8b — Sélection de couleur inline dans la card produit (`live_colored`)

> Complète le Module 8 (rendu `live_colored`). Ne concerne que les collections en
> `renderMode: live_colored`.

---

## Historique de la décision

Une première version de ce module (voir git log, docs archivées) proposait une **modale** de
sélection couleur (nuancier plein écran, recherche, 5 dernières couleurs, boutons Annuler /
Appliquer au produit / Appliquer à tous). Houlès est revenu sur ce choix : **pas de modale**. Le
reste de ce document décrit le comportement retenu.

---

## Principe général

Les pastilles de couleur vivent **directement dans la card produit**, jamais dans une modale ou un
panneau séparé. Seuls les produits qui ont un rendu SVG (`option.svgUrl` — support, tube, embout)
proposent un choix de couleur : ce sont les seuls réellement teintables. Un produit `noColoris`
sans `svgUrl` (anneaux, about_tube, embout arrière, supports/jambes intermédiaires...) n'a aucune
pastille.

**Une seule card affiche ses pastilles à la fois** : celle du produit **actuellement sélectionné**
dans le champ. Les autres cards du même champ restent compactes, sans nuancier. Sélectionner un
autre produit (clic sur une autre card) :
- masque le nuancier de l'ancienne card ;
- affiche le nuancier complet dans la nouvelle card, qui **s'agrandit** en conséquence (le
  nuancier prend sa place dans le flux normal de la card, pas en position absolue — pas de logique
  d'agrandissement dédiée à écrire, juste une conséquence naturelle de l'ajout de contenu).

---

## Le nuancier

Toutes les couleurs de `collection.coloris[]` (le nuancier Pantone global de la collection — voir
Module 8) sont affichées, sans limite ni pagination. Pas de moteur de recherche : la liste
complète, cliquable, suffit (nombre de couleurs raisonnable pour un nuancier produit).

La couleur active de la card est mise en évidence (`is-active`).

---

## Comportement au clic

Cliquer une pastille dans la card sélectionnée applique la couleur **immédiatement** :
- écrit `selection.produits[fieldId].coloris` ;
- déclenche la mise à jour du calque SVG correspondant (colorisation, voir Module 8 / svg-renderer.js) ;
- met à jour le récapitulatif et le payload panier.

Pas d'aperçu séparé, pas de validation différée : le clic **est** la validation. Rien à annuler.

---

## Organisation du code

Toute la logique vit dans `src/js/syh/features/product-field.js` :
- `_applyColorisUI(card, option, coloris, isSelected)` — décide si la card affiche son nuancier
  (`live_colored` + `option.svgUrl` + `isSelected`) et le peuple le cas échéant.
- `_toggleCardColoris(refBase, show)` — bascule l'affichage entre l'ancienne et la nouvelle card
  sélectionnée (`onCardsChange`), sans reconstruire toute la grille de cards.
- `_fillSwatches` — construit les pastilles (inchangé depuis le Module 8, palette non tronquée).

Le markup de la card colorisable (`product-card--live-colored`) vit dans
`src/templates/pages/configurateur-tringlerie/index.twig` — un seul `data-ref="colorSwatches"`,
sans trigger ni modale associée.

---

## Points de décision actés

- **Portée du nuancier** : uniquement les produits avec `svgUrl` — pas de coloris pour les produits
  `noColoris` sans rendu SVG.
- **Une seule card ouverte à la fois** par champ (celle du produit sélectionné).
- **Pas de « dernières couleurs utilisées »**, pas de recherche, pas de « appliquer à toutes les
  pièces » — ces idées appartenaient à la modale abandonnée.

## Points de décision encore ouverts

- Y a-t-il une couleur par défaut à l'entrée dans `live_colored` (les pièces démarrent-elles
  teintées, ou neutres/vides tant qu'aucune couleur n'est choisie) ?
- Comportement de la finition mat/brillant : toujours hors scope de ce module.
