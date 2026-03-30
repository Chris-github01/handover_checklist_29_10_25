/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brp: {
          primary: '#F4B223',
          primaryHover: '#E5A520',
          primarySoft: 'rgba(244,178,35,0.15)',
          gray: '#6B7280',
          grayLight: '#F3F4F6',
          grayBorder: '#D1D5DB'
        }
      }
    },
  },
  plugins: [],
};
