export function mountWizardFooter() {
    const footer = document.createElement('div')
    footer.className = 'fixed bottom-0 left-0 right-0 bg-surface border-t border-border shadow-md px-6 py-3 z-50'
    footer.innerHTML = `
        <div class="max-w-4xl mx-auto flex items-center justify-between">
            <button @click="prevStep()" class="btn-compact bg-muted hover:bg-border disabled:opacity-50">\u2190 Back</button>
            <div class="flex items-center gap-2">
                <template x-for="n in 3">
                    <div :class="{'w-4 h-4 rounded-full': true, 'bg-accent': step === n, 'bg-muted': step !== n}"></div>
                </template>
            </div>
            <button @click="nextStep()" :disabled="!canProceed() || step === 3" class="btn-compact bg-accent text-white hover:bg-accentHover disabled:opacity-50">Next \u2192</button>
        </div>`
    document.body.appendChild(footer)
}
