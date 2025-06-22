import {getAllStatValues} from './spy_parser.js';

export const MatchClass = Object.freeze({
    OVERPOWERED: {
        value: 2,
        label: 'Overpowered',
        emoji: '🧹',
        color: 'green-700',
    },

    FAVORED: {
        value: 1,
        label: 'Favored',
        emoji: '🎯',
        color: 'green-500',
    },

    EVEN: {
        value: 0,
        label: 'Even Match',
        emoji: '⚖️',
        color: 'yellow-500',
    },

    UNFAVORED: {
        value: -1,
        label: 'Unfavored',
        emoji: '🟠',
        color: 'orange-500',
    },

    OVERMATCHED: {
        value: -2,
        label: 'Overmatched',
        emoji: '🔴',
        color: 'red-600',
    },
});

/**
 * Compare two match classes by their numeric value.
 * The return value is negative if a < b, zero if a == b, and positive if a > b.
 */
export function compareMatchClass(a, b) {
    return a.value - b.value;
}

/**
 * Generate match evaluations for each target against all attackers.
 *
 * Each result groups one target with a list of matching attackers.
 * Attackers include their full name, match score, and class.
 * Inputs are apy values for targets and attackers.
 *
 * @param targets
 * @param attackers
 * @param minClass
 * @returns {{target: *, attackers: {name: string, score: number, matchClass: MatchClass}[]}[]}
 */
export function makeMatches(targets, attackers, minClass = MatchClass.EVEN) {
    if (!Array.isArray(targets) || !Array.isArray(attackers)) {
        throw new Error('Both targets and attackers must be arrays');
    }

    targets = targets.map(t => ({
        data: t,
        stats: getAllStatValues(t),
    }));

    attackers = attackers.map(a => ({
        data: a,
        stats: getAllStatValues(a),
    }));

    return targets.map(target => {
        const matchingAttackers = attackers
            .map(attacker => {
                const score = evaluateMatchup(attacker.stats, target.stats);
                const matchClass = classifyMatchScore(score);
                return {
                    name: attacker.data.name,
                    score,
                    matchClass,
                };
            })
            .filter(e => compareMatchClass(e.matchClass, minClass) >= 0)
            .sort((a, b) => b.score - a.score);

        if (matchingAttackers.length === 0) return null; // exclude this target entirely

        return {
            target: target.data,
            attackers: matchingAttackers,
        };
    }).filter(Boolean); // remove nulls
}

/**
 * Calculate a target match score based on battle stats.
 *
 * A positive score suggests the attacker is favored.
 * A negative score suggests the target is stronger.
 *
 * @param {Object} attacker - { strength, defense, speed, dexterity }
 * @param {Object} target   - { strength, defense, speed, dexterity }
 * @returns {number} match score (typically between -1 and +1)
 *
 * Details:
 * Heuristic score estimating attacker-vs-target matchup advantage using battle stats only.
 * Doesn't account for weapons, gear, drugs, steadfast, etc.
 *
 * - handles missing or invalid values (e.g. zero, NaN) to ensure stable math.
 * - applies log10 to stat ratios to approximate Torn’s diminishing returns curve.
 * - Final score is a weighted sum of four comparisons:
 *     - To-hit chance:     speed vs dexterity      (40%)
 *     - Damage potential:  strength vs defense      (40%)
 *     - Dodge chance:      dexterity vs speed       (10%)
 *     - Damage mitigation: defense vs strength      (10%)
 * - Weights favor offensive stats for the purpose of target  selection.
 */
export function evaluateMatchup(attacker, target) {
    function safeRatio(numerator, denominator) {
        if (!isFinite(numerator) || !isFinite(denominator)) return 1;
        if (denominator === 0) return numerator > 0 ? 10 : 1;
        return numerator / denominator;
    }

    function scoreRatio(numerator, denominator) {
        return Math.log10(safeRatio(numerator, denominator));
    }

    const score_hit = scoreRatio(attacker.speed, target.dexterity);   // to-hit chance
    const score_str = scoreRatio(attacker.strength, target.defense);  // damage potential
    const score_dodge = scoreRatio(attacker.dexterity, target.speed);   // evade chance
    const score_def = scoreRatio(attacker.defense, target.strength);  // tankiness

    return 0.4 * score_hit +
        0.4 * score_str +
        0.1 * score_dodge +
        0.1 * score_def;
}

export function classifyMatchScore(score) {
    if (score >= 0.5) return MatchClass.OVERPOWERED;
    if (score >= 0.2) return MatchClass.FAVORED;
    if (score > -0.2) return MatchClass.EVEN;
    if (score > -0.5) return MatchClass.UNFAVORED;
    return MatchClass.OVERMATCHED;
}

