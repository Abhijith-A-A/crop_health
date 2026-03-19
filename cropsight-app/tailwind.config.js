/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        cta: '#F97316',
        background: '#F8FAFC',
        text: '#1E293B',
      },
      fontFamily: {
        heading: ['"Fira Code"', 'monospace'],
        body: ['"Fira Sans"', 'sans-serif'],
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      backgroundImage: {
        'organic-bg': "url('/organic-bg.svg')", /* Placeholder for organic feels */
      }
    },
  },
  plugins: [],
}
