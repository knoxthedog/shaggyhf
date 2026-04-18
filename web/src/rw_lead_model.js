import { newTornApiClient } from './torn_api.js'
import { computeOriginalTarget, targetAtTime, scoreNeeded, coastTime, nextEnrollmentDeadline } from './war_score.js'
import { epochToDatetimeLocal, datetimeLocalToEpoch } from './datetime_model.js'

const FACTION_ID = 49297

const fmtScore = (n) => {
    const num = Math.round(typeof n === 'number' ? n : 0)
    return num.toLocaleString()
}

export function leadModel() {
    return {
        apiKey: null,
        apiKeyInput: '',
        apiClient: null,

        ongoingWars: [],
        selectedWarId: '',
        isLoading: false,
        error: '',

        step: 1,

        deadlineStr: '',

        get selectedWar() {
            return this.ongoingWars.find(w => `${w.id}` === `${this.selectedWarId}`) || null
        },

        get ourFaction() {
            return this.selectedWar?.factions?.find(f => f.id === FACTION_ID) || null
        },

        get theirFaction() {
            return this.selectedWar?.factions?.find(f => f.id !== FACTION_ID) || null
        },

        get originalTarget() {
            if (!this.selectedWar) return 0
            return computeOriginalTarget(
                this.selectedWar.target,
                this.selectedWar.start,
                Date.now() / 1000
            )
        },

        get deadlineEpoch() {
            if (!this.deadlineStr) return null
            return datetimeLocalToEpoch(this.deadlineStr)
        },

        get targetAtDeadline() {
            if (!this.selectedWar || !this.deadlineEpoch) return 0
            return targetAtTime(this.originalTarget, this.selectedWar.start, this.deadlineEpoch)
        },

        get pointsNeeded() {
            if (!this.ourFaction || !this.deadlineEpoch) return 0
            return scoreNeeded(this.ourFaction.score, this.originalTarget, this.selectedWar.start, this.deadlineEpoch)
        },

        get canCoast() {
            return this.ourFaction && this.pointsNeeded === 0
        },

        get coastTimeEpoch() {
            if (!this.ourFaction || !this.selectedWar) return null
            return coastTime(this.ourFaction.score, this.originalTarget, this.selectedWar.start)
        },

        get coastTimeFormatted() {
            if (!this.coastTimeEpoch) return null
            return new Date(this.coastTimeEpoch * 1000).toISOString().replace('T', ' ').replace('Z', '') + ' TCT'
        },

        get warStartFormatted() {
            if (!this.selectedWar) return ''
            return new Date(this.selectedWar.start * 1000).toISOString().replace('T', ' ').replace('Z', '') + ' TCT'
        },

        fmtScore,

        nextStep() {
            if (this.step === 1 && this.canProceed()) {
                this.step = 2
            }
        },

        prevStep() {
            if (this.step === 1) {
                window.location.href = './index.html'
            } else {
                this.step = 1
            }
        },

        canProceed() {
            return !!this.selectedWarId && !!this.deadlineEpoch && !this.isLoading
        },

        saveApiKey() {
            if (!this.apiKeyInput) return
            localStorage.setItem('tornApiKey', this.apiKeyInput)
            this.apiKey = this.apiKeyInput
            this.apiKeyInput = ''
            this.setupApiClient()
            this.fetchWars()
        },

        setupApiClient() {
            this.apiClient = newTornApiClient(this.apiKey, fetch, 'https://api.torn.com/v2')
        },

        async fetchWars() {
            this.isLoading = true
            this.error = ''
            try {
                const result = await this.apiClient.fetchRankedWars(FACTION_ID)
                const wars = Array.isArray(result.rankedwars) ? result.rankedwars : Object.values(result.rankedwars || {})
                this.ongoingWars = wars
                    .filter(w => w.winner == null || w.winner === 0)
                    .map(w => ({
                        id: w.id,
                        start: w.start,
                        end: w.end,
                        target: w.target,
                        winner: w.winner,
                        factions: w.factions,
                    }))
                if (this.ongoingWars.length === 1) {
                    this.selectedWarId = String(this.ongoingWars[0].id)
                }
            } catch (err) {
                console.error(err)
                this.error = 'Failed to fetch ranked wars.'
            } finally {
                this.isLoading = false
            }
        },

        onSelectedWarChange(newId) {
            if (!newId) return
            const now = Date.now() / 1000
            this.deadlineStr = epochToDatetimeLocal(nextEnrollmentDeadline(now))
        },

        init() {
            this.apiKey = localStorage.getItem('tornApiKey')
            if (this.apiKey) {
                this.setupApiClient()
                this.fetchWars()
            }
            this.$watch('selectedWarId', (newId) => this.onSelectedWarChange(newId))
        },
    }
}
