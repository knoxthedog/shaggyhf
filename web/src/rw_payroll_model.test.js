import { describe, it, expect, beforeEach } from 'vitest'
import { payrollModel } from './rw_payroll_model.js'

describe('payrollModel', () => {
    let model

    beforeEach(() => {
        model = payrollModel()
        model.selectedWarId = 1
        model.factionTake = 25
        model.outsideHitValue = 50
    })

    describe('parseNumber', () => {
        it('parses plain numbers', () => {
            expect(model.parseNumber('123')).toBe(123)
        })

        it('parses numbers with commas', () => {
            expect(model.parseNumber('1,234')).toBe(1234)
        })

        it('parses numbers with leading $', () => {
            expect(model.parseNumber('$567.89')).toBeCloseTo(567.89)
        })

        it('returns null for invalid input', () => {
            expect(model.parseNumber('not a number')).toBeNull()
        })

        it('returns null for empty input', () => {
            expect(model.parseNumber('')).toBeNull()
        })

        it('returns null for whitespace input', () => {
            expect(model.parseNumber('   ')).toBeNull()
        })

        it('returns the value when given a number', () => {
            expect(model.parseNumber(1000)).toBe(1000)
        })
    })

    describe('canGenerateReport', () => {
        beforeEach(() => {
            model.profitInput = '1000'
            model.costsInput = '500'
            model.warHitTaxInput = '10'
            model.outsideHitTaxInput = '50'
            model.startOverrideEpoch = 1700000000
            model.endOverrideEpoch = 1700003600
        })

        it('returns true if all fields valid', () => {
            expect(model.canGenerateReport()).toBe(true)
        })

        it('returns false if any required field is missing', () => {
            model.selectedWarId = null
            expect(model.canGenerateReport()).toBe(false)

            model.selectedWarId = 1
            model.profitInput = ''
            expect(model.canGenerateReport()).toBe(false)

            model.profitInput = '1000'
            model.costsInput = ''
            expect(model.canGenerateReport()).toBe(false)

            model.costsInput = '500'
            model.warHitTaxInput = ''
            expect(model.canGenerateReport()).toBe(false)

            model.warHitTaxInput = '10'
            model.outsideHitTaxInput = ''
            expect(model.canGenerateReport()).toBe(false)

            model.startOverrideEpoch = null
            expect(model.canGenerateReport()).toBe(false)

            model.endOverrideEpoch = null
            expect(model.canGenerateReport()).toBe(false)
        })

        it('returns false if a numeric value is non-numeric', () => {
            model.profitInput = 'abc'
            expect(model.canGenerateReport()).toBe(false)

            model.profitInput = '1000'
            model.costsInput = 'xyz'
            expect(model.canGenerateReport()).toBe(false)

            model.costsInput = '500'
            model.warHitTaxInput = 'invalid'
            expect(model.canGenerateReport()).toBe(false)

            model.warHitTaxInput = '10'
            model.outsideHitTaxInput = 'not a number'
            expect(model.canGenerateReport()).toBe(false)
        })
    })

    describe('validateProfit', () => {
        it('marks invalid if input is not a number', () => {
            model.profitInput = 'abc'
            model.validateProfit()
            expect(model.isProfitInvalid).toBe(true)
        })

        it('marks valid if input is numeric', () => {
            model.profitInput = '1,000'
            model.validateProfit()
            expect(model.isProfitInvalid).toBe(false)
        })

        it('marks invalid if number is < 0', () => {
            model.profitInput = '-1'
            model.validateProfit()
            expect(model.isProfitInvalid).toBe(true)
        })
    })

    describe('validateCosts', () => {
        it('marks invalid if input is not a number', () => {
            model.costsInput = 'bad'
            model.validateCosts()
            expect(model.isCostsInvalid).toBe(true)
        })

        it('marks valid if input is numeric', () => {
            model.costsInput = '$500'
            model.validateCosts()
            expect(model.isCostsInvalid).toBe(false)
        })

        it('marks invalid if number is < 0', () => {
            model.costsInput = '-1'
            model.validateCosts()
            expect(model.isCostsInvalid).toBe(true)
        })
    })

    describe('validateWarHitTax', () => {
        it('marks invalid if out of range', () => {
            model.warHitTaxInput = '150'
            model.validateWarHitTax()
            expect(model.isWarHitTaxInvalid).toBe(true)
        })

        it('marks valid if in range', () => {
            model.warHitTaxInput = '50'
            model.validateWarHitTax()
            expect(model.isWarHitTaxInvalid).toBe(false)
        })

        it('marks invalid if less than 0', () => {
            model.warHitTaxInput = '-1'
            model.validateWarHitTax()
            expect(model.isWarHitTaxInvalid).toBe(true)
        })
    })

    describe('validateOutsideHitTax', () => {
        it('marks invalid if out of range', () => {
            model.outsideHitTaxInput = '101'
            model.validateOutsideHitTax()
            expect(model.isOutsideHitTaxInvalid).toBe(true)
        })

        it('marks valid if in range', () => {
            model.outsideHitTaxInput = '75'
            model.validateOutsideHitTax()
            expect(model.isOutsideHitTaxInvalid).toBe(false)
        })

        it('marks invalid if less than 0', () => {
            model.outsideHitTaxInput = '-1'
            model.validateOutsideHitTax()
            expect(model.isOutsideHitTaxInvalid).toBe(true)
        })
    })

    describe('formatCurrency', () => {
        it('formats numbers correctly', () => {
            expect(model.formatCurrency(1000)).toBe('$1,000')
            expect(model.formatCurrency(1234567)).toBe('$1,234,567')
        })
    })
})

describe('payrollModel', () => {
    let model

    beforeEach(() => {
        model = payrollModel()
    })

    describe('generateReportFromHitsData', () => {
        it('generates correct payouts from simple hitsByPlayer data', () => {
            model.profitInput = '1000'
            model.costsInput = '200'
            model.warHitTaxInput = '10'
            model.outsideHitTaxInput = '20'

            const hitsByPlayer = [
                {
                    id: 1,
                    name: 'Alice',
                    warHits: [ {}, {}, {} ], // 3 war hits
                    outsideHits: [ {}, {} ]  // 2 outside hits
                },
                {
                    id: 2,
                    name: 'Bob',
                    warHits: [ {} ],         // 1 war hit
                    outsideHits: []          // 0 outside hits
                }
            ]

            model.generateReportFromHitsData(hitsByPlayer)

            const netProfit = 1000 - 200 // 800
            const totalHits = 6
            const totalWarHits = 4
            const totalOutsideHits = 2

            const warHitsPoolGross = (4 / 6) * netProfit
            const warHitsPool = warHitsPoolGross * 0.9
            const payPerWarHit = warHitsPool / totalWarHits

            const outsideHitsPoolGross = (2 / 6) * netProfit
            const outsideHitsPool = outsideHitsPoolGross * 0.8
            const payPerOutsideHit = outsideHitsPool / totalOutsideHits

            expect(model.payPerWarHit).toBeCloseTo(payPerWarHit, 5)
            expect(model.payPerOutsideHit).toBeCloseTo(payPerOutsideHit, 5)
            expect(model.report).toHaveLength(2)

            const aliceReport = model.report.find(r => r.id === 1)
            const bobReport = model.report.find(r => r.id === 2)

            expect(aliceReport.payout).toEqual(
                Math.round(payPerWarHit * 3 + payPerOutsideHit * 2)
                )
            expect(bobReport.payout).toEqual(
                Math.round(payPerWarHit)
            )
        })
    })
})