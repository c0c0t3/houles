# www.houles.com

## Installer le projet

```bash
git clone gitlab@gitlab.studiometa.dev:studiometa/www.houles.com.git
```

## Installation

Installer les dépendances nécessaires :

```bash
# Installer les dépendances NPM avec la version de node du projet
nvm use
npm install
```

## Développement

### Commandes disponibles

#### NPM

| Commande | Description |
|-|-|
| `npm run dev` | Démarre le serveur de compilation des fichiers SCSS et JS du thème. |
| `npm run build` | Build les fichiers SCSS, JS et Vue du thème. |
| `npm run lint` | Lint les fichiers SCSS, JS, Vue et Twig du thème avec ESLint, Stylelint et Prettier. |
| `npm run lint:scipts` | Lint les fichiers JS et Vue du thème avec ESLint et Prettier. |
| `npm run lint:styles` | Lint les fichiers SCSS et Vue du thème avec Stylelint et Prettier. |
| `npm run lint:templates` | Lint les fichiers Twig avec Prettier. |
| `npm run fix` | Formate les fichiers SCSS, JS, Vue et Twig du thème avec ESLint, Stylelint et Prettier. |
| `npm run fix:scipts` | Formate les fichiers JS et Vue du thème avec ESLint et Prettier. |
| `npm run fix:styles` | Formate les fichiers SCSS et Vue du thème avec Stylelint et Prettier. |
| `npm run fix:templates` | Formate les fichiers Twig du thème Prettier. |
