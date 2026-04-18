import { describe, it, expect, beforeEach } from 'vitest'
import { mountWizardFooter } from './wizard_nav.js'

describe('mountWizardFooter', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
    })

    it('appends a fixed-position footer to document.body', () => {
        mountWizardFooter(3)
        const footer = document.body.lastElementChild
        expect(footer).toBeTruthy()
        expect(footer.className).toContain('fixed')
        expect(footer.className).toContain('bottom-0')
    })

    it('footer contains a Back button with prevStep directive', () => {
        mountWizardFooter(3)
        const backBtn = document.body.querySelector('button[\\@click="prevStep()"]')
        expect(backBtn).toBeTruthy()
        expect(backBtn.textContent).toContain('Back')
    })

    it('footer contains a Next button with nextStep directive', () => {
        mountWizardFooter(3)
        const nextBtn = document.body.querySelector('button[\\@click="nextStep()"]')
        expect(nextBtn).toBeTruthy()
        expect(nextBtn.textContent).toContain('Next')
    })

    it('footer contains step indicator dots via x-for', () => {
        mountWizardFooter(3)
        const template = document.body.querySelector('template[x-for="n in 3"]')
        expect(template).toBeTruthy()
    })

    it('Next button has disabled binding for step 3', () => {
        mountWizardFooter(3)
        const nextBtn = document.body.querySelector('button[\\@click="nextStep()"]')
        expect(nextBtn.getAttribute(':disabled')).toBe('!canProceed() || step === 3')
    })

    it('accepts custom step count', () => {
        mountWizardFooter(2)
        const template = document.body.querySelector('template[x-for="n in 2"]')
        expect(template).toBeTruthy()
        const nextBtn = document.body.querySelector('button[\\@click="nextStep()"]')
        expect(nextBtn.getAttribute(':disabled')).toBe('!canProceed() || step === 2')
    })
})
