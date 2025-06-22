import { parseNumber } from './spy_parser.js';

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
        numerator = parseNumber(numerator);
        denominator = parseNumber(denominator);
        if (!isFinite(numerator) || !isFinite(denominator)) return 1;
        if (denominator === 0) return numerator > 0 ? 10 : 1;
        return numerator / denominator;
    }

    function scoreRatio(numerator, denominator) {
        return Math.log10(safeRatio(numerator, denominator));
    }

    const score_hit   = scoreRatio(attacker.speed, target.dexterity);   // to-hit chance
    const score_str   = scoreRatio(attacker.strength, target.defense);  // damage potential
    const score_dodge = scoreRatio(attacker.dexterity, target.speed);   // evade chance
    const score_def   = scoreRatio(attacker.defense, target.strength);  // tankiness

    const score =
        0.4 * score_hit +
        0.4 * score_str +
        0.1 * score_dodge +
        0.1 * score_def;

    return score;
}

const MATCH_CLASS_ORDER = [
    'danger',
    'unfavorable',
    'even',
    'favored',
    'strongly_favored',
];

const MatchClassProto = {
    rank() {
        return MATCH_CLASS_ORDER.indexOf(this.key);
    },
    eq(other) {
        return this.key === other.key;
    },
    gt(other) {
        return this.rank() > MATCH_CLASS_ORDER.indexOf(other.key);
    },
    gte(other) {
        return this.rank() >= MATCH_CLASS_ORDER.indexOf(other.key);
    },
    lt(other) {
        return this.rank() < MATCH_CLASS_ORDER.indexOf(other.key);
    },
    lte(other) {
        return this.rank() <= MATCH_CLASS_ORDER.indexOf(other.key);
    },
};

export const MatchClass = Object.freeze({
    STRONGLY_FAVORED: Object.setPrototypeOf({
        key: 'strongly_favored',
        label: 'Easy Win',
        emoji: '🧹',
        color: 'green-700',
    }, MatchClassProto),

    FAVORED: Object.setPrototypeOf({
        key: 'favored',
        label: 'Likely Win',
        emoji: '🎯',
        color: 'green-500',
    }, MatchClassProto),

    EVEN: Object.setPrototypeOf({
        key: 'even',
        label: 'Even Match',
        emoji: '⚖️',
        color: 'yellow-500',
    }, MatchClassProto),

    UNFAVORABLE: Object.setPrototypeOf({
        key: 'unfavorable',
        label: 'High Risk',
        emoji: '🟠',
        color: 'orange-500',
    }, MatchClassProto),

    DANGER: Object.setPrototypeOf({
        key: 'danger',
        label: 'Avoid',
        emoji: '🔴',
        color: 'red-600',
    }, MatchClassProto)
});


export function compareMatchClass(a, b) {
    return MATCH_CLASS_ORDER.indexOf(a.key) - MATCH_CLASS_ORDER.indexOf(b.key);
}


export function classifyMatchScore(score) {
    if (score >= 0.5) return MatchClass.STRONGLY_FAVORED;
    if (score >= 0.2) return MatchClass.FAVORED;
    if (score > -0.2) return MatchClass.EVEN;
    if (score > -0.5) return MatchClass.UNFAVORABLE;
    return MatchClass.DANGER;
}

/**
 * Generate match evaluations for each target against all attackers.
 *
 * Each result groups one target with a list of matching attackers.
 * Attackers include their full name, match score, and class.
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

    return targets
        .map(target => {
            const matchingAttackers = attackers
                .map(attacker => {
                    const score = evaluateMatchup(attacker, target);
                    const matchClass = classifyMatchScore(score);
                    return {
                        name: attacker.name,
                        score,
                        matchClass,
                    };
                })
                .filter(e => e.matchClass.gte(minClass))
                .sort((a, b) => b.score - a.score);

            if (matchingAttackers.length === 0) return null; // exclude this target entirely

            return {
                target,
                attackers: matchingAttackers,
            };
        })
        .filter(Boolean); // remove nulls
}
