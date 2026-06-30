import { defineConfig, js, prettier, globals } from '@studiometa/eslint-config';

export default defineConfig(js, prettier, {
  files: ['src/**/*.js'],
  languageOptions: {
    globals: {
      ...globals.browser,
    },
  },
});
