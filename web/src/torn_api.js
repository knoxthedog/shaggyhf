
export function newTornApiClient(apiKey, fetchFn = fetch, baseUrl = 'https://api.torn.com/v2') {
    return {
        async fetchRankedWars(factionId) {
            const url = `${baseUrl}/faction/${factionId}/rankedwars?key=${apiKey}`;
            const response = await fetchFn(url);
            if (!response.ok) throw new Error(`Failed to fetch ranked wars: ${response.status}`);
            return await response.json();
        },

        async fetchRankedWarReport(rankedWarId) {
            const url = `${baseUrl}/faction/${rankedWarId}/rankedwarreport?key=${apiKey}`;
            const response = await fetchFn(url);
            if (!response.ok) throw new Error(`Failed to fetch ranked war report: ${response.status}`);
            return await response.json();
        },

        async fetchFactionMembers(factionId) {
            const url = `${baseUrl}/faction/${factionId}?selections=basic&key=${apiKey}`;
            const response = await fetchFn(url);
            if (!response.ok) throw new Error(`Failed to fetch faction members: ${response.status}`);
            const data = await response.json();
            const members = data.members || {};
            return Object.keys(members).map(id => parseInt(id, 10));
        },

        /**
         * Fetches all attacks within a time window, handling pagination
         * @see https://www.torn.com/swagger.php#/Faction/cb5b38ba64c389e706526df8bc8af9b6
         */
        async fetchAttacksInWindow(startTime, endTime) {
            const attacks = [];
            let url = `${baseUrl}/faction/attacks?key=${apiKey}&from=${startTime}&to=${endTime}&sort=desc`;

            while (url) {
                const response = await fetchFn(url);
                if (!response.ok) throw new Error(`Failed to fetch attacks: ${response.status}`);
                const data = await response.json();
                attacks.push(...(data.attacks || []));

                // urls are returned like this: "https://api.torn.com/v2/faction/attacks?&limit=100&sort=desc&from=1752148800&to=1752304696"
                // so we need to add the key to the next URL
                url = data._metadata?.links?.prev
                    ? `${data._metadata.links.prev}&key=${apiKey}`
                    : null;
            }

            return attacks;
        }
    };
}

/**
 * Collates and categorizes attacks made during a ranked war into "war hits" and "outside hits",
 * grouped by attacker. Also generates a detailed audit log of all attacks during the war window.
 *
 * Definitions:
 *
 * - A "war hit" is defined as:
 *   - Attacker belongs to `myFactionId`
 *   - Defender belongs to the opposing faction in the ranked war
 *   - Attack occurred during the ranked war time window
 *
 * - An "outside hit" is defined as:
 *   - Attacker belongs to `myFactionId`
 *   - Defender does NOT belong to the opposing faction
 *   - Attack occurred during the ranked war time window
 *   - Attack is part of a chain (`attack.chain` not null/undefined)
 *
 * - Additional audit-only rows:
 *   - If attacker belongs to the opposing faction and defender belongs to `myFactionId`,
 *     the attack is labeled as "War" (but excluded from payout calculations).
 *
 *   - All other attacks within the war window are labeled as "Other" and excluded from payout.
 *
 * Returns an object containing:
 *  - `participants`: Array of grouped attacker objects for payroll calculation.
 *  - `auditLog`: Array of flat audit records for reporting and diagnostics.
 *
 * @param {Object} rankedWar - The ranked war object from `/faction/{id}/rankedwars`,
 *                              containing `start`, `end`, and `factions` fields.
 * @param {Array<Object>} attacks - Array of attack records from `/faction/attacks` or `/faction/attacksfull`.
 * @param {number} myFactionId - The ID of the "owning" faction (the one requesting payroll).
 * @returns {Object} An object with two properties:
 *   - `participants`: Array of attacker summary objects:
 *     [
 *       {
 *         id: number,           // Attacker player ID
 *         name: string,         // Attacker player name
 *         warHits: Array,       // Successful attacks on opposing faction members
 *         outsideHits: Array    // Successful chain attacks on non-opposing faction members
 *       },
 *       ...
 *     ]
 *   - `auditLog`: Array of audit entries, each with:
 *     {
 *       player: string,        // Attacker name
 *       type: string,          // "War", "Outside", "Other"
 *       result: string,        // Attack result string
 *       opponent: string,      // Defender name or ID fallback
 *       timestamp: number,     // `started` timestamp (Unix epoch seconds)
 *       counted: boolean,      // true if attack counted towards payout
 *       isAttackerFacMember: boolean  // true if attacker was a member of `myFactionId`
 *     }
 *
 * @throws {Error} If the opposing faction cannot be determined from the ranked war's `factions` array.
 */
export function collectRankedWarHitsFromData(rankedWar, attacks, myFactionId) {
    const { start, end, factions } = rankedWar;
    const opposingFaction = factions.find(f => f.id !== myFactionId);
    if (!opposingFaction) {
        throw new Error('Opposing faction not found in rankedWar.factions');
    }
    const opposingFactionId = opposingFaction.id;

    const successfulResults = ['Attacked', 'Hospitalized', 'Mugged'];

    const grouped = new Map();
    const auditLog = [];

    for (const attack of attacks) {
        const attackTime = attack.started;

        const attackerId = attack.attacker?.id;
        const attackerName = attack.attacker?.name || `ID ${attackerId}`;
        const attackerFactionId = attack.attacker?.faction?.id;

        const defenderId = attack.defender?.id;
        const defenderName = attack.defender?.name || `ID ${defenderId}`;
        const defenderFactionId = attack.defender?.faction?.id;

        const isWithinWindow = attackTime >= start && (attackTime <= end || end === 0);

        let type = '';
        let counted = false;
        const isAttackerFacMember = attackerFactionId === myFactionId;

        if (isWithinWindow) {
            const isHitOnOpposingFaction = isAttackerFacMember && defenderFactionId === opposingFactionId;
            const isOutsideHit = isAttackerFacMember && attack.chain && defenderFactionId !== opposingFactionId;
            const isOpposingFactionHitUs = attackerFactionId === opposingFactionId && defenderFactionId === myFactionId;
            const isSuccessful = successfulResults.includes(attack.result);

            if (isHitOnOpposingFaction) {
                type = 'War';
                counted = isSuccessful;

                if (counted) {
                    if (!grouped.has(attackerId)) {
                        grouped.set(attackerId, {
                            id: attackerId,
                            name: attackerName,
                            warHits: [],
                            outsideHits: []
                        });
                    }
                    grouped.get(attackerId).warHits.push(attack);
                }

            } else if (isOutsideHit) {
                type = 'Outside';
                counted = isSuccessful;

                if (counted) {
                    if (!grouped.has(attackerId)) {
                        grouped.set(attackerId, {
                            id: attackerId,
                            name: attackerName,
                            warHits: [],
                            outsideHits: []
                        });
                    }
                    grouped.get(attackerId).outsideHits.push(attack);
                }

            } else if (isOpposingFactionHitUs) {
                type = 'War';
                counted = false;

            } else {
                type = 'Other';
                counted = false;

            }
        }

        auditLog.push({
            player: attackerName,
            type,
            result: attack.result,
            opponent: defenderName,
            timestamp: attackTime,
            counted,
            isAttackerFacMember,
        });
    }

    return {
        participants: Array.from(grouped.values()),
        auditLog
    };
}
