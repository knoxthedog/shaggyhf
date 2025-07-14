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
                warningText: 'var(--color-warning-text)',
                dangerBg: 'var(--color-danger-bg)',
                dangerText: 'var(--color-danger-text)',
                successBg: 'var(--color-success-bg)',
                successText: 'var(--color-success-text)',
                infoBg: 'var(--color-info-bg)',
                infoBorder: 'var(--color-info-border)',
                infoText: 'var(--color-info-text)',
                infoTextStrong: 'var(--color-info-text-strong)',
            },
        },
    },
    plugins: []
}
