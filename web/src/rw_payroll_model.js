import { newTornApiClient, collectRankedWarHitsFromData } from './torn_api.js'

// Shaggy Hi-Fidelity faction id (used by the hit collector)
const FACTION_ID = 49297

// --- utils ---

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const toNumber = (v) => {
    if (typeof v === 'number') return isFinite(v) ? v : 0
    if (v == null) return 0
    const s = String(v).trim().replace(/^\$/, '').replace(/,/g, '')
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
}

const fmtMoney = (n) => {
    const num = Math.round(typeof n === 'number' ? n : toNumber(n))
    return `$${num.toLocaleString()}`
}

const hash32 = (s) => { let h=5381; for (let i=0;i<s.length;i++) h=((h<<5)+h)^s.charCodeAt(i); return h>>>0 }

const b64url = {
    enc: (str) => btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
    dec: (str) => { const pad = str.length%4===2?'==':str.length%4===3?'=':''; return atob(str.replace(/-/g,'+').replace(/_/g,'/')+pad) }
}

export function payrollModel () {
    return {
        // --- core state ---
        apiKey: null,
        apiKeyInput: '',
        apiClient: null,

        rankedWars: [],
        selectedWarId: '',

        // time overrides (epoch seconds, TCT)
        startOverrideEpoch: null,
        endOverrideEpoch: null,

        isLoadingWarList: false,
        isLoadingWarReport: false,
        error: '',
        initialQueryParams: new URLSearchParams(window.location.search),

        // --- wizard nav ---

        step: 1,

        nextStep () {
            if (this.step === 1) {
                this.generateAudit().then(() => { this.step = 2 }).catch(e => { this.error = e?.message || String(e) })
            } else if (this.step === 2) {
                this.recomputeReportWithOverrides()
                this.step = 3
            }
        },

        prevStep () {
            if (this.step === 1) {
                window.location.href = './index.html';
            } else {
                this.step = clamp(this.step - 1, 1, 3)
                // Ensure selectedWarId is preserved when returning to step 1
                if (this.step === 1 && this.selectedWarId) {
                    // Force UI re-sync by briefly clearing and restoring the selection
                    const currentWarId = this.selectedWarId
                    this.selectedWarId = ''
                    // Use setTimeout to ensure DOM updates
                    setTimeout(() => {
                        this.selectedWarId = currentWarId
                    }, 0)
                }
            }
        },

        canProceed () {
            if (this.step === 1) {
                return !!this.selectedWarId &&
                    !this.isProfitInvalid &&
                    !this.isCostsInvalid &&
                    !this.isWarHitTaxInvalid &&
                    !this.isOutsideHitTaxInvalid &&
                    !this.isLoadingWarReport &&
                    !this.isLoadingWarList
            }
            if (this.step === 2) return true
            return false
        },

        // --- inputs ---
        profitInput: '',
        xanaxInput: '',
        spiesInput: '',
        medicalInput: '',
        otherInput: '',
        get totalCosts () { return toNumber(this.xanaxInput) + toNumber(this.spiesInput) + toNumber(this.medicalInput) + toNumber(this.otherInput) },
        get isProfitInvalid () { const n = toNumber(this.profitInput); return !isFinite(n) || n < 0 },
        get isCostsInvalid () { return [this.xanaxInput,this.spiesInput,this.medicalInput,this.otherInput].some(v => toNumber(v) < 0) },

        warHitTaxInput: 10,
        outsideHitTaxInput: 50,
        get isWarHitTaxInvalid () { const v = toNumber(this.warHitTaxInput); return v < 0 || v > 100 },
        get isOutsideHitTaxInvalid () { const v = toNumber(this.outsideHitTaxInput); return v < 0 || v > 100 },

        // --- audit & overrides (step 2) ---

        auditLog: [],
        showNonFacHitsInAudit: false,
        overrides: {}, // Map<rowKey, true|false>

        setOverride (key, checked) { this.overrides[key] = !!checked; this.updateQueryParams() },

        clearOverride (key) { delete this.overrides[key]; this.updateQueryParams() },

        clearAllOverrides () { this.overrides = {}; this.updateQueryParams() },

        rowKey (row, i) { return hash32([row.player??'',row.type??'',row.opponent??'',row.result??'',row.timestamp??'',i].join('|')).toString(36) },

        rowClasses (row, i) {
            const key = this.rowKey(row, i)
            const checked = !!(this.overrides[key] ?? row.counted)   // checkbox state
            const algo = !!row.counted                               // algorithm selection

            // Rules:
            // - algo && checked  -> green
            // - algo && !checked -> yellow
            // - !algo && checked -> yellow
            // - else             -> default
            if (algo && checked) return 'bg-successBg text-successText'
            if ((algo && !checked) || (!algo && checked)) return 'bg-warningBg text-warningText'
            return '' // default styling
        },

        encodeOverrides () {
            const entries = Object.entries(this.overrides).filter(([,v]) => v === true || v === false)
            return entries.length ? b64url.enc(JSON.stringify(entries)) : ''
        },

        decodeOverrides (ov) {
            try { const entries = JSON.parse(b64url.dec(ov)); const o={}; for (const [k,v] of entries) o[k]=!!v; this.overrides=o } catch {}
        },

        // --- final report (step 3) ---

        wizardReport: [],
        totalTax: 0,
        payPerWarHit: 0,
        payPerOutsideHit: 0,

        recomputeReportWithOverrides () {
            const audit = (this.auditLog || []).map((row,i)=>({
                ...row,
                countedEffective: (this.overrides[this.rowKey(row,i)] ?? row.counted) ? true : false
            }))
            const counts = new Map()
            let totalWar=0, totalOut=0
            for (const r of audit) {
                if (!r.countedEffective) continue
                if (!r.isAttackerFacMember) continue
                const type = (r.type || '').toLowerCase().includes('outside') ? 'outside' : 'war'
                const key = r.player
                if (!counts.has(key)) counts.set(key, { name:r.player, war:0, outside:0 })
                counts.get(key)[type]++
                if (type==='war') totalWar++; else totalOut++
            }
            const profit = toNumber(this.profitInput)
            const poolBeforeTax = Math.max(0, profit - this.totalCosts)
            const totalHits = totalWar + totalOut
            if (!totalHits) {
                this.wizardReport = Array.from(counts.values()).map(c=>({ id:c.name, name:c.name, warHits:c.war, outsideHits:c.outside, payout:0 }))
                this.payPerWarHit = 0; this.payPerOutsideHit = 0; this.totalTax = 0
                return
            }
            const basePerHit = poolBeforeTax / totalHits
            const warTax = Math.min(1, Math.max(0, toNumber(this.warHitTaxInput)/100))
            const outTax = Math.min(1, Math.max(0, toNumber(this.outsideHitTaxInput)/100))
            this.payPerWarHit = basePerHit * (1 - warTax)
            this.payPerOutsideHit = basePerHit * (1 - outTax)
            this.totalTax = (totalWar * basePerHit * warTax) + (totalOut * basePerHit * outTax)
            
            // First pass: calculate exact payouts
            const wizardReportExact = Array.from(counts.values())
                .map(c=>({ id:c.name, name:c.name, warHits:c.war, outsideHits:c.outside, payout: (c.war*this.payPerWarHit)+(c.outside*this.payPerOutsideHit) }))
                .sort((a,b)=>b.payout - a.payout)
            
            // Second pass: round individual payouts and adjust tax to maintain total
            const totalExactPayout = wizardReportExact.reduce((sum, p) => sum + p.payout, 0)
            const totalRoundedPayout = wizardReportExact.reduce((sum, p) => sum + Math.round(p.payout), 0)
            const roundingAdjustment = totalRoundedPayout - totalExactPayout
            
            // Apply rounding and adjust tax to ensure total never exceeds profit-costs
            this.wizardReport = wizardReportExact.map(p => ({ ...p, payout: Math.round(p.payout) }))
            this.totalTax = Math.max(0, this.totalTax - roundingAdjustment)
        },

        // --- exports ---

        formatCurrency (value) { return fmtMoney(value) },

        fmtMoney,
        exportWizardCSV () {
            const rows = [['Player','War Hits','Outside Hits','Payout ($)']]
            for (const r of this.wizardReport) rows.push([r.name, r.warHits, r.outsideHits, Math.round(r.payout)])
            const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href=url; a.download='rw_payroll.csv'
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        },

        exportWizardText () {
            const lines = this.wizardReport.map(r => `${r.name}: ${r.warHits} war, ${r.outsideHits} outside — ${fmtMoney(Math.round(r.payout))}`)
            const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href=url; a.download='rw_payroll.txt'
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        },

        // --- fetching & processing ---

        async fetchRankedWars () {
            this.isLoadingWarList = true; this.error = ''
            try {
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
                console.error(err); this.error = 'Failed to fetch ranked wars.'
            } finally {
                this.isLoadingWarList = false
            }
        },

        findRankedWar (id) {
            return this.rankedWars.find(w => `${w.id}` === `${id}`)
        },

        async generateAudit () {
            this.isLoadingWarReport = true; this.error = ''
            try {
                const rankedWar = this.findRankedWar(this.selectedWarId)
                let { start, end } = rankedWar || {}
                if (this.startOverrideEpoch) start = this.startOverrideEpoch
                if (this.endOverrideEpoch) end = this.endOverrideEpoch
                if (!start || !end) { this.error = 'Invalid war time range selected.'; return }

                const attacks = await this.apiClient.fetchAttacksInWindow(start, end)
                const { participants, auditLog } = collectRankedWarHitsFromData(rankedWar, attacks, FACTION_ID)

                this.auditLog = auditLog.map(e => ({
                    ...e,
                    timestamp: new Date(e.timestamp * 1000).toISOString().replace('T',' ').replace('Z','')
                }))
                if (!this.showNonFacHitsInAudit) {
                    this.auditLog = this.auditLog.filter(e => e.isAttackerFacMember)
                }

                // hydrate overrides from URL if present
                const params = new URLSearchParams(location.search)
                const ov = params.get('ov'); if (ov) this.decodeOverrides(ov)

            } catch (err) {
                console.error(err); this.error = 'Failed to generate audit.'
            } finally {
                this.isLoadingWarReport = false
            }
        },

        // --- query param sync & lifecycle ---

        updateQueryParams () {
            const params = new URLSearchParams(location.search)
            const setIf = (k, v) => (v !== undefined && v !== null && v !== '' ? params.set(k, v) : params.delete(k))
            setIf('war', this.selectedWarId)
            setIf('start', this.startOverrideEpoch)
            setIf('end', this.endOverrideEpoch)
            setIf('profit', toNumber(this.profitInput) || '')
            // breakdown costs
            const setNum = (k,v) => (toNumber(v) ? params.set(k, toNumber(v)) : params.delete(k))
            setNum('cx', this.xanaxInput); setNum('cs', this.spiesInput); setNum('cm', this.medicalInput); setNum('co', this.otherInput)
            // taxes
            setIf('tw', toNumber(this.warHitTaxInput) || '')
            setIf('to', toNumber(this.outsideHitTaxInput) || '')
            // overrides
            const ov = this.encodeOverrides(); if (ov) params.set('ov', ov); else params.delete('ov')

            const qs = params.toString()
            const newUrl = qs ? `${location.pathname}?${qs}` : location.pathname
            if (newUrl !== location.href) history.replaceState(null, '', newUrl)
        },

        applyInitialQueryParams () {
            const p = this.initialQueryParams
            if (p.has('war')) this.selectedWarId = String(p.get('war'))
            if (p.has('start')) this.startOverrideEpoch = Number(p.get('start'))
            if (p.has('end')) this.endOverrideEpoch = Number(p.get('end'))
            if (p.has('profit')) this.profitInput = p.get('profit')
            if (p.has('cx')) this.xanaxInput = p.get('cx')
            if (p.has('cs')) this.spiesInput = p.get('cs')
            if (p.has('cm')) this.medicalInput = p.get('cm')
            if (p.has('co')) this.otherInput = p.get('co')
            if (p.has('tw')) this.warHitTaxInput = Number(p.get('tw'))
            if (p.has('to')) this.outsideHitTaxInput = Number(p.get('to'))
            const ov = p.get('ov'); if (ov) this.decodeOverrides(ov)
        },

        // init & api key
        saveApiKey () {
            if (!this.apiKeyInput) return
            localStorage.setItem('tornApiKey', this.apiKeyInput)
            this.apiKey = this.apiKeyInput
            this.apiKeyInput = ''
            this.setupApiClient()
            this.fetchRankedWars().then(() => this.applyInitialQueryParams())
        },

        setupApiClient () {
            this.apiClient = newTornApiClient(this.apiKey, fetch, 'https://api.torn.com/v2')
        },

        onSelectedWarChange (newId) {
            if (newId === '' || newId == null) return
            const id = Number(newId)
            if (!isNaN(id)) {
                const war = this.rankedWars.find(w => w.id === id)
                if (war) {
                    this.startOverrideEpoch = war.start
                    this.endOverrideEpoch = war.end
                } else {
                    this.startOverrideEpoch = null
                    this.endOverrideEpoch = null
                }
            } else {
                this.startOverrideEpoch = null
                this.endOverrideEpoch = null
            }
        },

        init () {
            this.apiKey = localStorage.getItem('tornApiKey')
            if (this.apiKey) {
                this.setupApiClient()
                this.fetchRankedWars().then(() => this.applyInitialQueryParams())
            }
            this.$watch('selectedWarId', (newId) => { this.onSelectedWarChange(newId) })
        },
    }
}
