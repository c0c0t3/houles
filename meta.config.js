import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, WebpackDefinePlugin } from '@studiometa/webpack-config';
import prototyping from '@studiometa/webpack-config-preset-prototyping';

// Sous-dossier FTP où le build est réellement déployé (pas la racine du domaine). Seulement en
// prod : en dev, le serveur local sert déjà tout à la racine — préfixer casserait le hot-reload.
const DEPLOY_SUBFOLDER = '/assets/houles';

export default defineConfig({
  presets: [
    prototyping({
      html: {
        scriptLoading: 'blocking',
        minify: false,
      },
      twig: {
        namespaces: {
          ui: dirname(fileURLToPath(import.meta.resolve('@studiometa/ui'))),
          svg: './src/svg',
        },
      },
    }),
    {
      name: 'no-html-minify',
      handler(config, { extendWebpack }) {
        extendWebpack(config, (webpackConfig) => {
          for (const rule of webpackConfig.module.rules) {
            if (rule?.test?.toString() === '/\\.twig$/') {
              for (const use of rule.use) {
                if (use.loader === 'html-loader') {
                  use.options.minimize = false;
                }
              }
            }
          }
        });
      },
    },
    // Chemin public des assets webpack (css/js) sur le serveur FTP. Sans ça, webpack retombe sur
    // publicPath: 'auto', et html-webpack-plugin injecte des <link>/<script> en chemin absolu
    // depuis la racine ("/vendors....css") au lieu de ce sous-dossier, d'où des 404 une fois déployé.
    //
    // Ne couvre PAS les fichiers statiques fetchés "à la main" par le SYH (mock JSON, SVG/images
    // inline — voir configuratorApi.js, chemins root-absolute stockés en donnée) : ceux-là reçoivent
    // le même préfixe via la constante globale __SYH_BASE_PATH__ injectée ci-dessous.
    (isDev) => ({
      name: 'syh-deploy-subfolder',
      handler(config, { extendWebpack }) {
        config.public = isDev ? undefined : `${DEPLOY_SUBFOLDER}/`;
        extendWebpack(config, (webpackConfig) => {
          webpackConfig.plugins.push(
            new WebpackDefinePlugin({
              __SYH_BASE_PATH__: JSON.stringify(isDev ? '' : DEPLOY_SUBFOLDER),
            })
          );
        });
      },
    }),
  ],
  server(config) {
    config.ghostMode = false;
    config.server = ['dist', 'public'];
  },
});
