import {getAllStatValues, getTotalStatsValue} from './spy_parser.js';

export const MatchClass = Object.freeze({
    IMPOSSIBLE: { rank: 2, label: 'Impossible', color: 'red-700', minScore: -Infinity },
    HARD:       { rank: 1, label: 'Hard',       color: 'orange-700', minScore: -0.5 },
    EVEN:       { rank: 0, label: 'Even',       color: 'yellow-700', minScore: -0.1 },
    EASY:       { rank: -1, label: 'Easy',       color: 'green-700', minScore: 0.2 },
    TRIVIAL:    { rank: -2, label: 'Trivial',    color: 'blue-700', minScore: 2 },
});

export function classifyMatchScore(score) {
    if (score >= MatchClass.TRIVIAL.minScore) return MatchClass.TRIVIAL;
    if (score >= MatchClass.EASY.minScore)    return MatchClass.EASY;
    if (score >= MatchClass.EVEN.minScore)    return MatchClass.EVEN;
    if (score >= MatchClass.HARD.minScore)    return MatchClass.HARD;
    return MatchClass.IMPOSSIBLE;
}

/**
 * Compare two match classes by their ranks.
 * The return value is negative if a < b, zero if a == b, and positive if a > b.
 */
export function compareMatchClass(a, b) {
    return a.rank - b.rank;
}

export function isEqualMatchClass(a, b) {
    return a?.rank === b?.rank;
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
 * @returns {{target: *, attackers: {name: string, score: number, matchClass: MatchClass}[]}[]}
 */
export function makeMatches(targets, attackers) {
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
            .sort((a, b) => b.score - a.score);

        return {
            target: target.data,
            attackers: matchingAttackers,
        };
    })
        .filter(Boolean) // remove nulls
        .sort((a, b) => getTotalStatsValue(b.target) - getTotalStatsValue(a.target)); // sort by target total stats
}

/**
 * Filter matches based on match class and whether to include unmatched targets.
 */
export function filterMatches(matches,
                              includeUnmatchedTargets = true,
                              includeClasses = [ MatchClass.EVEN, MatchClass.EASY, MatchClass.TRIVIAL ]) {
    if (!Array.isArray(matches)) return [];
    if (!Array.isArray(includeClasses) || includeClasses.length === 0) return matches;

    return matches.map(group => {
        const filteredAttackers = group.attackers.filter(attacker =>
            includeClasses.some(cls => isEqualMatchClass(attacker.matchClass, cls))
        );
        return {
            target: group.target,
            attackers: filteredAttackers,
        };
    }).filter(group => group.attackers.length > 0 || includeUnmatchedTargets);
}

/**
 * Calculate a target match score based on battle stats.
 *
 * A positive score suggests the attacker is favored.
 * A negative score suggests the target is stronger.
 *
 * @param {Object} attacker - { strength, defense, speed, dexterity }
 * @param {Object} target   - { strength, defense, speed, dexterity }
 * @returns {number} match score (typically between -0.5 and +0.5, but can be outside this range)
 *
 * Details:
 * Heuristic score estimating attacker-vs-target matchup advantage using battle stats only.
 * Doesn't account for weapons, gear, drugs, steadfast, etc.
 *
 * - handles missing or invalid values (e.g. zero, NaN) to ensure stable math.
 * - applies log10 to stat ratios to approximate Torn’s diminishing returns curve.
 * - Stat ratio score is a weighted sum of four comparisons:
 *     - To-hit chance:     speed vs dexterity      (40%)
 *     - Damage potential:  strength vs defense      (40%)
 *     - Dodge chance:      dexterity vs speed       (10%)
 *     - Damage mitigation: defense vs strength      (10%)
 * - Weights favor offensive stats for the purpose of target selection.
 * - Applies a penalty for total stat disparity because log10(attackerStat/targetStat)
 *   normalizes away magnitude.
 * - Forces a “fail floor” penalty if key stats are extremely mismatched
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

    const score_hit = scoreRatio(attacker.speed, target.dexterity);
    const score_str = scoreRatio(attacker.strength, target.defense);
    const score_dodge = scoreRatio(attacker.dexterity, target.speed);
    const score_def = scoreRatio(attacker.defense, target.strength);

    const weightedScore =
        0.3 * score_hit +
        0.3 * score_str +
        0.2 * score_dodge +
        0.2 * score_def;

    // Apply penalty for total stat disparity
    const totalAttacker = attacker.strength + attacker.defense + attacker.speed + attacker.dexterity;
    const totalTarget = target.strength + target.defense + target.speed + target.dexterity;

    const totalDisparityPenalty = Math.log10(safeRatio(totalTarget, totalAttacker)); // penalty if target has more total stats
    const penaltyWeight = 1.5; // tunable: how harshly to punish low-total attackers

    let finalScore =  weightedScore - penaltyWeight * totalDisparityPenalty;

    // Apply “fail floor” penalty if key stat mismatch is extreme
    const ratio_hit = safeRatio(attacker.speed, target.dexterity);
    const ratio_str = safeRatio(attacker.strength, target.defense);
    const FAIL_PENALTY = 5; // severe enough to drop to IMPOSSIBLE
    if (ratio_hit < 0.4 || ratio_str < 0.4) {
        finalScore -= FAIL_PENALTY;
    }

    return finalScore;
}

