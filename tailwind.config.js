/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * BurnRatePro Brand Token System
         *
         * CRITICAL DEVELOPER GUIDELINES:
         *
         * 1. ALL brand colors MUST use these tokens - NEVER use hardcoded hex values
         * 2. FORBIDDEN in components: #F4B223, #E5A520, rgba(244,178,35,...)
         * 3. REQUIRED in components: bg-brp-primary, text-brp-primaryHover, etc.
         * 4. Brand color changes must ONLY be made in this file
         * 5. Changing these 3 token values updates all 37+ usages across the app
         *
         * Current token usage (37 instances across 6 components):
         * - brp-primary: Main brand color (buttons, headers, highlights)
         * - brp-primaryHover: Hover states and active elements
         * - brp-primarySoft: Soft backgrounds (15% opacity overlays)
         *
         * Structural colors (gray, grayLight, grayBorder) are NOT brand colors
         * and may be used directly where appropriate for layout/UI structure.
         */
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
