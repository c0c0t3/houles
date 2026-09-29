# Module 7 — Configurateur : Récapitulatif & panier (front)

> Couvre l'étape finale de récapitulatif, le composant panier (drawer) côté front, et le point de
> jonction avec le JS du client au moment de la validation. Dépend des Modules 3, 4 et 5.

---

## Périmètre

Ce module produit **l'interface** du récapitulatif et du panier, et **transmet** la configuration au
client au moment de la validation. Il ne contient **aucune logique métier de panier réel** : ajout,
suppression, recalcul, validation stock, sérialisation sont côté client.

Frontière (voir CLAUDE.md) :
- **Front (ce module)** : markup du récapitulatif et du drawer, états visuels, construction de l'objet
  de configuration, émission au moment de la validation.
- **Client** : réactivité panier réelle, pricing, check stock, sauvegarde/rechargement (Ajax + PHP).

---

## 1. Récapitulatif

Affiche la synthèse complète de la configuration avant validation :

- Configuration : type, diamètre, système de pose, longueur.
- Coloris et finitions par élément.
- La liste des lignes (produits résolus) : libellé, quantité commandable, prix unitaire, prix total.
- Bloc réassurance (délai, qualité, suivi) — contenu éditorial.

Les lignes du récapitulatif sont les **lignes résolues** du panier (voir section 3) : chaque produit
sélectionné, avec sa variante coloris, sa quantité commandable (arrondie au `qtyParUnite`, Module 5)
et son prix.

En configuration double, les éléments dédoublés apparaissent en **lignes séparées** (avant / arrière),
jamais fusionnés en une ligne ×2 (Module 5).

### Étape implicite

L'étape `recap` n'est **jamais déclarée dans le JSON de collection** : elle ne porte aucune donnée
propre à une collection donnée (dans les 3 mocks, elle n'était qu'un objet identique partout —
`{ "id": "recap", "label": "Recapitulatif", "fields": [] }`, pur boilerplate). Elle est injectée par
le front, toujours en dernière étape, dans `configuratorApi.js` (`fetchCollection()`) — un seul point
d'injection, avant même `steps-renderer.js`. Les équipes qui maintiennent les collections n'ont donc
rien à déclarer pour cette étape (et ne risquent pas de l'oublier sur une nouvelle collection).

### Implémenté

- `recap.js` expose `renderRecap()` : bandeau persistant (`Configurator.$refs.recap`, limité aux
  champs de l'étape 1) et le même rendu dans le conteneur dédié de l'étape `recap`
  (`[data-ref="recapStepContent"]`, voir `steps-renderer.js`). Affiche aussi la dernière longueur
  totale avec embouts calculée dans la modale dédiée, et le **Total** de la configuration en cours
  (`computeCartPayload().total`, voir section 3).
- `recap.js` expose aussi `renderProductSummary()`, propre au conteneur
  `[data-ref="recapProductSummary"]` de l'étape `recap` (pas dans le bandeau, trop dense pour un
  affichage permanent) : un **tableau** listant tous les produits sélectionnés, toutes étapes
  confondues — bouton « voir le produit » (lien vers la fiche produit Houlès, `option.productUrl`
  suffixé par le coloris sélectionné — voir `json-schema-reference.md`, absent si `productUrl` non
  déclaré), nom (groupé visuellement par label de champ — Support, Tube, Anneaux, Jambe de force
  réglable...), quantité commandable, prix unitaire. Quantité calculée via `resolveQty()` (exporté
  par `cart-payload.js` — même calcul « à la volée » que le payload panier réel, pas de logique
  dupliquée). Le forfait de coupe (`computeCartPayload().forfait`), si nécessaire, apparaît en
  dernière ligne du tableau (« Service » / « Forfait coupe »), sans prix (`—`).
- La carte produit (étape produit, avant le récap) porte le même lien « Voir le produit » — voir
  `_buildCard()` dans `product-field.js` (Module 4).
- Bloc réassurance (délai, qualité, suivi) : **pas encore implémenté** — contenu éditorial à obtenir
  du client.

---

## 2. Composant panier (drawer)

Fichier : composant Twig/Tailwind + `src/js/syh/features/cart-drawer.js`

Le drawer est l'affichage du panier. **Côté front, il est visuel** : le markup, les états, les
transitions d'ouverture. La réactivité réelle (contenu, recalcul) est branchée par le client.

### Markup de ligne templatisable

Le drawer expose un **markup de ligne templatisable** (un `<template>` ou un élément marqué) que le
client clone et remplit avec sa donnée. Le front livre la coquille + une ligne d'exemple ; le client
industrialise le remplissage avec son JS.

Une ligne affiche : image produit, libellé, coloris, quantité, prix. La structure exacte de la ligne
doit être calée avec le client (le format qu'attend son JS panier).

### États visuels

Le front gère les états d'affichage : panier vide, panier rempli, chargement. Les transitions
d'ouverture/fermeture du drawer sont côté front.

---

## 3. Construction de l'objet de configuration

Deux fonctions distinctes dans `cart-payload.js`, deux usages différents — à ne pas confondre :

### `computeAddToCartPayload()` — l'objet transmis au client (contrat fourni par le client)

C'est **celui-ci** qui part dans l'événement `syh:add-to-cart` (voir section 5) au clic "Ajouter au
panier" — `Configurator.buildCartPayload()` l'appelle directement. Contrat donné par le client,
sans ambiguïté restante :

```js
{
  modele_id: 1033,       // collection.modeleId (JSON de collection — voir json-schema-reference.md)
  quantite: 1,            // pas de sélecteur de quantité globale dans l'UI actuelle, toujours 1
  longueur: 240,           // selection.longueur, brute (sans embouts)
  selections: [
    { field_id: "support", refBase: "66778", coloris: "0010", quantite: 3 },
    { field_id: "tube",    refBase: "64203", coloris: "0010", quantite: 1 },
    // ...une entrée par champ produit sélectionné, PAS agrégée par article — le client veut
    // retrouver le field_id d'origine (ex : "support" et "opt_support_interm" restent deux
    // lignes distinctes même si elles partagent le même refBase).
    { field_id: "forfait_coupe", refBase: "80099", coloris: null, quantite: 2 },
    // ...ligne forfait de coupe, ajoutée seulement si au moins une coupe est nécessaire (voir
    // ci-dessous) — field_id synthétique (pas un vrai champ JSON), refBase = FORFAIT_COUPE_EAN
    // (forfait-coupe.js) en guise de référence article, pas de coloris.
  ]
}
```

- **Aucun prix** dans ce payload — le client recalcule selon le tarif du compte connecté (voir
  section 4, "check d'autorité côté client").
- `field_id` est l'id du champ JSON (ex : `support`, `opt_support_interm`, `tube_avant`...), pas
  l'id article — c'est ce qui distingue ce format de `computeCartPayload()` ci-dessous.
- `quantite` (par ligne) est la quantité commandable, calculée à la volée par `resolveQty()` — pas
  le besoin brut (Module 5).
- **Forfait de coupe** : le format fourni par le client n'a pas de champ dédié pour ça — ajouté
  comme ligne `selections[]` de plus (`field_id: "forfait_coupe"`), convention front puisque le
  contrat ne prévoyait rien. **À confirmer avec le client** que cette convention lui convient (sinon
  forme alternative à définir ensemble).

### `computeCartPayload()` — usage interne uniquement (Total du récap)

Sert **uniquement** à calculer et afficher le **Total** dans le récapitulatif (bandeau + étape
recap, voir section 1) — jamais transmis au client. Agrège les lignes par article (`id` complet
refBase-coloris, pas par `field_id`) et porte les prix (placeholders de démo, JSON de collection) :

```js
{
  id: "66808-35",          // code article complet (refBase-coloris), résolu
  refBase: "66808",
  coloris: "35",
  name: "Anneaux fermés Ø25 (lot de 6)",
  qty: 2,                  // quantité COMMANDABLE (déjà arrondie au qtyParUnite), cumulée si agrégée
  prixUnitaire: 8.90,      // placeholder de démo, depuis le JSON de collection (Elastic en prod)
  prixTotal: 17.80
}
```

`computeCartPayload(schema, selection, expandedStepFields)` retourne `{ items, coupes, forfait, total }` :
`total` est la somme des `prixTotal` de toutes les lignes (le forfait coupe n'a pas de prix dans les
données de démo — seulement `ean`/`qty` — il n'est donc pas inclus dans `total`).

---

## 4. Bouton « Ajouter au panier » / validation

Au clic, le front :
1. Construit l'objet de configuration complet (paramètres + lignes résolues).
2. Le transmet au client via le point de jonction convenu (voir section 5).

Le front **ne valide pas** prix ni stock. Le **check d'autorité** est côté client : à l'ajout, le
client revérifie prix et stock réels (Module 3). Si le retour signale une indisponibilité ou un
changement, le front affiche ce retour — il ne décide rien.

---

## 5. Point de jonction avec le JS client

**Résolu et implémenté** : événement custom. Le front émet `syh:add-to-cart` sur `this.$el`
(bubbles: true) avec le payload de `computeAddToCartPayload()` (section 3) dans `detail` — voir
`Configurator._addToCart()` dans `configurator.js`. Le client s'y abonne et déclenche son Ajax ; ce
module ne fait pas l'appel réseau lui-même.

```js
document.querySelector('[data-component="Syh"]').addEventListener('syh:add-to-cart', (e) => {
  console.log(e.detail); // { modele_id, quantite, longueur, selections }
});
```

### Bidirectionnel : sauvegarde ET rechargement

La communication va dans les deux sens :

- **Front → client (sauvegarde)** : à la validation, le front transmet l'objet de configuration ; le
  client le sérialise (`sauvegarder()` : serialize + gzcompress + stockage blob).
- **Client → front (rechargement)** : une config sauvegardée peut être rechargée (depuis le panier ou
  depuis « mon compte »). Le client redonne l'objet ; le front doit **reconstruire l'état** et
  rejouer la configuration.

Le rechargement n'est pas un simple remplissage de champs : il faut **rejouer la cascade** (restaurer
les paramètres, réévaluer les `showIf`, restaurer les produits, recalculer quantités et panier), sinon
la config affichée peut être incohérente.

---

## Points de décision encore ouverts (bloquants pour cette couche)

- **Convention forfait de coupe à valider** : `computeAddToCartPayload()` (section 3) ajoute le
  forfait comme ligne `selections[]` de plus (`field_id: "forfait_coupe"`) — le format fourni par le
  client n'ayant pas de champ dédié pour ça, c'est une convention front. À faire confirmer par le
  client (ou forme alternative à définir si elle ne convient pas).
- **Format de ligne** attendu par le JS panier du client (pour le markup templatisable du drawer,
  section 2 — pas encore implémenté).
- **Config rechargée périmée** : si un produit d'une config sauvegardée n'existe plus dans le
  catalogue actuel, comportement à définir (bloquer + message, config partielle en signalant l'élément
  manquant, substitution...).
- **Origines du rechargement** : panier vs « mon compte » — même flux technique ou deux mécanismes.

> Deux points de cette liste sont **résolus depuis** et retirés d'ici :
> - **Structure exacte de l'objet transmis au client** : contrat fourni par le client, implémenté
>   dans `computeAddToCartPayload()` (section 3) — `modele_id` / `quantite` / `longueur` /
>   `selections[]` (`field_id`/`refBase`/`coloris`/`quantite`), sans prix.
> - **Mécanisme d'accroche** : événement custom `syh:add-to-cart` (section 5).

---

## Organisation du code

```
src/js/syh/
  configuratorApi.js       ← injecte l'étape `recap` implicite (fetchCollection), voir section 1
  features/
    recap.js                ← rendu du récapitulatif (bandeau + étape) et du résumé produits (tableau)
    cart-drawer.js           ← drawer panier (markup, états visuels) — pas encore implémenté
    cart-payload.js          ← computeAddToCartPayload() (transmis au client) + computeCartPayload() (Total récap, interne)
```

`cart-payload.js` expose deux fonctions distinctes (voir section 3) : `computeAddToCartPayload()`
pour l'objet réellement transmis au client (`Configurator.buildCartPayload()`/`_addToCart()`), et
`computeCartPayload()` pour le calcul interne du Total affiché dans le récapitulatif. La
reconstruction à partir d'un objet rechargé (section 5) reste à faire.