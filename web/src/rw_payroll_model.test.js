import { describe, it, expect, beforeEach } from 'vitest'
import { payrollModel } from './rw_payroll_model.js'

// Helpers to make audit rows concise
function row({
                 player,
                 type = 'War Hit',
                 counted = true,
                 isAttackerFacMember = true,
                 opponent = 'Opp',
                 result = 'Won',
                 timestamp = 1,
             } = {}) {
    return { player, type, counted, isAttackerFacMember, opponent, result, timestamp }
}

describe('payrollModel (new)', () => {
    let m

    beforeEach(() => {
        m = payrollModel()
        // Avoid any init side-effects in tests; we won’t call init().
        m.selectedWarId = 123

        // Default money inputs
        m.profitInput = ''
        m.xanaxInput = ''
        m.spiesInput = ''
        m.medicalInput = ''
        m.otherInput = ''

        // Default tax settings
        m.warHitTaxInput = 10 // 10%
        m.outsideHitTaxInput = 50 // 50%
    })

    describe('money formatting', () => {
        it('formatCurrency rounds and formats with thousands', () => {
            expect(m.formatCurrency(0)).toBe('$0')
            expect(m.formatCurrency(9.49)).toBe('$9')
            expect(m.formatCurrency(9.5)).toBe('$10')
            expect(m.formatCurrency(1234567.4)).toBe('$1,234,567')
            expect(m.formatCurrency('$1,234,567.8')).toBe('$1,234,568')
        })
    })

    describe('cost & validation inputs', () => {
        it('computes totalCosts from the four cost inputs', () => {
            m.xanaxInput = '100'
            m.spiesInput = '$200'
            m.medicalInput = '300.50'
            m.otherInput = '400'
            expect(m.totalCosts).toBeCloseTo(100 + 200 + 300.5 + 400, 5)
        })

        it('validates profit and cost inputs (no negatives allowed)', () => {
            m.profitInput = '-1'
            expect(m.isProfitInvalid).toBe(true)
            m.profitInput = '0'
            expect(m.isProfitInvalid).toBe(false)

            m.xanaxInput = '0'
            m.spiesInput = '0'
            m.medicalInput = '0'
            m.otherInput = '0'
            expect(m.isCostsInvalid).toBe(false)

            m.otherInput = '-5'
            expect(m.isCostsInvalid).toBe(true)
        })

        it('validates tax percentages to be within [0, 100]', () => {
            m.warHitTaxInput = -1
            m.outsideHitTaxInput = 101
            expect(m.isWarHitTaxInvalid).toBe(true)
            expect(m.isOutsideHitTaxInvalid).toBe(true)

            m.warHitTaxInput = 0
            m.outsideHitTaxInput = 100
            expect(m.isWarHitTaxInvalid).toBe(false)
            expect(m.isOutsideHitTaxInvalid).toBe(false)
        })
    })

    describe('recomputeReportWithOverrides()', () => {
        it('splits war vs outside by type and applies taxes and costs correctly', () => {
            m.profitInput = '1000'
            m.xanaxInput = '100'
            m.auditLog = [
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'Outside Hit' }),
                row({ player: 'Alice', type: 'outside retaliation' }),
                row({ player: 'Bob',   type: 'War Hit' }),
                row({ player: 'Eve', type: 'War Hit', isAttackerFacMember: false }),
                row({ player: 'Mallory', type: 'Outside Hit', counted: false }),
            ]

            m.recomputeReportWithOverrides()

            expect(m.payPerWarHit).toBeCloseTo(135, 5)
            expect(m.payPerOutsideHit).toBeCloseTo(75, 5)
            expect(m.totalTax).toBeCloseTo(210, 5)

            const alice = m.wizardReport.find(r => r.name === 'Alice')
            const bob   = m.wizardReport.find(r => r.name === 'Bob')
            expect(alice.warHits).toBe(3)
            expect(alice.outsideHits).toBe(2)
            expect(alice.payout).toBeCloseTo(555, 5)
            expect(bob.warHits).toBe(1)
            expect(bob.outsideHits).toBe(0)
            expect(bob.payout).toBeCloseTo(135, 5)

            expect(m.wizardReport[0].payout).toBeGreaterThanOrEqual(m.wizardReport[1].payout)
        })

        it('clamps tax percentages within [0,1]', () => {
            m.profitInput = '200'
            m.auditLog = [
                row({ player: 'A', type: 'War Hit' }),
                row({ player: 'A', type: 'outside' }),
                row({ player: 'B', type: 'OUTSIDE' }),
                row({ player: 'B', type: 'war' }),
            ]
            m.warHitTaxInput = -50
            m.outsideHitTaxInput = 250
            m.recomputeReportWithOverrides()

            expect(m.payPerWarHit).toBeCloseTo(50, 5)
            expect(m.payPerOutsideHit).toBeCloseTo(0, 5)
            expect(m.totalTax).toBeCloseTo(100, 5)

            const A = m.wizardReport.find(r => r.name === 'A')
            const B = m.wizardReport.find(r => r.name === 'B')
            expect(A.payout).toBeCloseTo(50, 5)
            expect(B.payout).toBeCloseTo(50, 5)
        })

        it('produces zero payouts when there are zero counted faction hits', () => {
            m.profitInput = '500'
            m.auditLog = [
                row({ player: 'Zoe', type: 'War Hit', counted: false }),
                row({ player: 'Una', type: 'Outside', isAttackerFacMember: false }),
            ]
            m.recomputeReportWithOverrides()
            expect(m.payPerWarHit).toBe(0)
            expect(m.payPerOutsideHit).toBe(0)
            expect(m.totalTax).toBe(0)
            expect(m.wizardReport).toEqual([])
        })

        it('respects manual overrides when present', () => {
            m.profitInput = '300'
            m.auditLog = [
                row({ player: 'Kim', type: 'War Hit', counted: true, timestamp: 1 }),
                row({ player: 'Kim', type: 'Outside Hit', counted: false, timestamp: 2 }),
            ]
            const k1 = m.rowKey(m.auditLog[0], 0)
            const k2 = m.rowKey(m.auditLog[1], 1)
            m.overrides = { [k1]: false, [k2]: true }

            m.recomputeReportWithOverrides()

            const kim = m.wizardReport.find(r => r.name === 'Kim')
            expect(kim.warHits).toBe(0)
            expect(kim.outsideHits).toBe(1)
            expect(kim.payout).toBeCloseTo(150, 5)
        })
    })
})
