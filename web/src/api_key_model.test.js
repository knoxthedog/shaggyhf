import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiKeyModel } from './api_key_model.js'

describe('apiKeyModel', () => {
    let m

    beforeEach(() => {
        localStorage.clear()
        m = apiKeyModel()
    })

    describe('init()', () => {
        it('populates apiKeyInput from localStorage when key exists', () => {
            localStorage.setItem('tornApiKey', 'abc123')
            m.init()
            expect(m.apiKeyInput).toBe('abc123')
        })

        it('leaves apiKeyInput empty when no key stored', () => {
            m.init()
            expect(m.apiKeyInput).toBe('')
        })
    })

    describe('saveApiKey()', () => {
        it('saves trimmed key to localStorage and sets savedMessage', () => {
            global.setTimeout = vi.fn((fn) => fn())
            m.apiKeyInput = '  myKey  '
            m.saveApiKey()
            expect(localStorage.getItem('tornApiKey')).toBe('myKey')
            expect(m.savedMessage).toBe(false) // setTimeout callback clears it
        })

        it('sets savedMessage true before timeout fires', () => {
            global.setTimeout = vi.fn()
            m.apiKeyInput = 'key'
            m.saveApiKey()
            expect(m.savedMessage).toBe(true)
            expect(localStorage.getItem('tornApiKey')).toBe('key')
        })

        it('does nothing when input is empty', () => {
            m.apiKeyInput = ''
            m.saveApiKey()
            expect(localStorage.getItem('tornApiKey')).toBeNull()
            expect(m.savedMessage).toBe(false)
        })

        it('does nothing when input is only whitespace', () => {
            m.apiKeyInput = '   '
            m.saveApiKey()
            expect(localStorage.getItem('tornApiKey')).toBeNull()
            expect(m.savedMessage).toBe(false)
        })
    })
})
