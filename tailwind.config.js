/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAFA',
        card: '#FFFFFF',
        border: {
          DEFAULT: '#E5E5E5',
          soft: '#F0F0F0',
        },
        foreground: {
          DEFAULT: '#1A1A1A',
          secondary: '#525252',
        },
        muted: {
          DEFAULT: '#F5F5F5',
          foreground: '#737373',
        },
        accent: {
          DEFAULT: '#0066FF',
          hover: '#0052CC',
          light: '#E6F0FF',
        },
        success: '#10B981',
        error: '#EF4444',
        destructive: '#EF4444',
        status: {
          active: '#0066FF',
          todo: '#737373',
          progress: '#F59E0B',
          review: '#8B5CF6',
          done: '#10B981',
          archived: '#6B7280',
        },
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.5' }],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        'top': '0 -2px 8px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
