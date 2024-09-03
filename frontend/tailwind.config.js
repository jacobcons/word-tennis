/** @type {import('tailwindcss').Config} */
import flowbiteTypography from 'flowbite-typography'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            'h1, h2, h3, h4, h5, h6': {
              marginTop: '0',
              marginBottom: '0'
            },
            p: {
              marginTop: '0',
              marginBottom: '0'
            },
            ul: {
              marginTop: '0',
              marginBottom: '0'
            },
            ol: {
              marginTop: '0',
              marginBottom: '0'
            },
            blockquote: {
              marginTop: '0',
              marginBottom: '0'
            },
            img: {
              marginTop: '0',
              marginBottom: '0'
            },
            figure: {
              marginTop: '0',
              marginBottom: '0'
            },
            figcaption: {
              marginTop: '0',
              marginBottom: '0'
            }
          }
        }
      }
    }
  },
  plugins: [flowbiteTypography]
}
