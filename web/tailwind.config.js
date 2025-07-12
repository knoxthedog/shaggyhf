export default {
    darkMode: 'media',  // Use prefers-color-scheme automatically
    content: [
        './*.html',
        './src/**/*.{js,html}'
    ],
    theme: {
        extend: {
            colors: {
                background: 'var(--color-background)',
                surface: 'var(--color-surface)',
                textPrimary: 'var(--color-text-primary)',
                textSecondary: 'var(--color-text-secondary)',
                border: 'var(--color-border)',
                accent: 'var(--color-accent)',
                accentHover: 'var(--color-accent-hover)',
                muted: 'var(--color-muted)',
                warningBg: 'var(--color-warning-bg)',
                warningText: 'var(--color-warning-text)'
            }
        }
    },
    plugins: []
}
