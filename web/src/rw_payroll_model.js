import { newTornApiClient, collectRankedWarHitsFromData } from './torn_api.js'

const FACTION_ID = 49297; // Shaggy Hi-Fidelity

export function payrollModel() {
    return {
        apiKey: null,
        apiKeyInput: '',
        apiClient: null,
        rankedWars: [],
        selectedWarId: '',
        isLoading: false,
        showAudit: false,
        showNonFacHitsInAudit: false,
        error: '',

        // Inputs
        profit: null,
        costs: null,
        factionTake: null,
        outsideHitValue: null,
        profitInput: '',
        costsInput: '',
        isProfitInvalid: false,
        isCostsInvalid: false,
        isFactionTakeInvalid: false,
        isOutsideHitInvalid: false,

        // Report output
        report: [],
        auditLog: [],

        init() {
            this.apiKey = localStorage.getItem('tornApiKey')
            if (this.apiKey) {
                this.setupApiClient()
                this.fetchRankedWars()
            }
        },

        saveApiKey() {
            if (!this.apiKeyInput) return
            this.apiKey = this.apiKeyInput
            localStorage.setItem('tornApiKey', this.apiKey)
            this.setupApiClient()
            this.fetchRankedWars()
        },

        setupApiClient() {
            this.apiClient = newTornApiClient(this.apiKey, fetch, 'https://api.torn.com/v2')
        },

        async fetchRankedWars() {
            this.isLoading = true
            this.error = ''
            try {
                const FACTION_ID = 49297
                const result = await this.apiClient.fetchRankedWars(FACTION_ID)
                this.rankedWars = Object.entries(result.rankedwars).map(([id, war]) => ({
                    id: war.id,
                    start: war.start,
                    end: war.end,
                    factions: war.factions,
                    opposingFactionId: war.factions.find(f => f.id !== FACTION_ID)?.id || null,
                    opposingFactionName: war.factions.find(f => f.id !== FACTION_ID)?.name || 'Unknown Faction',
                }))
            } catch (err) {
                console.error(err)
                this.error = 'Failed to fetch ranked wars.'
            } finally {
                this.isLoading = false
            }
        },

        canGenerateReport() {
            const profit = this.parseNumber(this.profitInput);
            const costs = this.parseNumber(this.costsInput);
            return (
                this.selectedWarId &&
                profit != null &&
                costs != null &&
                this.factionTake != null &&
                this.outsideHitValue != null
            );
        },

        parseNumber(value) {
            if (!value) return null;
            const cleaned = value.replace(/^\s*\$/, '').replace(/,/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        },

        formatCurrency(value) {
            return `$${value.toLocaleString()}`
        },

        validateProfit() {
            const profit = this.parseNumber(this.profitInput);
            this.isProfitInvalid = profit === null;
        },

        validateCosts() {
            const costs = this.parseNumber(this.costsInput);
            this.isCostsInvalid = costs === null;
        },

        validateFactionTake() {
            const val = this.factionTake;
            this.isFactionTakeInvalid = val == null || val < 0 || val > 100;
        },

        validateOutsideHit() {
            const val = this.outsideHitValue;
            this.isOutsideHitInvalid = val == null || val < 0 || val > 100;
        },

        async generateReport() {
            this.isLoading = true
            this.error = ''
            this.report = []

            const profit = this.parseNumber(this.profitInput);
            const costs = this.parseNumber(this.costsInput);
            if (profit == null || costs == null) {
                this.error = 'Invalid input values';
                this.isLoading = false;
                return;
            }

            try {
                const rankedWar = this.rankedWars.find(w => w.id == this.selectedWarId)
                const { start, end } = rankedWar;
                const attacks = await this.apiClient.fetchAttacksInWindow(start, end);
                const { participants, auditLog } = collectRankedWarHitsFromData(rankedWar, attacks, FACTION_ID);

                this.auditLog = auditLog.map(e => ({
                    ...e,
                    timestamp: new Date(e.timestamp * 1000).toLocaleString()
                }));

                if (!this.showNonFacHitsInAudit) {
                    this.auditLog = this.auditLog.filter(e => e.isAttackerFacMember);
                }

                // Compute effective hits and total
                let totalEffectiveHits = 0
                const playerStats = participants.map(p => {
                    const warHits = p.warHits.length
                    const outsideHits = p.outsideHits.length
                    const effectiveHits = warHits + outsideHits * (this.outsideHitValue / 100)
                    totalEffectiveHits += effectiveHits
                    return {
                        id: p.id,
                        name: p.name,
                        warHits,
                        outsideHits,
                        effectiveHits
                    }
                })

                const netProfit = profit - costs;
                const factionPayout = netProfit * (this.factionTake / 100);
                const playersPayout = netProfit - factionPayout;

                // Apportion payouts
                this.report = playerStats.map(p => ({
                    ...p,
                    payout: totalEffectiveHits > 0 ? Math.round(playersPayout * (p.effectiveHits / totalEffectiveHits)) : 0
                }))

            } catch (err) {
                console.error(err)
                this.error = 'Failed to generate report.'
            } finally {
                this.isLoading = false
            }
        },

        exportReportAsCSV() {
            if (!this.report.length) return;

            const headers = ['Player', 'War Hits', 'Outside Hits', 'Effective Hits', 'Payout ($)'];
            const rows = this.report.map(r =>
                [`"${r.name}"`, r.warHits, r.outsideHits, r.effectiveHits.toFixed(2), r.payout].join(',')
            );

            const csvContent = [headers.join(','), ...rows].join('\n');
            this.downloadFile('payroll_summary.csv', csvContent, 'text/csv');
        },

        exportReportAsText() {
            if (!this.report.length) return;

            const lines = this.report.map(r =>
                `${r.name}: ${r.warHits} war hits, ${r.outsideHits} outside hits, ${r.effectiveHits.toFixed(2)} effective hits, $${r.payout.toLocaleString()}`
            );

            const content = lines.join('\n');
            this.downloadFile('payroll_summary.txt', content, 'text/plain');
        },

        downloadFile(filename, content, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
}
