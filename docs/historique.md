# Historique — Configurateur Style Your Hardware

> Journal des évolutions de la feature SYH, en langage client. Complète le git log (technique,
> voir `git log -- src/js/syh src/templates/pages/configurateur-tringlerie public/mock-api docs`)
> sans le dupliquer. Mis à jour à la fin de chaque session de travail.

---

## 2026-08-27 — Colonne d'aperçu réduite à zéro sur l'étape de configuration

La colonne d'aperçu (à gauche) pouvait se retrouver totalement écrasée (largeur nulle) sur l'étape
de configuration, à cause de la nouvelle rangée de 20 pastilles de couleur qui réclamait plus de
place que prévu. Corrigé — l'aperçu garde sa largeur normale sur toutes les étapes.

---

## 2026-08-27 — Ajustements visuels du rendu colorisé et du sélecteur de couleur

Quatre correctifs suite aux premiers tests : la vignette de couleur à l'étape 1 ne s'affichait plus
pour les couleurs sans photo dédiée (elle affiche maintenant la couleur unie) ; le calque coloré
pouvait passer sous la photo du produit au lieu de la superposer (problème d'empilement corrigé de
façon plus robuste) ; ajout d'un effet de fusion (« multiply ») sur le calque coloré pour qu'il se
fonde avec les ombres et reliefs de la photo plutôt que de l'aplatir en couleur unie.

---

## 2026-08-27 — Choix de couleur fonctionnel pour le rendu colorisé + étape récapitulatif

Le rendu colorisé (mis en place la veille) est maintenant pilotable : une palette de 20 couleurs
(temporaire, en attendant les vraies teintes Houlès) permet de choisir une couleur globale à
l'étape 1, avec possibilité de changer la couleur d'une pièce individuellement sur chaque carte
produit — le calque coloré se met à jour en conséquence. Ajout aussi d'une étape « Récapitulatif »
en fin de parcours, qui reprend le contenu du bandeau récapitulatif déjà existant.

---

## 2026-08-27 — Corrections du rendu colorisé + simplification des données de test

Trois correctifs sur le premier test du rendu colorisé : le calque coloré était décalé par rapport
au visuel photo (problème d'alignement corrigé), et se dupliquait en plusieurs exemplaires au
chargement de la page (également corrigé). Décision de simplifier la collection de test : elle ne
propose plus de choix de couleur à l'étape 1 pour l'instant — un nouveau sélecteur dédié à ce mode
reste à concevoir avant de rebrancher le choix de couleur. Aucun impact sur les autres collections.

---

## 2026-08-26 — Premier test du rendu colorisé (mode "live_colored")

Amorce du futur mode d'affichage le plus abouti : en plus de la photo du produit, un calque coloré
en temps réel se superpose selon la teinte choisie — le produit change visuellement de couleur à
l'écran, sans recharger d'image. Testé pour l'instant sur un seul produit (support) avec un visuel
provisoire très simple, le temps de valider le mécanisme avant d'y intégrer les vrais visuels une
fois fournis par Houlès. Nouvelle collection de démo dédiée à ce test (« Auro Live Colored »),
accessible depuis le bouton de changement de collection.

---

## 2026-08-23 — Coloris masqués derrière un bouton sur les cartes produit

Sur chaque carte produit, les pastilles de couleur ne s'affichent plus en permanence : elles sont
désormais cachées derrière un bouton « Changer de couleur », pour alléger l'affichage. Ce
comportement ne concerne que les modes d'affichage sans rendu colorisé — le futur mode avec rendu
temps réel colorisé gardera les pastilles visibles en permanence, plus cohérent avec ce mode.

---

## 2026-08-23 — Les seuils de longueur n'excluent plus, ils recommandent

Jusqu'ici, un seuil comme « support intermédiaire conseillé au-delà de 160 cm » rendait le produit
**invisible** en dessous de ce seuil — le client final ne pouvait pas le choisir même s'il le
voulait. Ce n'est plus le cas : ces produits restent désormais sélectionnables à toute longueur,
le seuil ne sert plus qu'à déterminer si le produit est **pré-sélectionné automatiquement** ou non.
Corrigé pour les supports intermédiaires et doubles de la collection Auro Concept.

La présélection automatique suit maintenant la longueur en
temps réel (elle s'ajoute ou se retire tant que l'utilisateur n'a rien choisi lui-même sur ce champ),
au lieu de rester figée sur le premier calcul.

Deux correctifs complémentaires le même jour :
- Un produit « recommandé au-delà d'une longueur » ne doublait pas toujours le bon produit par
  défaut — corrigé pour respecter l'ordre de préférence prévu dans les données.
- Message explicatif ajouté au-dessus des produits quand l'un d'eux est présélectionné parce qu'il
  correspond à une recommandation (ex : « Recommandé au-delà de 160 cm d'entraxe »).

---

## 2026-08-19/20 — Ajustement de l'affichage des champs à choix

À ne pas confondre avec le point « Choix de l'affichage des couleurs par produit » ci-dessous (qui
concerne les pastilles de couleur sur une carte produit, 2 choix). Ici il s'agit du champ
sélecteur lui-même à l'étape 1 (ex : coloris, type de pose...) : trois façons de l'afficher
existent maintenant côté moteur (texte seul / texte + photo produit / texte + vignette couleur),
choisies explicitement par champ plutôt que déduites de la donnée présente — évite les affichages
incohérents si une donnée venait à manquer. Le sélecteur de coloris utilise la 3ᵉ (vignette couleur).

---

## 2026-08-19 — Coloris global, correction d'images, nouveau sélecteur

**Coloris global plus cohérent.** Choisir une couleur à l'étape 1 met à jour tous les produits déjà
configurés qui existent dans cette couleur — pas seulement celui affiché à l'écran, y compris sur
des étapes pas encore visitées.

**Choix de l'affichage des couleurs par produit.** Possibilité de définir, produit par produit, si
les pastilles de sélection couleur montrent la photo du produit dans cette teinte, ou une vignette
de couleur générique — pratique pour les produits dont on n'a pas encore toutes les photos par
coloris.

**Nouveau sélecteur de coloris (étape 1).** Affichage compact : vignette ronde dédiée à côté du nom
de la couleur, remplaçant la grande photo produit utilisée jusqu'ici. Trois familles d'affichage
sont maintenant possibles pour les champs à choix (texte seul / texte + photo produit / texte +
vignette couleur), chacune explicitement choisie selon le champ plutôt que devinée.

**Correction d'images cassées.** Diagnostic complet de la collection Auro Concept : 124 images
cassées identifiées et corrigées automatiquement (mauvais format de fichier dans l'URL). 16 images
restent introuvables sur le serveur Houlès — probablement des photos manquantes côté Houlès plutôt
qu'un souci technique, à vérifier avec eux.

**Garde-fou en développement local.** Petit mécanisme qui retente automatiquement une image sous un
autre format si elle échoue à charger — actif uniquement en local pour fluidifier les tests, sans
impact en production.

---

## 2026-08-18 — Changement de collection en un clic

Ajout d'un bouton fixe en bas de page permettant de basculer facilement entre les différentes
collections de démonstration (ex : Auro Concept / Auro Live), sans avoir à modifier l'URL à la main.

---

## 2026-08-14 → 2026-08-15 — Rendu visuel en temps réel

Mise en place du mode d'affichage « live » : une colonne d'aperçu apparaît à côté du configurateur
et se met à jour automatiquement à chaque choix de l'utilisateur (support, tube, embout), par
superposition de visuels — sans action de sa part. Une nouvelle collection de démonstration avec
photos a été créée pour ce mode.

---

## 2026-07-17 — Réorganisation du code et récapitulatif

Le code du configurateur a été réorganisé en modules dédiés (panier, récapitulatif, gestion des
embouts) pour rester lisible à mesure que la feature grossit. Ajout d'un bandeau récapitulatif
toujours visible, qui rappelle la configuration en cours pendant que l'utilisateur avance dans le
tunnel.

---

## 2026-07-15 — Aide au calcul de longueur

Ajout d'une modale « Calcul de longueur » : à partir des cotes de la fenêtre (largeur, distances aux
supports), elle suggère la longueur de tube à commander et estime la longueur totale avec les
embouts sélectionnés.

---

## 2026-07-14 — Gestion des supports qui remplacent les embouts

Certains supports (naissances murales, corners) intègrent déjà les embouts. Le configurateur détecte
ce cas, affiche un message explicatif à l'étape Embouts et masque les choix devenus inutiles, plutôt
que de laisser l'utilisateur sélectionner des pièces en trop.

---

## 2026-07-13 — Calcul de découpe des tubes

Ajout du moteur de calcul qui détermine, selon la longueur commandée, combien de tubes et de
raccords sont nécessaires (avec tests automatisés pour fiabiliser ce calcul dans la durée).

---

## 2026-07-09 — Nettoyage des données produits

Rédaction de la documentation de référence du format JSON (contrat de données pour l'équipe
Houlès). Suppression des doublons dans les fichiers de collection : les produits communs à
plusieurs configurations sont désormais déclarés une seule fois.

---

## 2026-07-01 → 2026-07-08 — Premiers champs interactifs

Mise en place des premiers champs du configurateur (type de support, type de pose, longueur,
produits avec variantes de couleur) et du moteur de règles de compatibilité qui filtre les options
selon les choix précédents.

---

## 2026-06-30 — Démarrage du projet

Mise en place de la structure du projet (squelette Twig, premier jet de l'API de démonstration,
documentation d'architecture initiale).
