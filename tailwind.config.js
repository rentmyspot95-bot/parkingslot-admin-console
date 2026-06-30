/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand blue — primary actions / seeker context (app token --primary #0055FF).
        brand: {
          50: '#E8F0FF', // --primary-light
          100: '#D6E4FF',
          200: '#B3D1FF', // --primary-mid
          300: '#84B0FF',
          400: '#3D82FF',
          500: '#1F6BFF',
          600: '#0055FF', // --primary
          700: '#0044CC',
          800: '#00329A',
          900: '#002174',
          950: '#04045E', // --navy
        },
        // Deep navy — app chrome, headings, emphasis (--navy).
        navy: {
          DEFAULT: '#04045E',
          light: '#E8E8F5', // --navy-light
        },
        // Lime accent — owner / host context (--green).
        accent: {
          DEFAULT: '#B9FA3C', // --green
          dark: '#8BC02E', // --green-dark
          light: '#F0FDCE', // --green-light
        },
        // Semantic surface tokens (driven by CSS variables for theming).
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
