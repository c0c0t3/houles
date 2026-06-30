import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@studiometa/webpack-config';
import prototyping from '@studiometa/webpack-config-preset-prototyping';

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
  ],
  server(config) {
    config.ghostMode = false;
    config.server = ['dist', 'public'];
  },
});
