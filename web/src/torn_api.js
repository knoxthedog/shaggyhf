
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
            let url = `${baseUrl}/faction/attacks?key=${apiKey}&from=${startTime}&to=${endTime}&limit=1000&sort=desc`;

            while (url) {
                const response = await fetchFn(url);
                if (!response.ok) throw new Error(`Failed to fetch attacks: ${response.status}`);
                const data = await response.json();
                attacks.push(...(data.attacks || []));

                url = data._metadata?.links?.prev;
            }

            return attacks;
        }
    };
}

export async function collectRankedWarHits(apiClient, rankedWar, factionId) {
    const { start, end } = rankedWar;
    const attacks = await apiClient.fetchAttacksInWindow(start, end);
    return collectRankedWarHitsFromData(rankedWar, attacks, factionId);
}

/**
 * Collates and categorizes attacks made during a ranked war into war hits and outside hits,
 * grouped by attacker.
 *
 * A "war hit" is defined as:
 *   - An attack initiated by `myFactionId`
 *   - The defender belongs to the opposing faction in the ranked war
 *   - The attack occurred during the ranked war time window
 *
 * An "outside hit" is defined as:
 *   - An attack initiated by `myFactionId`
 *   - The defender does NOT belong to the opposing faction
 *   - The attack occurred during the ranked war time window
 *   - The attack is part of a chain (chain !== null/undefined)
 *
 * All other attacks (e.g., outside time window, not initiated by `myFactionId`, non-chain outside hits)
 * are ignored.
 *
 * @param {Object} rankedWar - The ranked war object, as returned from `/faction/{id}/rankedwars`,
 *                              containing `start`, `end`, and `factions` fields.
 * @param {Array<Object>} attacks - Array of attack records from `/faction/attacks` or `/faction/attacksfull`.
 * @param {number} myFactionId - The ID of the faction making the request (attacker faction).
 * @returns {Array<Object>} - Array of objects, each representing an attacker with the structure:
 *   [
 *     {
 *       id: number,           // Attacker player ID
 *       name: string,         // Attacker player name
 *       warHits: Array,       // Attacks against opposing faction members
 *       outsideHits: Array    // Chain attacks during war window but NOT against opposing faction
 *     },
 *     ...
 *   ]
 *
 * @throws {Error} If the opposing faction cannot be determined from the ranked war `factions` array.
 */
export function collectRankedWarHitsFromData(rankedWar, attacks, myFactionId) {
    const { start, end, factions } = rankedWar;
    const opposingFaction = factions.find(f => f.id !== myFactionId);
    if (!opposingFaction) {
        throw new Error('Opposing faction not found in rankedWar.factions');
    }
    const opposingFactionId = opposingFaction.id;

    const grouped = new Map();

    for (const attack of attacks) {
        // Check if this is within war window:
        if (attack.started < start || attack.started > end) continue;

        const attackerFactionId = attack.attacker?.faction?.id;
        const defenderFactionId = attack.defender?.faction?.id;

        if (attackerFactionId !== myFactionId) continue;  // Only count our attacks

        const attackerId = attack.attacker.id;
        const attackerName = attack.attacker.name;

        const isWarHit = defenderFactionId === opposingFactionId;
        const isChain = attack.chain !== null && attack.chain !== undefined;

        // Initialize grouping if not present:
        if ((isWarHit || isChain) && !grouped.has(attackerId)) {
            grouped.set(attackerId, {
                id: attackerId,
                name: attackerName,
                warHits: [],
                outsideHits: []
            });
        }

        if (isWarHit) {
            grouped.get(attackerId).warHits.push(attack);
        } else if (isChain) {
            grouped.get(attackerId).outsideHits.push(attack);
        }
    }

    return Array.from(grouped.values());
}
