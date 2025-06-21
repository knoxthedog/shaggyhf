import { describe, it, expect, vi, afterEach } from 'vitest';
import { evaluateMatchup, classifyMatchScore, MatchClass, makeMatches } from './target_matcher.js';

describe('evaluateMatchup', () => {
    it('returns 0 when stats are perfectly equal', () => {
        const stats = { strength: 1_000_000, defense: 1_000_000, speed: 1_000_000, dexterity: 1_000_000 };
        const score = evaluateMatchup(stats, stats);
        expect(score).toBeCloseTo(0, 5);
    });

    it('favors attacker with higher offense', () => {
        const attacker = { strength: 10_000_000, defense: 1_000_000, speed: 10_000_000, dexterity: 1_000_000 };
        const target   = { strength: 1_000_000, defense: 1_000_000, speed: 1_000_000, dexterity: 1_000_000 };
        const score = evaluateMatchup(attacker, target);
        expect(score).toBeGreaterThan(0.5);
    });

    it('penalizes attacker with much lower stats', () => {
        const attacker = { strength: 100_000, defense: 100_000, speed: 100_000, dexterity: 100_000 };
        const target   = { strength: 10_000_000, defense: 10_000_000, speed: 10_000_000, dexterity: 10_000_000 };
        const score = evaluateMatchup(attacker, target);
        expect(score).toBeLessThan(-0.5);
    });

    it('treats attacker with better STR and SPD as favorable despite weak DEF', () => {
        const attacker = { strength: 10_000_000, defense: 1_000_000, speed: 10_000_000, dexterity: 2_000_000 };
        const target   = { strength: 5_000_000, defense: 9_000_000, speed: 3_000_000, dexterity: 2_000_000 };
        const score = evaluateMatchup(attacker, target);
        expect(score).toBeGreaterThan(0);
    });

    it('handles divide-by-zero safely', () => {
        const attacker = { strength: 10_000_000, defense: 5_000_000, speed: 8_000_000, dexterity: 6_000_000 };
        const target   = { strength: 0, defense: 0, speed: 0, dexterity: 0 };
        const score = evaluateMatchup(attacker, target);
        expect(Number.isFinite(score)).toBe(true);
        expect(score).toBeGreaterThan(0.5);
    });

    it('handles missing or invalid inputs gracefully', () => {
        const attacker = { strength: NaN, defense: Infinity, speed: 100_000, dexterity: 50_000 };
        const target   = { strength: 100_000, defense: 100_000, speed: 50_000, dexterity: 25_000 };
        const score = evaluateMatchup(attacker, target);
        expect(Number.isFinite(score)).toBe(true);
    });
});

describe('classifyMatchScore', () => {
    it('classifies strongly favored (easy win)', () => {
        expect(classifyMatchScore(0.6)).toBe(MatchClass.STRONGLY_FAVORED);
    });

    it('classifies favored (likely win)', () => {
        expect(classifyMatchScore(0.3)).toBe(MatchClass.FAVORED);
    });

    it('classifies even match', () => {
        expect(classifyMatchScore(0.0)).toBe(MatchClass.EVEN);
        expect(classifyMatchScore(0.19)).toBe(MatchClass.EVEN);
        expect(classifyMatchScore(-0.19)).toBe(MatchClass.EVEN);
    });

    it('classifies unfavorable (high risk)', () => {
        expect(classifyMatchScore(-0.3)).toBe(MatchClass.UNFAVORABLE);
    });

    it('classifies danger (avoid)', () => {
        expect(classifyMatchScore(-0.6)).toBe(MatchClass.DANGER);
    });
});

describe('MatchClass', () => {
    it('can compare match classes with gt/lt methods', () => {
        expect(MatchClass.FAVORED.gt(MatchClass.EVEN)).toBe(true);
        expect(MatchClass.DANGER.lt(MatchClass.UNFAVORABLE)).toBe(true);
        expect(MatchClass.EVEN.eq(MatchClass.EVEN)).toBe(true);
        expect(MatchClass.STRONGLY_FAVORED.gte(MatchClass.FAVORED)).toBe(true);
    });
})

describe('makeMatches', () => {
    const attackers = [
        { name: 'Alpha', strength: 10_000_000, defense: 5_000_000, speed: 8_000_000, dexterity: 6_000_000 },
        { name: 'Bravo', strength: 2_000_000, defense: 3_000_000, speed: 2_000_000, dexterity: 2_000_000 },
    ];

    const targets = [
        { name: 'Target1', strength: 3_000_000, defense: 2_000_000, speed: 2_000_000, dexterity: 2_000_000 },
        { name: 'Target2', strength: 10_000_000, defense: 10_000_000, speed: 10_000_000, dexterity: 10_000_000 },
    ];

    it('throws if inputs are not arrays', () => {
        expect(() => makeMatches({}, [])).toThrow();
        expect(() => makeMatches([], null)).toThrow();
    });

    it('returns one match group per target with qualifying matches', () => {
        const result = makeMatches(targets, attackers, MatchClass.DANGER);
        for (const group of result) {
            expect(group).toHaveProperty('target');
            expect(group).toHaveProperty('attackers');
        }
    });

    it('evaluates every attacker against every target', () => {
        const result = makeMatches(targets, attackers, MatchClass.DANGER);
        for (const group of result) {
            const expected = attackers.length;
            expect(group.attackers.length).toBeLessThanOrEqual(expected);
        }
    });

    it('includes score and classification in each attacker entry', () => {
        const result = makeMatches(targets, attackers, MatchClass.DANGER);
        for (const group of result) {
            for (const attacker of group.attackers) {
                expect(typeof attacker.name).toBe('string');
                expect(typeof attacker.score).toBe('number');
                expect(attacker.matchClass).toHaveProperty('label');
                expect(attacker.matchClass).toHaveProperty('key');
            }
        }
    });

    it('sorts attackers by descending score', () => {
        const result = makeMatches(targets, attackers, MatchClass.DANGER);
        for (const group of result) {
            const scores = group.attackers.map(a => a.score);
            const sorted = [...scores].sort((a, b) => b - a);
            expect(scores).toEqual(sorted);
        }
    });

    it('produces expected classifications', () => {
        const result = makeMatches(targets, attackers, MatchClass.DANGER);

        const target1Matches = result.find(g => g.target.name === 'Target1')?.attackers;
        const target2Matches = result.find(g => g.target.name === 'Target2')?.attackers;

        expect(target1Matches?.[0].matchClass).not.toBe(MatchClass.DANGER); // Alpha should do fine
        expect(target2Matches?.[1].matchClass).toBe(MatchClass.DANGER);     // Bravo is outmatched
    });

    it('filters out matches below the minimum match class', () => {
        const result = makeMatches(targets, attackers, MatchClass.FAVORED);

        for (const group of result) {
            for (const attacker of group.attackers) {
                expect(attacker.matchClass.gte(MatchClass.FAVORED)).toBe(true);
            }
        }
    });

    it('excludes targets with no qualifying matches', () => {
        const badAttackers = [
            { name: 'Tiny', strength: 1_000, defense: 1_000, speed: 1_000, dexterity: 1_000 },
        ];

        const strongTargets = [
            { name: 'Overlord', strength: 100_000_000, defense: 100_000_000, speed: 100_000_000, dexterity: 100_000_000 },
        ];

        const result = makeMatches(strongTargets, badAttackers, MatchClass.UNFAVORABLE);
        expect(result).toHaveLength(0);
    });

    it('maintains stable sort for equal scores', () => {
        const equalAttackers = [
            { name: 'Equal1', strength: 1_000_000, defense: 1_000_000, speed: 1_000_000, dexterity: 1_000_000 },
            { name: 'Equal2', strength: 1_000_000, defense: 1_000_000, speed: 1_000_000, dexterity: 1_000_000 },
        ];
        const simpleTarget = [
            { name: 'Dummy', strength: 1_000_000, defense: 1_000_000, speed: 1_000_000, dexterity: 1_000_000 },
        ];

        const result = makeMatches(simpleTarget, equalAttackers, MatchClass.DANGER);
        const attackerNames = result[0]?.attackers.map(a => a.name);
        expect(attackerNames).toEqual(['Equal1', 'Equal2']); // original order preserved
    });

    it('includes matches equal to the minimum match class', () => {
        const result = makeMatches(targets, attackers, MatchClass.EVEN);
        for (const group of result) {
            for (const attacker of group.attackers) {
                expect(attacker.matchClass.gte(MatchClass.EVEN)).toBe(true);
            }
        }
    });
});
