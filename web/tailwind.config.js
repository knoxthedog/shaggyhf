// tailwind.config.js
export default {
    darkMode: 'class',
    content: [
        './*.html',
        './src/**/*.{js,html}'
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    DEFAULT: '#f9fafb',   // light background
                    dark: '#1f2937'       // dark mode background (gray-800)
                },
                surface: {
                    DEFAULT: '#ffffff',   // panels, cards
                    dark: '#374151'       // dark mode card (gray-700)
                },
                textPrimary: {
                    DEFAULT: '#1f2937',   // main text (gray-800)
                    dark: '#f3f4f6'       // light text (gray-100)
                },
                textSecondary: {
                    DEFAULT: '#6b7280',   // secondary text (gray-500)
                    dark: '#9ca3af'       // dark secondary text (gray-400)
                },
                border: {
                    DEFAULT: '#d1d5db',   // gray-300
                    dark: '#4b5563'       // gray-600
                },
                accent: {
                    DEFAULT: '#3b82f6',   // blue-600 (unchanged)
                    dark: '#3b82f6'
                },
                accentHover: {
                    DEFAULT: '#2563eb',   // blue-700
                    dark: '#2563eb'
                },
                muted: {
                    DEFAULT: '#e5e7eb',   // gray-200
                    dark: '#4b5563'       // gray-600
                },
                warningBg: {
                    DEFAULT: '#fef3c7',   // yellow-100
                    dark: '#92400e'       // amber-800 as dark background for warning
                },
                warningText: {
                    DEFAULT: '#92400e',   // amber-800
                    dark: '#fef3c7'       // yellow-100
                }
            }
        }
    },
    plugins: []
}
