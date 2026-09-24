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
  confondues — bouton « voir le produit » (photo réelle du produit, `variant.image ?? option.image`,
  absent si non disponible), nom (groupé visuellement par label de champ — Support, Tube, Anneaux,
  Jambe de force réglable...), quantité commandable, prix unitaire. Quantité calculée via
  `resolveQty()` (exporté par `cart-payload.js` — même calcul « à la volée » que le payload panier
  réel, pas de logique dupliquée).
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

À chaque changement de sélection, le front (re)construit la liste des lignes à partir de l'état
`selection` (Module 4) et des règles de quantité (Module 5). Chaque ligne porte :

```js
{
  id: "66808-35",          // code article complet (refBase-coloris), résolu
  refBase: "66808",
  coloris: "35",
  name: "Anneaux fermés Ø25 (lot de 6)",
  qty: 2,                  // quantité COMMANDABLE (déjà arrondie au qtyParUnite)
  prixUnitaire: 8.90,      // placeholder de démo, depuis le JSON de collection (Elastic en prod)
  prixTotal: 17.80
}
```

- L'`id` est le code article complet résolu (ou code famille seul si `noColoris`).
- La `qty` est la quantité commandable, pas le besoin brut (Module 5).
- Le prix vient du JSON de collection (données Elastic, Module 3).
- Les lignes avec le même `id` article (ex : support + support intermédiaire) sont **agrégées** en une
  seule ligne (`qty`/`prixTotal` cumulés) — `computeCartPayload()`, dans `cart-payload.js`.

`computeCartPayload(schema, selection, expandedStepFields)` retourne `{ items, coupes, forfait, total }` :
`total` est la somme des `prixTotal` de toutes les lignes (le forfait coupe n'a pas de prix dans les
données de démo — seulement `ean`/`qty` — il n'est donc pas inclus dans `total`).

Cet objet — l'ensemble des lignes plus les paramètres de configuration — est ce qui sera transmis au
client à la validation, et ce qu'il sérialise. **Sa structure doit correspondre à ce qu'attend le
`sauvegarder()` du client** (voir section 5).

---

## 4. Bouton « Ajouter au panier » / validation

Au clic, le front :
1. Construit l'objet de configuration complet (paramètres + lignes résolues).
2. Le transmet au client via le point de jonction convenu (voir section 5).

Le front **ne valide pas** prix ni stock. Le **check d'autorité** est côté client : à l'ajout, le
client revérifie prix et stock réels (Module 3). Si le retour signale une indisponibilité ou un
changement, le front affiche ce retour — il ne décide rien.

---

## 5. Point de jonction avec le JS client (à confirmer)

Le client récupère la configuration via **JS + Ajax**. Le mécanisme exact d'accroche reste à
confirmer — trois possibilités :

- **Événement custom** : le front émet `syh:add-to-cart` (ou `syh:save-config`) avec la configuration
  dans `detail` ; le client s'abonne et déclenche son Ajax. *Recommandé* (le plus découplé).
- **Fonction exposée** : le front expose une API (`SYHConfigurator.getSelection()`) que le client
  appelle.
- **Data-attributes** : le front pose les données sur un élément, le client les lit.

À défaut de préférence du client, retenir l'**événement custom**.

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

- **Structure exacte de l'objet sérialisé par le client** (`sauvegarder()`) : c'est le contrat. Le
  front doit produire un objet aux mêmes champs, sans trou ni renommage. À obtenir du client.
- **Mécanisme d'accroche** : événement / fonction / data-attributes (voir section 5).
- **Format de ligne** attendu par le JS panier du client (pour le markup templatisable).
- **Config rechargée périmée** : si un produit d'une config sauvegardée n'existe plus dans le
  catalogue actuel, comportement à définir (bloquer + message, config partielle en signalant l'élément
  manquant, substitution...).
- **Origines du rechargement** : panier vs « mon compte » — même flux technique ou deux mécanismes.

---

## Organisation du code

```
src/js/syh/
  configuratorApi.js       ← injecte l'étape `recap` implicite (fetchCollection), voir section 1
  features/
    recap.js                ← rendu du récapitulatif (bandeau + étape) et du résumé produits (tableau)
    cart-drawer.js           ← drawer panier (markup, états visuels) — pas encore implémenté
    cart-payload.js          ← construction de l'objet de configuration transmis au client
```

`cart-payload.js` assemble l'objet (paramètres + lignes résolues) et gère l'émission à la validation
ainsi que la reconstruction à partir d'un objet rechargé.