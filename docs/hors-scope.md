# Contexte : prix / devises / unités dans SYH (hors scope front)

Objectif : structurer un CDC. Je n'ai pas accès au code, donc tout ce qui suit est
à confronter à l'existant. En cas de contradiction avec le code, le code a raison :
dis-le-moi.

## Décisions actées
- Le pricing ne passe PAS par le JSON de config (décision de la réunion avec Benoit
  et Lorna). Il est fourni par un appel API côté Houlès.
- Les prix, devises, tarifs négociés par client et conversions d'unités sont de la
  responsabilité du back-end Houlès. Ils sont hors scope de SYH.
- Côté SYH : on envoie la config (références + quantités, + longueur sur mesure si
  applicable), on affiche ce que l'API renvoie.

## Ce que le PHP de Houlès nous apprend (extrait de conversionCarac, à vérifier)
- Le système de mesure (métrique/impérial) dépend du pays client (sys_id == 'US'),
  alors que le format des nombres dépend de la langue. Les deux sont mélangés dans
  leur code, ce qui explique un bug existant (comportement selon le mode du site).
- Les seuils d'affichage (mm → cm → m, g → kg, oz → lb) sont de la logique métier
  côté serveur. Ne pas la dupliquer en JS.
- Tout ce qui n'est pas 'metrique' bascule en impérial.
- convertUVMenYD() semble ne changer que le libellé (Yard / yd). Le prix et la
  quantité sont-ils convertis ailleurs ? Risque de prix faux pour les clients US.
- En impérial, le poids des tissus n'a pas de suffixe "/ml" équivalent.

## À vérifier dans notre code
1. Le JSON de conditions (min/max/pas, longueurs) est-il dans une unité unique
   (cm ou mm) ?
2. Où se fait aujourd'hui la saisie et l'affichage des longueurs ? Y a-t-il déjà
   une conversion côté front ?
3. Le mock API prix existe-t-il ? Quel format renvoie-t-il ?
4. Y a-t-il déjà un état de chargement sur le prix ?

## Proposition de contrat API (à valider avec Michael, pas figée)
Entrée : liste de lignes {reference, quantite, longueur?} + contexte client.
Sortie, par ligne : prix_unitaire, prix_total, devise, unite (code + libellé déjà
traduit), prix formaté. Un seul appel pour toute la config.
Questions ouvertes pour Houlès :
- Le contexte client (pays, tarif, devise) arrive-t-il par session/token serveur
  ou à passer à chaque appel ? (Si passé par le client, le serveur doit le
  revalider.)
- Qui convertit les unités saisies (nous, avant l'appel, ou l'API via un
  paramètre) ? Ma préférence : nous, avec JSON en unité canonique.

## Exigences UX induites
- Rendu photo immédiat, prix asynchrone : état de chargement, jamais de prix
  périmé affiché comme valide, debounce des appels.
- Comportement si l'API prix échoue : à décider avec Benoit et Lorna (peut-on
  composer ? ajouter au panier ?).
- Aucun cache local du prix.

## Ce que j'attends de toi
- Confirmer ou corriger chaque hypothèse ci-dessus d'après le code.
- Lister ce qui manque ou ne tient pas.
- Dire ce qui est déjà en place et ce qu'il reste à faire de notre côté.

## Old code from Houles
- Regarde la conversation initiale : /Users/alain/projets/houles/docs/conversations-units.md