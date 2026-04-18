import { describe, it, expect, beforeEach, vi } from 'vitest'
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

    describe('wizard navigation', () => {
        beforeEach(() => {
            // Mock setTimeout for synchronous testing
            global.setTimeout = (fn) => fn()
        })

        it('navigates to index.html when at step 1', () => {
            m.step = 1
            const original = window.location.href
            delete window.location
            window.location = { href: '' }

            m.prevStep()

            expect(window.location.href).toBe('./index.html')
            window.location = { href: original }
        })

        it('preserves selectedWarId when navigating back from step 2 to step 1', () => {
            // Setup: simulate user has selected a war and moved to step 2
            m.selectedWarId = '12345'
            m.step = 2
            
            // When: user clicks back button
            m.prevStep()
            
            // Then: should be back on step 1 with war selection preserved
            expect(m.step).toBe(1)
            expect(m.selectedWarId).toBe('12345')
        })
        
        it('preserves selectedWarId when navigating back from step 3 to step 2', () => {
            // Setup: simulate user has progressed to step 3
            m.selectedWarId = '67890'
            m.step = 3
            
            // When: user clicks back button
            m.prevStep()
            
            // Then: should be back on step 2 with war selection preserved  
            expect(m.step).toBe(2)
            expect(m.selectedWarId).toBe('67890')
        })
        
        it('clamps step within valid range during navigation', () => {
            // Test stepping back from step 3 to 2
            m.step = 3
            m.prevStep()
            expect(m.step).toBe(2)
            
            // Test stepping back from step 2 to 1
            m.step = 2  
            m.prevStep()
            expect(m.step).toBe(1)
        })

        it('does not modify selectedWarId when stepping back to step 2', () => {
            // Setup: user at step 3 with a selected war
            m.selectedWarId = '99999'
            m.step = 3
            
            // When: user clicks back to step 2
            m.prevStep()
            
            // Then: selectedWarId should remain unchanged
            expect(m.step).toBe(2)
            expect(m.selectedWarId).toBe('99999')
        })

        it('triggers UI re-sync only when returning to step 1 with a selectedWarId', () => {
            // Test case: step 2 -> 1 with selectedWarId (should trigger re-sync)
            m.selectedWarId = '12345'
            m.step = 2
            
            // Track how many times setTimeout was called
            let setTimeoutCalled = false
            global.setTimeout = (fn) => {
                setTimeoutCalled = true
                fn()
            }
            
            m.prevStep()
            
            expect(m.step).toBe(1)
            expect(m.selectedWarId).toBe('12345')
            expect(setTimeoutCalled).toBe(true)
        })

        it('does not trigger UI re-sync when returning to step 1 without selectedWarId', () => {
            // Test case: step 2 -> 1 without selectedWarId (should not trigger re-sync)
            m.selectedWarId = ''
            m.step = 2
            
            let setTimeoutCalled = false
            global.setTimeout = (fn) => {
                setTimeoutCalled = true
                fn()
            }
            
            m.prevStep()
            
            expect(m.step).toBe(1)
            expect(setTimeoutCalled).toBe(false)
        })
    })

    describe('rounding and total conservation', () => {
        it('ensures total payout never exceeds profit minus costs due to rounding', () => {
            // Setup scenario that causes rounding to exceed pool
            m.profitInput = '100'
            m.xanaxInput = '0'
            m.auditLog = [
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'Outside Hit' }),
                row({ player: 'Alice', type: 'Outside Hit' }),
                row({ player: 'Bob', type: 'War Hit' }),
                row({ player: 'Bob', type: 'War Hit' }),
                row({ player: 'Bob', type: 'Outside Hit' }),
                row({ player: 'Charlie', type: 'War Hit' }),
                row({ player: 'Charlie', type: 'Outside Hit' })
            ]
            m.warHitTaxInput = 10  // 10%
            m.outsideHitTaxInput = 50  // 50%

            m.recomputeReportWithOverrides()

            const totalPlayerPayout = m.wizardReport.reduce((sum, p) => sum + p.payout, 0)
            const totalDistributed = totalPlayerPayout + m.totalTax
            const poolBeforeTax = 100 // profit - costs

            expect(totalDistributed).toBeLessThanOrEqual(poolBeforeTax)
            expect(totalDistributed).toBeCloseTo(poolBeforeTax, 0) // Should be very close to pool
        })

        it('adjusts faction tax when rounding causes overage', () => {
            // Setup specific scenario that causes +$1 rounding overage
            m.profitInput = '100'
            m.auditLog = [
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'Outside Hit' }),
                row({ player: 'Alice', type: 'Outside Hit' }),
                row({ player: 'Bob', type: 'War Hit' }),
                row({ player: 'Bob', type: 'War Hit' }),
                row({ player: 'Bob', type: 'Outside Hit' }),
                row({ player: 'Charlie', type: 'War Hit' }),
                row({ player: 'Charlie', type: 'Outside Hit' })
            ]
            m.warHitTaxInput = 10
            m.outsideHitTaxInput = 50

            m.recomputeReportWithOverrides()

            // Calculate what tax should be before rounding adjustment
            const basePerHit = 100 / 8 // 12.5
            const exactTax = (4 * basePerHit * 0.1) + (4 * basePerHit * 0.5) // 30
            
            // Verify that tax was reduced to compensate for rounding overage
            expect(m.totalTax).toBeLessThan(exactTax)
            expect(m.totalTax).toBeGreaterThanOrEqual(0)
        })

        it('handles zero or negative tax after rounding adjustment', () => {
            // Edge case: rounding overage exceeds available tax
            m.profitInput = '50'
            m.auditLog = [
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'War Hit' })
            ]
            m.warHitTaxInput = 1  // Very low tax
            m.outsideHitTaxInput = 1

            m.recomputeReportWithOverrides()

            expect(m.totalTax).toBeGreaterThanOrEqual(0)
            
            const totalPlayerPayout = m.wizardReport.reduce((sum, p) => sum + p.payout, 0)
            const totalDistributed = totalPlayerPayout + m.totalTax
            expect(totalDistributed).toBeLessThanOrEqual(50)
        })

        it('preserves exact calculation when no rounding adjustment needed', () => {
            // Scenario where rounding doesn't cause overage (whole numbers)
            m.profitInput = '120'
            m.auditLog = [
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Bob', type: 'War Hit' }),
                row({ player: 'Bob', type: 'War Hit' })
            ]
            m.warHitTaxInput = 10

            m.recomputeReportWithOverrides()

            // 4 hits, 120/4 = 30 per hit, 10% tax = 12 total tax
            expect(m.totalTax).toBeCloseTo(12, 5)
            
            const totalPlayerPayout = m.wizardReport.reduce((sum, p) => sum + p.payout, 0)
            expect(totalPlayerPayout).toBe(108) // 4 * 27 (30 * 0.9)
        })

        it('correctly rounds individual payouts to nearest dollar', () => {
            // Test that individual payouts are properly rounded
            m.profitInput = '100'
            m.auditLog = [
                row({ player: 'Alice', type: 'War Hit' }),
                row({ player: 'Alice', type: 'Outside Hit' }),
                row({ player: 'Alice', type: 'Outside Hit' }),
                row({ player: 'Bob', type: 'War Hit' }),
                row({ player: 'Bob', type: 'War Hit' }),
                row({ player: 'Bob', type: 'Outside Hit' })
            ]
            m.warHitTaxInput = 10
            m.outsideHitTaxInput = 50

            m.recomputeReportWithOverrides()

            // All payouts should be whole numbers
            m.wizardReport.forEach(player => {
                expect(player.payout).toEqual(Math.round(player.payout))
                expect(Number.isInteger(player.payout)).toBe(true)
            })
        })

        it('maintains total conservation with mixed hit types and taxes', () => {
            // Complex scenario with various players and hit types
            m.profitInput = '500'
            m.spiesInput = '50'
            m.auditLog = [
                row({ player: 'Alpha', type: 'War Hit' }),
                row({ player: 'Alpha', type: 'War Hit' }),
                row({ player: 'Alpha', type: 'Outside Hit' }),
                row({ player: 'Beta', type: 'Outside Hit' }),
                row({ player: 'Beta', type: 'Outside Hit' }),
                row({ player: 'Beta', type: 'Outside Hit' }),
                row({ player: 'Gamma', type: 'War Hit' }),
                row({ player: 'Delta', type: 'War Hit' }),
                row({ player: 'Delta', type: 'Outside Hit' })
            ]
            m.warHitTaxInput = 15
            m.outsideHitTaxInput = 40

            m.recomputeReportWithOverrides()

            const totalPlayerPayout = m.wizardReport.reduce((sum, p) => sum + p.payout, 0)
            const totalDistributed = totalPlayerPayout + m.totalTax
            const poolBeforeTax = 500 - 50 // profit - costs

            expect(totalDistributed).toBeLessThanOrEqual(poolBeforeTax)
            expect(Math.abs(totalDistributed - poolBeforeTax)).toBeLessThan(1) // Within $1
        })
    })

    describe('link copying', () => {
        beforeEach(() => {
            // Mock window.location and navigator.clipboard
            global.window = {
                location: {
                    href: 'https://example.com/rw_payroll.html?war=123&profit=1000&tw=10&to=50'
                }
            }
            
            global.navigator = {
                clipboard: {
                    writeText: vi.fn().mockResolvedValue()
                }
            }
            
            // Mock alert
            global.alert = vi.fn()
        })

        it('copies current URL when copyPayrollLink is called', async () => {
            await m.copyPayrollLink()
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/rw_payroll.html?war=123&profit=1000&tw=10&to=50')
            expect(alert).toHaveBeenCalledWith('Payroll link copied to clipboard! Share this link to let others view the same configuration and results.')
        })

        it('works with different URL configurations', async () => {
            window.location.href = 'https://example.com/rw_payroll.html?war=456&profit=2000&cx=100&cs=200&ov=abc123'
            
            await m.copyPayrollLink()
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/rw_payroll.html?war=456&profit=2000&cx=100&cs=200&ov=abc123')
        })
    })
})
