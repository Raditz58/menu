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
        'admin-bg': 'var(--admin-bg)',
        'admin-surface': 'var(--admin-surface)',
        'admin-primary': 'var(--admin-primary)',
        'admin-accent': 'var(--admin-accent)',
        'admin-text': 'var(--admin-text)',
        'admin-text-muted': 'var(--admin-text-muted)',
        'admin-success': 'var(--admin-success)',
        'admin-warning': 'var(--admin-warning)',
        'admin-danger': 'var(--admin-danger)',
      }
    },
  },
  plugins: [],
}
