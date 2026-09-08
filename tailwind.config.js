import tailwind from 'tailwindcss/defaultConfig';
import { config } from '@studiometa/tailwind-config';
import plugin from 'tailwindcss/plugin';

/**
 * TailwindCSS Configuration File.
 * @see     https://tailwindcss.com/docs/configuration
 * @default https://github.com/studiometa/tailwind-config/blob/develop/src/index.js
 * @type   {import('tailwindcss').Config}
 */
export default {
  presets: [tailwind, config],
  // Extends the default Studio Meta Tailwind configuration here...
  // plugins: [...],
  // Learn more on https://tailwindcss.com/docs/controlling-file-size/#removing-unused-css
  theme: {
    customVariants: {
      'is-active': '&.is-active',
      'parent-is-active': '.is-active &',
      'is-done': '&.is-done',
      'parent-is-done': '.is-done &',
      'search-cancel': '&::-webkit-search-cancel-button',
      'piece-selected': '&.pieceSelected,',
      'piece-selected-parent': '.pieceSelected &',
      'button-selected': '&.buttonSelected',
    },
    variants: {
      extend: {
        display: ['group-aria-expanded'],
      },
    },
    customContainer: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        m: '2rem',
      },
      maxWidth: {
        DEFAULT: '90rem',
        xxl: '100rem',
        xxxl: '120rem',
      },
    },
    fontFace: {
      Acma: [
        {
          filename: '../fonts/PPAcma-Book',
          weight: '400',
          display: 'swap',
        },
      ],
      NeueMontreal: [
        {
          filename: '../fonts/PPNeueMontreal-Book',
          weight: '400',
          display: 'swap',
        },
        {
          filename: '../fonts/PPNeueMontreal-Medium',
          weight: '500',
          display: 'swap',
        },
      ]
    },
    extend: {
      keyframes: {
        wiggle: {
          '0%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(15deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
      animation: {
        wiggle: 'wiggle 1s ease-out-elastic infinite',
      },
      transitionTimingFunction: {
        'out-elastic': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      },
      fontFamily: {
        sans: ['NeueMontreal', 'sans-serif'],
        serif: ['Acma', 'serif'],
      },
      colors: {
        'sand': {
          DEFAULT: '#FFFDF8',
          'darker': '#F7F2E7',
        },
        'gray': '#35363A',
        'green': {
          DEFAULT: '#28372F',
          'light': '#04AA6D',
        },
        'brown': {
          DEFAULT: '#7D7664',
          'light': '#DDD5CC',
        },
        'purple': {
          DEFAULT: '#533B3B',
          'light': '#7C6262',
          'extra-light': '#988484',
        },
      },
      fontSize: {
        'xxs': '0.625rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '6xl': '3.5rem',
        '7xl': '5rem',
        '8xl': '6.87rem',
        'clamp': 'clamp(1.5rem, 9vw, 7rem)',
      },
      lineHeight: {
        'xtight': '1.1',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities, theme }) => {
      addUtilities({
        '.ease-out-elastic': {
          'transition-timing-function': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        },
        '.disable-scrollbars': {
          scrollbarWidth: 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': {
            background: 'transparent',
            width: '0px',
            height: '0px',
          },
        },
        '.underline-effect-off': {
          position: 'relative',
          display: 'inline-block',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            display: 'block',
            width: '100%',
            height: '1px',
            background: 'currentColor',
            transition: `transform 0.8s ${theme('transitionTimingFunction.out-expo')}`,
            transformOrigin: '100% 0',
            transform: 'scaleX(0)',
          },
        },
        '.underline-effect-on': {
          position: 'relative',
          display: 'inline-block',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            display: 'block',
            width: '100%',
            height: '1px',
            background: 'currentColor',
            transition: `transform 0.8s ${theme('transitionTimingFunction.out-expo')}`,
            transformOrigin: '0 0',
            transform: 'scaleX(1)',
          },
        },
      });
    }),
  ],
  content: [
    './src/js/**/*.js',
    './src/js/**/*.vue',
    './src/templates/**/*.twig',
    './node_modules/@studiometa/ui/**/*.twig',
    './node_modules/@studiometa/ui/**/*.js',
    'tailwind.safelist.txt',
  ],
};
