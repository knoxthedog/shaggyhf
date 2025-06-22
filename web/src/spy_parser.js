export const StatNames = Object.freeze({
    STRENGTH: 'strength',
    DEFENSE: 'defense',
    SPEED: 'speed',
    DEXTERITY: 'dexterity',
});

export const AllStatNames = Object.freeze([
    StatNames.STRENGTH,
    StatNames.DEFENSE,
    StatNames.SPEED,
    StatNames.DEXTERITY,
]);

/**
 * Parses a text block containing spy stats into an array of spy objects.
 * The stat values are returned as strings, which can be further processed with
 * functions from this module.
 *
 * @param text
 * @returns [{ name: string, level: string, speed: string, strength: string, defense: string, dexterity: string }]
 */
export function parseSpyText(text) {
    const blocks = text
        .split(/(?=^\s*Name:)/gim)
        .map(b => b.trim())
        .filter(Boolean);

    const get = (block, label) => {
        const match = new RegExp(`${label}:\\s*(.*)`, 'i').exec(block);
        return match ? match[1].trim() : '';
    };

    return blocks.map(block => {
        const nameLine = get(block, 'Name');
        const nameMatch = /(.*)\s\[(\d+)\]/.exec(nameLine);
        const name = nameMatch ? nameMatch[1] : nameLine;

        return {
            name,
            level: get(block, 'Level'),
            speed: get(block, 'Speed'),
            strength: get(block, 'Strength'),
            defense: get(block, 'Defense'),
            dexterity: get(block, 'Dexterity'),
        };
    });
}

/**
 * Return the parsed numeric value of a specific stat for a given spy.
 * Non-numeric values will be converted to null.
 */
export function getStatValue(spy, statName) {
    return parseNumber(spy[statName]);
}

/**
 * Return an object of all parsed numeric stats for a given spy.
 * Non-numeric values will be converted to null.
 */
export function getAllStatValues(spy) {
    return {
        strength: getStatValue(spy, StatNames.STRENGTH),
        defense: getStatValue(spy, StatNames.DEFENSE),
        speed: getStatValue(spy, StatNames.SPEED),
        dexterity: getStatValue(spy, StatNames.DEXTERITY),
    };
}

/**
 * Calculate the total of all stats for a given spy and return its numeric value.
 * If any stat is non-numeric, it will be treated as zero.
 */
export function getTotalStatsValue(spy) {
    const stats = getAllStatValues(spy);
    return Object.values(stats).reduce((total, value) => {
        return total + (value != null ? value : 0);
    }, 0);
}

/**
 * Check if the provided spy object has valid numeric values for all stats.
 */
export function isValidSpy(spy) {
    return spy && typeof spy === 'object' &&
        AllStatNames.every(stat => stat in spy && parseNumber(spy[stat]) != null);
}

/**
 * Format the total stats value for a given spy as a string with thousands separators.
 * If the total is NaN or null, it will return 'N/A'.
 */
export function getTotalStatsFormatted(spy) {
    const allStats = getAllStatValues(spy);
    if (Object.values(allStats).some(v => v == null)) {
        return 'N/A';
    }
    const total = getTotalStatsValue(spy);
    return total.toLocaleString();
}

function parseNumber(input) {
    if (typeof input === 'number') {
        return isNaN(input) ? null : input;
    }

    if (typeof input === 'string') {
        const clean = input.trim().replace(/,/g, '');
        const n = parseInt(clean, 10);
        return isNaN(n) ? null : n;
    }

    return null;
}


