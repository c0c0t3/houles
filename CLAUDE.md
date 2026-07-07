# CLAUDE.md — Projet Style Your Hardware

## Contexte du projet

Feature de personnalisation en ligne pour un client passementerie haut de gamme (Houlès).
Le projet s'appelle **Style Your Hardware** et permet de configurer une tringlerie sur-mesure
(diamètre, longueur, embouts, supports, couleurs, finition) avec un rendu visuel temps réel.

**Lancement prévu : janvier 2027**

Ce dépôt contient uniquement la **feature SYH** intégrée dans un projet Twig/Tailwind existant.
Le back-end et la logique métier (panier, pricing réel, stock) sont gérés côté client.

---

## Stack technique

- **Templating** : Twig
- **CSS** : Tailwind CSS
- **JS Framework** : `@studiometa/js-toolkit` ^3.0.5
- **UI Components** : `@studiometa/ui` ^1.1.1
- **Rendu visuel** : SVG inline, composition par calques, colorisation dynamique via `fill`
- **Data** : fetch JSON (mock API statique en démo, endpoint réel côté client en production)

---

## Architecture des données

Le configurateur est piloté par un **schéma JSON par collection**, chargé via `fetch` au démarrage.
Ce schéma est la source de vérité pour :
- La structure des étapes et des champs
- Les options produits et leurs variantes coloris
- Les règles de filtrage (`showIf`)
- Le flag `colorisation` (active ou non le rendu SVG et le module couleurs)

Les données mockées sont des fichiers JSON statiques dans `/mock-api/collections/`.
En production, le client remplace l'URL dans la couche d'accès data (`configuratorApi.js`).

Le **filtrage de compatibilité** est géré côté front en démo via `showIf`.
En production, le filtrage est serveur (responsabilité du client).

Le **pricing**, le **stock réel** et la **réactivité panier** sont hors scope — responsabilité du client.

---

## Choix techniques clés

### Fetch et couche data
- Un seul module `configuratorApi.js` centralise tous les appels fetch
- Le mock et le réel ne diffèrent que par l'URL de base — un seul point de bascule
- Une latence simulée (300ms) est incluse dans les mocks pour représenter fidèlement le comportement réel

### Rendu SVG
- Les SVG sont chargés en **inline** via fetch, jamais en `<img>` ou `url()`
- Chaque path colorisable porte un attribut `data-fill="primary"` ou `data-fill="shadow"`
- La colorisation est appliquée en JS via `setAttribute('fill', hex)` après chargement
- Convention de nommage : `{element}--{modele}--{diametre}.svg` (ex: `embout--vase--35.svg`)
- Tous les SVG partagent le même `viewBox` pour garantir l'alignement des calques

### Collections
- Chaque collection a un flag `colorisation: true/false`
- `true` → module couleurs actif (nuancier, moteur de recherche, rendu SVG colorisé)
- `false` → coloris global à l'étape 1, pas de personnalisation par élément

### Composants fields
Les champs du formulaire sont des composants Twig réutilisables, pilotés par le type déclaré dans le JSON :
`radio`, `radio conditionnel` (dependsOn), `length`, `product`, `product_toggle`, `coloris`

### Panier (front uniquement)
- Le composant panier est un drawer Twig/Tailwind avec un markup de ligne templatisable
- Les états visuels (vide, rempli, chargement) sont gérés côté front
- La réactivité réelle (ajout/suppression/calcul) est branchée par le client via son propre JS

## Avant toute implémentation

- Lire le fichier `docs/` correspondant au module concerné avant d'écrire du code
- En cas de doute sur le périmètre ou un choix technique, demander plutôt que supposer

- **Par défaut, ne créer/modifier QUE dans les chemins listés dans le périmètre.

---

## Périmètre — ce que Claude Code fait sur ce projet

- Vue twig dans `src/templates/pages/configurateurTringlerie/index.twig`
- JS du composant syh dans : `src/js/syh/syh.js`
- Les features JS sont dans : `src/js/syh/features/*.js`
- JS du mock de l'API : `src/js/syh/configuratorApi.js`
- Fichiers JSON dans `/mock-api/collections/`
- Les SVG dans `src/svg/syh/`
- SVG sources (démo) : `public/svg/syh/` — copiés dans `dist/` au build, servis statiquement pour le fetch inline
- Bien commenter toutes les features JS. Nommer et typer les parametres.

---

## ⛔ Ce que Claude Code ne doit jamais faire

- **Ne pas toucher au reste du projet** en dehors des répertoires listés ci-dessus
- **Ne pas modifier les composants JS existants** du projet (`src/js` hors feature SYH)
- **Ne pas modifier le JS du panier client** — il a son propre système AJAX hors JS Toolkit
- **Ne pas modifier `src/js/app.js` ou le point d'entrée JS principal** du projet
- **Ne pas modifier les fichiers Twig globaux** (layouts, macros partagées, composants existants)
- **Ne pas modifier `tailwind.config.js`** sans validation explicite
- **Ne pas installer de nouvelles dépendances** sans validation explicite
- **Ne pas générer de logique métier** (calcul de prix réel, validation stock, logique de commande)
- **Ne pas écrire de code PHP** — ce projet est front uniquement
- En production : le chemin du SVG provient de la réponse API (champ `svgUrl` par variante), jamais codé en dur
- **Par défaut, ne créer/modifier QUE dans les chemins listés dans le périmètre.- ** Tout fichier hors de ces chemins nécessite une validation explicite avant modification.


---

## Structure des docs

Le dossier `/docs/` contient un descriptif détaillé par feature/module.
Ces fichiers font référence pour toute implémentation.

```
docs/
  module-3-architecture.md
  module-4-configurateur-steps.md
  module-5-etapes-intermediaires.md
  module-6-rendu-svg.md
  module-7-recapitulatif-panier.md
```

Lire le fichier `docs/` correspondant avant d'attaquer un module.

---

## Contacts & responsabilités

| Périmètre | Responsable |
|---|---|
| Front SYH (cette feature) | Alain (prestataire) |
| Back-end, API réelle, stock | DSI client |
| Réactivité panier, pricing réel | Client (JS propre hors Toolkit) |
| Contenu éditorial, visuels SVG | À fournir par le client |