/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'menu-bg': 'var(--menu-bg)',
        'menu-surface': 'var(--menu-surface)',
        'menu-primary': 'var(--menu-primary)',
        'menu-accent': 'var(--menu-accent)',
        'menu-text': 'var(--menu-text)',
        'menu-text-muted': 'var(--menu-text-muted)',
        'menu-border': 'var(--menu-border)',
      }
    },
  },
  plugins: [],
}
