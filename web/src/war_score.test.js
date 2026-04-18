import { describe, it, expect } from 'vitest'
import { computeOriginalTarget, targetAtTime, scoreNeeded, coastTime, nextEnrollmentDeadline } from './war_score.js'

const HOUR = 3600

describe('computeOriginalTarget', () => {
    const warStart = 1000000

    it('returns currentTarget as-is before 24h', () => {
        const now = warStart + 12 * HOUR
        expect(computeOriginalTarget(5000, warStart, now)).toBe(5000)
    })

    it('returns currentTarget at exactly 24h', () => {
        const now = warStart + 24 * HOUR
        expect(computeOriginalTarget(5000, warStart, now)).toBe(5000)
    })

    it('reverse-computes original target after decay', () => {
        const now = warStart + 34 * HOUR // 10h of decay = 10% decay
        // If original was 10000, after 10h decay: 10000 * (1 - 0.1) = 9000
        expect(computeOriginalTarget(9000, warStart, now)).toBeCloseTo(10000, 5)
    })

    it('reverse-computes correctly at 50h elapsed (26h decay)', () => {
        const now = warStart + 50 * HOUR
        // original 10000, 26h decay: 10000 * (1 - 0.26) = 7400
        expect(computeOriginalTarget(7400, warStart, now)).toBeCloseTo(10000, 5)
    })
})

describe('targetAtTime', () => {
    const warStart = 1000000
    const original = 10000

    it('returns original target before 24h', () => {
        expect(targetAtTime(original, warStart, warStart + 0)).toBe(10000)
        expect(targetAtTime(original, warStart, warStart + 12 * HOUR)).toBe(10000)
        expect(targetAtTime(original, warStart, warStart + 24 * HOUR)).toBe(10000)
    })

    it('decays 1% per hour after 24h', () => {
        expect(targetAtTime(original, warStart, warStart + 25 * HOUR)).toBeCloseTo(9900, 5)
        expect(targetAtTime(original, warStart, warStart + 34 * HOUR)).toBeCloseTo(9000, 5)
        expect(targetAtTime(original, warStart, warStart + 74 * HOUR)).toBeCloseTo(5000, 5)
    })

    it('floors at minimum (1% of original) at 123h', () => {
        // 99h of decay = 99%, leaving 1% = 100
        expect(targetAtTime(original, warStart, warStart + 200 * HOUR)).toBeCloseTo(100, 5)
    })

    it('reaches 0 at 123h (99h of decay = 99%)', () => {
        const target = targetAtTime(original, warStart, warStart + 123 * HOUR)
        expect(target).toBeCloseTo(100, 5)
    })

    it('does not go below 1% even well past 124h', () => {
        expect(targetAtTime(original, warStart, warStart + 124 * HOUR)).toBeCloseTo(100, 5)
    })
})

describe('scoreNeeded', () => {
    const warStart = 1000000
    const original = 10000

    it('returns 0 when score already exceeds target at deadline', () => {
        const deadline = warStart + 74 * HOUR // target = 5000
        expect(scoreNeeded(6000, original, warStart, deadline)).toBe(0)
    })

    it('returns 0 when score equals target at deadline', () => {
        const deadline = warStart + 74 * HOUR // target = 5000
        expect(scoreNeeded(5000, original, warStart, deadline)).toBe(0)
    })

    it('returns correct deficit', () => {
        const deadline = warStart + 74 * HOUR // target = 5000
        expect(scoreNeeded(3000, original, warStart, deadline)).toBe(2000)
    })

    it('rounds up to next integer', () => {
        const deadline = warStart + 25 * HOUR // target = 9900
        expect(scoreNeeded(9899.5, original, warStart, deadline)).toBe(1)
    })

    it('uses full original target before 24h', () => {
        const deadline = warStart + 12 * HOUR
        expect(scoreNeeded(8000, original, warStart, deadline)).toBe(2000)
    })
})

describe('coastTime', () => {
    const warStart = 1000000
    const original = 10000

    it('returns null when score is 0', () => {
        expect(coastTime(0, original, warStart)).toBeNull()
    })

    it('returns null when originalTarget is 0', () => {
        expect(coastTime(5000, 0, warStart)).toBeNull()
    })

    it('returns warStart when score already meets original target', () => {
        expect(coastTime(10000, original, warStart)).toBe(warStart)
        expect(coastTime(15000, original, warStart)).toBe(warStart)
    })

    it('calculates correct coast time for 50% of target', () => {
        // Need 50% decay → 50h of decay → 74h total from war start
        const result = coastTime(5000, original, warStart)
        expect(result).toBeCloseTo(warStart + 74 * HOUR, 0)
    })

    it('calculates correct coast time for 90% of target', () => {
        // Need 10% decay → 10h of decay → 34h total
        const result = coastTime(9000, original, warStart)
        expect(result).toBeCloseTo(warStart + 34 * HOUR, 0)
    })

    it('returns null when score is too low to ever be reached within 123h', () => {
        // At 123h, target decays by 99% → 100 remaining. Score of 50 is unreachable.
        expect(coastTime(50, original, warStart)).toBeNull()
    })

    it('handles score just above minimum reachable', () => {
        // 99h of decay = target * 0.01 = 100 remaining. Score of 100 needs exactly 123h.
        const result = coastTime(100, original, warStart)
        expect(result).toBeCloseTo(warStart + 123 * HOUR, 0)
    })
})

describe('nextEnrollmentDeadline', () => {
    it('returns 12h before next Tuesday noon TCT', () => {
        // Monday 2026-04-13 at 00:00 UTC (TCT)
        const monday = Date.UTC(2026, 3, 13, 0, 0, 0) / 1000
        const deadline = nextEnrollmentDeadline(monday)
        // Next Tuesday is 2026-04-14 12:00 UTC, minus 12h = 2026-04-14 00:00 UTC
        const expected = Date.UTC(2026, 3, 14, 0, 0, 0) / 1000
        expect(deadline).toBe(expected)
    })

    it('skips to following week if past Tuesday noon', () => {
        // Tuesday 2026-04-14 at 13:00 UTC (past noon)
        const pastTuesday = Date.UTC(2026, 3, 14, 13, 0, 0) / 1000
        const deadline = nextEnrollmentDeadline(pastTuesday)
        // Next Tuesday is 2026-04-21 12:00 UTC, minus 12h = 2026-04-21 00:00 UTC
        const expected = Date.UTC(2026, 3, 21, 0, 0, 0) / 1000
        expect(deadline).toBe(expected)
    })

    it('returns this Tuesday if before noon on Tuesday', () => {
        // Tuesday 2026-04-14 at 10:00 UTC (before noon)
        const earlyTuesday = Date.UTC(2026, 3, 14, 10, 0, 0) / 1000
        const deadline = nextEnrollmentDeadline(earlyTuesday)
        // This Tuesday 12:00 UTC minus 12h = 2026-04-14 00:00 UTC
        const expected = Date.UTC(2026, 3, 14, 0, 0, 0) / 1000
        expect(deadline).toBe(expected)
    })

    it('respects custom hoursBeforeEnrollment', () => {
        const monday = Date.UTC(2026, 3, 13, 0, 0, 0) / 1000
        const deadline = nextEnrollmentDeadline(monday, 24)
        // Tuesday 12:00 minus 24h = Monday 12:00
        const expected = Date.UTC(2026, 3, 13, 12, 0, 0) / 1000
        expect(deadline).toBe(expected)
    })

    it('works from a Saturday', () => {
        const saturday = Date.UTC(2026, 3, 18, 15, 0, 0) / 1000
        const deadline = nextEnrollmentDeadline(saturday)
        // Next Tuesday is 2026-04-21 12:00 UTC, minus 12h = 2026-04-21 00:00 UTC
        const expected = Date.UTC(2026, 3, 21, 0, 0, 0) / 1000
        expect(deadline).toBe(expected)
    })
})
