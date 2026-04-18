export function apiKeyModel() {
    return {
        apiKeyInput: '',
        savedMessage: false,
        init() {
            const storedKey = localStorage.getItem('tornApiKey')
            if (storedKey) {
                this.apiKeyInput = storedKey
            }
        },
        saveApiKey() {
            if (this.apiKeyInput.trim()) {
                localStorage.setItem('tornApiKey', this.apiKeyInput.trim())
                this.savedMessage = true
                setTimeout(() => this.savedMessage = false, 2000)
            }
        }
    }
}
