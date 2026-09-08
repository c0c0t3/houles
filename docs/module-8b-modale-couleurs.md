# Module 8b — Modale de sélection des couleurs (`live_colored`)

> Spécifie la modale de choix de couleur ouverte depuis une card produit colorisable. Complète le
> Module 8 (rendu `live_colored`). Ne concerne que les collections en `renderMode: live_colored`.

---

## Principe général

Depuis la card d'une pièce colorisable, l'utilisateur ouvre une modale pour choisir la couleur de
cette pièce dans le nuancier Pantone global. La modale applique la couleur **en aperçu temps réel**
(preview en arrière-plan) pendant qu'elle est ouverte ; la validation confirme, l'annulation restaure.

---

## 1. Déclenchement (trigger)

Fichier : `src/templates/pages/configurateur-tringlerie/index.twig`

Dans la card `data-template="product-card--live-colored"`, à l'intérieur de `data-ref="colorSwatches"`,
ajouter un **trigger** qui ouvre la modale.

- La modale s'ouvre **toujours attachée à une pièce précise** (le produit en cours) — jamais dans le
  vide. Le trigger transmet quelle pièce (id de champ) l'a déclenché.
- À l'ouverture, la **couleur actuelle** de la pièce est **pré-sélectionnée** (mise en évidence) dans
  la grille.

Le trigger doit porter l'information de la pièce concernée (par un `data-*` ou via l'instance du
composant) pour que la modale sache quelle pièce colorer.

---

## 2. Contenu de la modale

### a. La grille de couleurs

Toutes les couleurs de `colorSwatches` (le nuancier Pantone global de la collection — voir Module 8).
Chaque couleur affiche sa pastille (hex), et au survol/sélection son libellé + code Pantone.

La couleur active de la pièce est mise en évidence à l'ouverture.

### b. Le moteur de recherche

Champ de recherche filtrant la grille **à la frappe** (temps réel), par nom, code Pantone ou hex.

- Si la recherche ne correspond à aucune couleur du nuancier, la grille **n'affiche rien** (pas de
  couleur hors nuancier ici — le formulaire « couleur hors nuancier » du CDC est un dispositif séparé).

### c. Les dernières couleurs utilisées

Affiche les **5 dernières couleurs** utilisées **dans la configuration en cours** (les couleurs déjà
posées sur d'autres pièces de cette session).

- **Pas de persistance** entre sessions : cette liste vit uniquement dans l'état de la config
  courante. Rechargement de page ou nouvelle config = liste vide.
- Sert de raccourci pour réutiliser rapidement une teinte déjà employée (cohérence visuelle).

---

## 3. Aperçu temps réel (comportement clé)

Quand l'utilisateur **clique une couleur** dans la grille (ou dans les dernières utilisées) :

- La couleur est **appliquée en arrière-plan immédiatement** : le calque SVG de la pièce en cours se
  teinte en live dans `.colG` (aperçu).
- La modale **reste ouverte** — l'utilisateur peut cliquer d'autres couleurs et voir le rendu changer
  à chaque clic.
- La couleur d'origine de la pièce est **mémorisée** au moment de l'ouverture, pour pouvoir la
  restaurer si annulation.

C'est un aperçu, pas encore une validation. La confirmation dépend du bouton cliqué (section 4).

---

## 4. Les boutons

| Bouton | Action |
|---|---|
| **Annuler** | Restaure la couleur d'origine de la pièce (celle d'avant ouverture) et ferme la modale. Aucun changement conservé. |
| **Appliquer au produit en cours** | Confirme la couleur sur la **seule pièce** d'où le trigger a été cliqué, et ferme la modale. |
| **Appliquer à tous les produits** | Applique la couleur sélectionnée à **toutes les pièces colorisables** de la config, et ferme la modale. |

Détails :

- **Annuler** : comme l'aperçu a modifié le rendu en arrière-plan, Annuler doit **remettre** la couleur
  mémorisée à l'ouverture (rollback du preview).
- **Appliquer au produit en cours** : la couleur est liée au `renderSvg` de la pièce (le calque SVG de
  cette pièce est teinté). Effet immédiat, puis fermeture.
- **Appliquer à tous les produits** : teinte toutes les pièces colorisables d'un coup (écrase leurs
  couleurs individuelles). Effet immédiat, puis fermeture.

Dans les deux cas « Appliquer », l'effet est **immédiat** sur le rendu et l'état de sélection, suivi de
la **fermeture** de la modale.

---

## 5. Effet sur l'état de sélection

L'application écrit la couleur dans l'état de la (ou des) pièce(s) concernée(s) :

```js
// Appliquer au produit en cours
selection.produits["embout"].couleur = { pantone: "...", nom: "...", hex: "#..." };

// Appliquer à tous les produits colorisables
for (const pieceId of piecesColorisables) {
  selection.produits[pieceId].couleur = couleurChoisie;
}
```

Chaque écriture déclenche la mise à jour du calque SVG correspondant (colorisation, Module 8) et
alimente la liste des « 5 dernières couleurs » de la config en cours.

---

## Points de décision encore ouverts

- **« Appliquer à tous »** : écrase-t-il aussi les pièces déjà personnalisées manuellement, ou
  seulement celles restées sur une couleur par défaut ? (Actuellement : écrase tout — à confirmer.)
- Y a-t-il une couleur par défaut à l'entrée dans `live_colored` (les pièces démarrent-elles teintées,
  ou neutres/vides tant qu'aucune couleur n'est choisie) ?
- Comportement de la finition mat/brillant vis-à-vis de la modale : gérée dans la card (séparément),
  ou intégrée à la modale couleur ?

---

## Organisation du code

```
src/js/syh/features/
  color-modal.js       ← ouverture, preview temps réel, boutons, rollback
  coloris-search.js    ← moteur de recherche nuancier (réutilisé, Module 8)
  svg-colorizer.js     ← application de la teinte sur le SVG (Module 8)
```

Le markup de la modale vit dans `src/templates/pages/configurateur-tringlerie/` ou en composant
dédié. Le trigger est dans la card `product-card--live-colored`, sous `data-ref="colorSwatches"`.
