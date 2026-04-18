import { describe, it, expect, beforeEach, vi } from 'vitest'
import { leadModel } from './rw_lead_model.js'

describe('leadModel', () => {
    let m

    beforeEach(() => {
        localStorage.clear()
        m = leadModel()
    })

    describe('war selection', () => {
        it('selectedWar returns null when no war selected', () => {
            m.selectedWarId = ''
            m.ongoingWars = []
            expect(m.selectedWar).toBeNull()
        })

        it('selectedWar returns matching war', () => {
            m.ongoingWars = [
                { id: 1, start: 1000, target: 5000, factions: [] },
                { id: 2, start: 2000, target: 8000, factions: [] },
            ]
            m.selectedWarId = '2'
            expect(m.selectedWar.target).toBe(8000)
        })

        it('ourFaction and theirFaction extract correctly', () => {
            m.ongoingWars = [{
                id: 1, start: 1000, target: 5000,
                factions: [
                    { id: 49297, name: 'Shaggy', score: 3000 },
                    { id: 99999, name: 'Enemy', score: 1000 },
                ]
            }]
            m.selectedWarId = '1'
            expect(m.ourFaction.score).toBe(3000)
            expect(m.theirFaction.name).toBe('Enemy')
        })
    })

    describe('canProceed', () => {
        it('returns false without war or deadline', () => {
            expect(m.canProceed()).toBe(false)
        })

        it('returns true with war, deadline, and not loading', () => {
            m.selectedWarId = '1'
            m.deadlineStr = '2026-04-21T00:00'
            m.isLoading = false
            expect(m.canProceed()).toBe(true)
        })

        it('returns false while loading', () => {
            m.selectedWarId = '1'
            m.deadlineStr = '2026-04-21T00:00'
            m.isLoading = true
            expect(m.canProceed()).toBe(false)
        })
    })

    describe('navigation', () => {
        it('prevStep at step 1 navigates to index.html', () => {
            m.step = 1
            const original = window.location.href
            delete window.location
            window.location = { href: '' }

            m.prevStep()

            expect(window.location.href).toBe('./index.html')
            window.location = { href: original }
        })

        it('prevStep at step 2 goes to step 1', () => {
            m.step = 2
            m.prevStep()
            expect(m.step).toBe(1)
        })

        it('nextStep advances when canProceed', () => {
            m.selectedWarId = '1'
            m.deadlineStr = '2026-04-21T00:00'
            m.step = 1
            m.nextStep()
            expect(m.step).toBe(2)
        })

        it('nextStep does not advance when cannot proceed', () => {
            m.selectedWarId = ''
            m.step = 1
            m.nextStep()
            expect(m.step).toBe(1)
        })
    })

    describe('score formatting', () => {
        it('formats numbers with thousands separators', () => {
            expect(m.fmtScore(1234567)).toBe('1,234,567')
            expect(m.fmtScore(0)).toBe('0')
        })
    })

    describe('auto-selection', () => {
        it('fetchWars auto-selects when exactly one ongoing war', async () => {
            m.apiClient = {
                fetchRankedWars: vi.fn().mockResolvedValue({
                    rankedwars: [
                        { id: 42, start: 1000, end: 0, target: 5000, winner: null, factions: [] },
                        { id: 99, start: 2000, end: 0, target: 8000, winner: 1, factions: [] },
                    ]
                })
            }
            await m.fetchWars()
            expect(m.ongoingWars).toHaveLength(1)
            expect(m.selectedWarId).toBe('42')
        })

        it('fetchWars does not auto-select when no ongoing wars', async () => {
            m.apiClient = {
                fetchRankedWars: vi.fn().mockResolvedValue({
                    rankedwars: [
                        { id: 99, start: 2000, end: 0, target: 8000, winner: 1, factions: [] },
                    ]
                })
            }
            await m.fetchWars()
            expect(m.ongoingWars).toHaveLength(0)
            expect(m.selectedWarId).toBe('')
        })
    })
})
