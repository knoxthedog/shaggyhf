import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSpiesFromFaction, newRWMatcherModel } from './rw_matcher_model.js'

function completeSpy(name = 'Target', overrides = {}) {
    return {
        name,
        level: '50',
        speed: '1,000',
        strength: '2,000',
        defense: '3,000',
        dexterity: '4,000',
        ...overrides,
    }
}

function incompleteSpy(name = 'Partial') {
    return { name, level: '10', speed: 'N/A', strength: '100', defense: '200', dexterity: '300' }
}

describe('getSpiesFromFaction', () => {
    it('extracts spies correctly', () => {
        const input = {
            "status": true,
            "message": "Spy data found.",
            "faction": {
                "ID": 99999,
                "name": "Anonymous Syndicate",
                "members": {
                    "1000001": {
                        "name": "User_Alpha",
                        "level": 100,
                        "days_in_faction": 238,
                        "last_action": { "status": "Offline", "timestamp": 1750231312, "relative": "17 hours ago" },
                        "status": { "description": "Okay", "details": "", "state": "Okay", "color": "green", "until": 0 },
                        "position": "Operative",
                        "id": 1000001,
                        "spy": { "strength": 201000000, "defense": 199000000, "speed": 205000000, "dexterity": 240000000, "total": 845000000, "timestamp": 1750214654 }
                    },
                    "1000002": {
                        "name": "User_Beta",
                        "level": 84,
                        "days_in_faction": 113,
                        "last_action": { "status": "Online", "timestamp": 1750294319, "relative": "0 minutes ago" },
                        "status": { "description": "Okay", "details": "", "state": "Okay", "color": "green", "until": 0 },
                        "position": "Specialist",
                        "id": 1000002,
                        "spy": { "strength": 101000000, "defense": 220000000, "speed": 210000000, "dexterity": 90000000, "total": 621000000, "timestamp": 1750216696 }
                    },
                    "1000003": {
                        "name": "User_Charlie",
                        "level": 24,
                        "days_in_faction": 86,
                        "last_action": { "status": "Offline", "timestamp": 1750292955, "relative": "23 minutes ago" },
                        "status": { "description": "Okay", "details": "", "state": "Okay", "color": "green", "until": 0 },
                        "position": "Scout",
                        "id": 1000003,
                        "spy": { "strength": 15000, "defense": 5000, "speed": 30000, "dexterity": 12000, "total": 62000, "timestamp": 1750231942 }
                    },
                    "1000004": {
                        "name": "User_Delta",
                        "level": 13,
                        "days_in_faction": 27,
                        "last_action": { "status": "Offline", "timestamp": 1750286656, "relative": "2 hours ago" },
                        "status": { "description": "Okay", "details": "", "state": "Okay", "color": "green", "until": 0 },
                        "position": "Initiate",
                        "id": 1000004,
                        "spy": { "strength": 2000, "defense": 800, "speed": 3500, "dexterity": 1700, "total": 8000, "timestamp": 1750233235 }
                    }
                }
            }
        };

        const result = getSpiesFromFaction(input.faction);

        expect(result).toEqual([
            { name: 'User_Alpha', level: '100', speed: '205,000,000', strength: '201,000,000', defense: '199,000,000', dexterity: '240,000,000' },
            { name: 'User_Beta', level: '84', speed: '210,000,000', strength: '101,000,000', defense: '220,000,000', dexterity: '90,000,000' },
            { name: 'User_Charlie', level: '24', speed: '30,000', strength: '15,000', defense: '5,000', dexterity: '12,000' },
            { name: 'User_Delta', level: '13', speed: '3,500', strength: '2,000', defense: '800', dexterity: '1,700' },
        ]);
    });
})

describe('newRWMatcherModel', () => {
    let m

    beforeEach(() => {
        localStorage.clear()
        m = newRWMatcherModel()
    })

    describe('hasSpyInput()', () => {
        it('returns falsy when input is empty', () => {
            m.input = ''
            expect(m.hasSpyInput()).toBeFalsy()
        })

        it('returns false when input is whitespace', () => {
            m.input = '   '
            expect(m.hasSpyInput()).toBe(false)
        })

        it('returns true when input has content', () => {
            m.input = 'some spy text'
            expect(m.hasSpyInput()).toBe(true)
        })
    })

    describe('clearSpies()', () => {
        it('resets input and spies, removes localStorage key', () => {
            m.input = 'data'
            m.spies = [completeSpy()]
            localStorage.setItem('rw_matcher_state', '{}')

            m.clearSpies()

            expect(m.input).toBe('')
            expect(m.spies).toEqual([])
            expect(localStorage.getItem('rw_matcher_state')).toBeNull()
        })
    })

    describe('canProceed()', () => {
        it('returns true at step 1 when at least one complete spy exists', () => {
            m.step = 1
            m.spies = [completeSpy()]
            expect(m.canProceed()).toBe(true)
        })

        it('returns false at step 1 when no complete spies', () => {
            m.step = 1
            m.spies = [incompleteSpy()]
            expect(m.canProceed()).toBe(false)
        })

        it('returns false at step 1 when spies is empty', () => {
            m.step = 1
            m.spies = []
            expect(m.canProceed()).toBe(false)
        })

        it('returns true at step 2 when fetchedMembers has a complete spy', () => {
            m.step = 2
            m.fetchedMembers = [completeSpy('Member')]
            expect(m.canProceed()).toBe(true)
        })

        it('returns false at step 2 when fetchedMembers has no complete spies', () => {
            m.step = 2
            m.fetchedMembers = [incompleteSpy()]
            expect(m.canProceed()).toBe(false)
        })

        it('returns false at step 3', () => {
            m.step = 3
            expect(m.canProceed()).toBe(false)
        })
    })

    describe('prevStep()', () => {
        it('decrements step from 3 to 2', () => {
            m.step = 3
            m.prevStep()
            expect(m.step).toBe(2)
        })

        it('decrements step from 2 to 1', () => {
            m.step = 2
            m.prevStep()
            expect(m.step).toBe(1)
        })

        it('navigates to index.html at step 1', () => {
            m.step = 1
            const original = window.location.href
            delete window.location
            window.location = { href: '' }

            m.prevStep()

            expect(window.location.href).toBe('./index.html')
            window.location = { href: original }
        })
    })

    describe('nextStep()', () => {
        it('increments step when canProceed is true', () => {
            m.step = 1
            m.spies = [completeSpy()]
            m.init()
            m.nextStep()
            expect(m.step).toBe(2)
        })

        it('does not increment when canProceed is false', () => {
            m.step = 1
            m.spies = []
            m.init()
            m.nextStep()
            expect(m.step).toBe(1)
        })

        it('does not increment past step 3', () => {
            m.step = 3
            m.init()
            m.nextStep()
            expect(m.step).toBe(3)
        })

        it('computes matches when entering step 3', () => {
            m.step = 2
            m.spies = [completeSpy('Target')]
            m.fetchedMembers = [completeSpy('Attacker')]
            m.init()
            m.nextStep()
            expect(m.step).toBe(3)
            expect(m.matches.length).toBeGreaterThan(0)
        })
    })

    describe('init() / persist()', () => {
        it('round-trips state through localStorage', () => {
            m.init()
            m.input = 'spy text'
            m.spies = [completeSpy()]
            m.apiKey = 'testkey'
            m.showImpossibleMatches = true
            m.showEasyMatches = false

            m.persist()

            const m2 = newRWMatcherModel()
            m2.init()

            expect(m2.input).toBe('spy text')
            expect(m2.spies).toEqual([completeSpy()])
            expect(m2.apiKey).toBe('testkey')
            expect(m2.showImpossibleMatches).toBe(true)
            expect(m2.showEasyMatches).toBe(false)
        })

        it('handles missing localStorage gracefully', () => {
            m.init()
            expect(m.input).toBe('')
            expect(m.spies).toEqual([])
            expect(m.step).toBe(1)
        })

        it('handles corrupted localStorage gracefully', () => {
            localStorage.setItem('rw_matcher_state', 'not json')
            m.init()
            expect(m.input).toBe('')
            expect(m.spies).toEqual([])
        })

        it('creates debouncedPersist function on init', () => {
            m.init()
            expect(typeof m.debouncedPersist).toBe('function')
        })
    })

    describe('filterMatches()', () => {
        it('handles non-array matches gracefully', () => {
            m.matches = null
            m.filterMatches()
            expect(m.filteredMatches).toEqual([])
        })

        it('filters by show* flags', () => {
            m.step = 2
            m.spies = [completeSpy('Target', { speed: '100', strength: '100', defense: '100', dexterity: '100' })]
            m.fetchedMembers = [completeSpy('Attacker')]
            m.init()

            m.computeMatches()

            m.showTrivialMatches = true
            m.showEasyMatches = true
            m.showEvenMatches = true
            m.showHardMatches = true
            m.showImpossibleMatches = true
            m.showUnmatchedTargets = true
            m.filterMatches()
            const allCount = m.filteredMatches.length

            m.showTrivialMatches = false
            m.showEasyMatches = false
            m.showEvenMatches = false
            m.showHardMatches = false
            m.showImpossibleMatches = false
            m.showUnmatchedTargets = false
            m.filterMatches()

            expect(m.filteredMatches.length).toBeLessThanOrEqual(allCount)
        })
    })

    describe('renderMatchesAsText()', () => {
        it('formats filtered matches as plain text', () => {
            m.spies = [completeSpy('Target', { speed: '100', strength: '100', defense: '100', dexterity: '100' })]
            m.fetchedMembers = [completeSpy('Attacker')]
            m.showUnmatchedTargets = true
            m.init()
            m.computeMatches()
            m.filterMatches()

            const text = m.renderMatchesAsText()

            expect(text).toContain('=== Target ===')
            expect(text).toContain('Attacker')
        })

        it('returns empty string when no matches', () => {
            m.filteredMatches = []
            const text = m.renderMatchesAsText()
            expect(text).toBe('')
        })
    })
})
