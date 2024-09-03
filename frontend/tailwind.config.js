/** @type {import('tailwindcss').Config} */
import flowbiteTypography from 'flowbite-typography'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: [flowbiteTypography]
}
