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
    })

    describe('canGenerateReport', () => {
        it('returns false if required fields missing', () => {
            model.profitInput = ''
            model.costsInput = ''
            expect(model.canGenerateReport()).toBe(false)
        })

        it('returns true if all fields valid', () => {
            model.profitInput = '1000'
            model.costsInput = '500'
            expect(model.canGenerateReport()).toBe(true)
        })

        it('returns false if factionTake is null', () => {
            model.profitInput = '1000'
            model.costsInput = '500'
            model.factionTake = null
            expect(model.canGenerateReport()).toBe(false)
        })

        it('returns false if outsideHitValue is null', () => {
            model.profitInput = '1000'
            model.costsInput = '500'
            model.outsideHitValue = null
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
    })

    describe('validateFactionTake', () => {
        it('marks invalid if out of range', () => {
            model.factionTake = 150
            model.validateFactionTake()
            expect(model.isFactionTakeInvalid).toBe(true)
        })

        it('marks valid if in range', () => {
            model.factionTake = 50
            model.validateFactionTake()
            expect(model.isFactionTakeInvalid).toBe(false)
        })
    })

    describe('validateOutsideHit', () => {
        it('marks invalid if out of range', () => {
            model.outsideHitValue = -10
            model.validateOutsideHit()
            expect(model.isOutsideHitInvalid).toBe(true)
        })

        it('marks valid if in range', () => {
            model.outsideHitValue = 75
            model.validateOutsideHit()
            expect(model.isOutsideHitInvalid).toBe(false)
        })
    })

    describe('formatCurrency', () => {
        it('formats numbers correctly', () => {
            expect(model.formatCurrency(1000)).toBe('$1,000')
            expect(model.formatCurrency(1234567)).toBe('$1,234,567')
        })
    })
})
