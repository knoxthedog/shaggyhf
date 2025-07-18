import {newTornApiClient, collectRankedWarHitsFromData} from './torn_api.js'

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

        // Inputs (TODO persist these in localStorage)
        warHitTaxInput: '',
        outsideHitTaxInput: '',
        profitInput: '',
        costsInput: '',
        startOverrideEpoch: null,
        endOverrideEpoch: null,

        // Input validation flags
        isProfitInvalid: false,
        isCostsInvalid: false,
        isWarHitTaxInvalid: false,
        isOutsideHitTaxInvalid: false,

        // Report output
        report: [],
        auditLog: [],
        totalTax: 0,
        payPerWarHit: 0,
        payPerOutsideHit: 0,

        init() {
            this.apiKey = localStorage.getItem('tornApiKey')
            if (this.apiKey) {
                this.setupApiClient()
                this.fetchRankedWars()
            }
            this.$watch('selectedWarId', (newId) => {
                this.onSelectedWarChange(newId);
            });
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

        onSelectedWarChange(newId) {
            const id = Number(newId);
            if (!isNaN(id)) {
                const war = this.rankedWars.find(w => w.id === id);
                if (war) {
                    this.startOverrideEpoch = war.start;
                    this.endOverrideEpoch = war.end;
                } else {
                    this.startOverrideEpoch = null;
                    this.endOverrideEpoch = null;
                }
            } else {
                this.startOverrideEpoch = null;
                this.endOverrideEpoch = null;
            }
        },

        setStartOverride(epoch) {
            this.startOverrideEpoch = epoch;
        },

        setEndOverride(epoch) {
            this.endOverrideEpoch = epoch;
        },

        canGenerateReport() {
            const profit = this.parseNumber(this.profitInput);
            const costs = this.parseNumber(this.costsInput);
            const warHitTax = this.parseNumber(this.warHitTaxInput);
            const outsideHitTax = this.parseNumber(this.outsideHitTaxInput);
            return (
                this.selectedWarId &&
                profit != null &&
                costs != null &&
                warHitTax != null &&
                outsideHitTax != null
            );
        },

        parseNumber(value) {
            if (typeof value === 'number' && !isNaN(value)) {
                return value;
            }
            if (!value || typeof value !== 'string') {
                return null;
            }
            const cleaned = value.trim().replace(/^\$/, '').replace(/,/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        },

        formatCurrency(value) {
            return `$${Math.round(value).toLocaleString()}`;
        },

        validateProfit() {
            const profit = this.parseNumber(this.profitInput);
            this.isProfitInvalid = profit == null || profit < 0;
        },

        validateCosts() {
            const costs = this.parseNumber(this.costsInput);
            this.isCostsInvalid = costs == null || costs < 0;
        },

        validateWarHitTax() {
            const val = this.parseNumber(this.warHitTaxInput);
            this.isWarHitTaxInvalid = val == null || val < 0 || val > 100;
        },

        validateOutsideHitTax() {
            const val = this.parseNumber(this.outsideHitTaxInput);
            this.isOutsideHitTaxInvalid = val == null || val < 0 || val > 100;
        },

        async generateReport() {
            this.isLoading = true
            this.error = ''
            this.report = []

            try {
                const rankedWar = this.rankedWars.find(w => `${w.id}` === this.selectedWarId)

                let {start, end} = rankedWar;
                if (this.startOverrideEpoch) {
                    start = this.startOverrideEpoch;
                }
                if (this.endOverrideEpoch) {
                    end = this.endOverrideEpoch;
                }
                if (!start || !end) {
                    this.error = 'Invalid war time range selected.';
                    return;
                }

                const attacks = await this.apiClient.fetchAttacksInWindow(start, end);
                const {participants, auditLog} = collectRankedWarHitsFromData(rankedWar, attacks, FACTION_ID);

                this.auditLog = auditLog.map(e => ({
                    ...e,
                    timestamp: new Date(e.timestamp * 1000).toISOString().replace('T', ' ').replace('Z', '')
                }));

                if (!this.showNonFacHitsInAudit) {
                    this.auditLog = this.auditLog.filter(e => e.isAttackerFacMember);
                }

                this.generateReportFromHitsData(participants);

            } catch (err) {
                console.error(err)
                this.error = 'Failed to generate report.'
            } finally {
                this.isLoading = false
            }
        },

        generateReportFromHitsData(hitsByPlayer) {
            this.error = ''
            this.report = []

            const profit = this.parseNumber(this.profitInput);
            const costs = this.parseNumber(this.costsInput);
            const warHitTax = this.parseNumber(this.warHitTaxInput);
            const outsideHitTax = this.parseNumber(this.outsideHitTaxInput);

            if (profit == null || costs == null || warHitTax == null || outsideHitTax == null) {
                this.error = 'Invalid input values';
                this.isLoading = false;
                return;
            }

            let totalWarHits = 0;
            let totalOutsideHits = 0;

            hitsByPlayer.forEach(p => {
                totalWarHits += p.warHits?.length || 0;
                totalOutsideHits += p.outsideHits?.length || 0;
            })

            const netProfit = profit - costs;
            const totalHits = totalWarHits + totalOutsideHits;

            const warHitsPoolGross = totalHits >= 1 ? (totalWarHits / totalHits * netProfit) : 0;
            const warHitsPool = warHitsPoolGross * (1 - (warHitTax / 100));

            const outsideHitsPoolGross = totalHits >= 1 ? (totalOutsideHits / totalHits * netProfit) : 0;
            const outsideHitsPool = outsideHitsPoolGross * (1 - (outsideHitTax / 100));

            // Store summary stats in model:
            this.totalTax = (warHitsPool * (warHitTax / 100)) + (outsideHitsPool * (outsideHitTax / 100));
            this.payPerOutsideHit = totalOutsideHits > 0 ? (outsideHitsPool / totalOutsideHits) : 0;
            this.payPerWarHit = totalWarHits > 0 ? (warHitsPool / totalWarHits) : 0;

            // Apportion payouts
            this.report = hitsByPlayer.map(p => {
                let warHits = p.warHits?.length || 0;
                let outsideHits = p.outsideHits?.length || 0;
                return {
                    id: p.id,
                    name: p.name,
                    warHits,
                    outsideHits,
                    payout: Math.round((warHits * this.payPerWarHit) + (outsideHits * this.payPerOutsideHit)),
                }
            })
        },

        exportReportAsCSV() {
            if (!this.report.length) return;

            const headers = ['Player', 'War Hits', 'Outside Hits', 'Payout ($)'];
            const rows = this.report.map(r =>
                [`"${r.name}"`, r.warHits, r.outsideHits, r.payout].join(',')
            );

            const csvContent = [headers.join(','), ...rows].join('\n');
            this.downloadFile('payroll_summary.csv', csvContent, 'text/csv');
        },

        exportReportAsText() {
            if (!this.report.length) return;

            const lines = this.report.map(r =>
                `${r.name}: ${r.warHits} war hits, ${r.outsideHits} outside hits, $${r.payout.toLocaleString()}`
            );

            const content = lines.join('\n');
            this.downloadFile('payroll_summary.txt', content, 'text/plain');
        },

        downloadFile(filename, content, mimeType) {
            const blob = new Blob([content], {type: mimeType});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
}
