import {
    parseSpyText,
    getStatValue,
    getAllStatValues,
    getTotalStatsValue,
    getTotalStatsFormatted,
    isCompleteSpy,
    StatNames,
    AllStatNames,
} from './spy_parser.js';

describe('parseSpyText', () => {
    it('parses a single spy block correctly', () => {
        const input = `
Name: Alpha [123]
Level: 42

You managed to get the following results:
Strength: 10,000
Defense: 5,000
Speed: 7,500
Dexterity: 2,500
    `.trim();

        const result = parseSpyText(input);
        expect(result).toHaveLength(1);

        const spy = result[0];
        expect(spy.name).toBe('Alpha');
        expect(spy.level).toBe('42');
        expect(spy.strength).toBe('10,000');
        expect(spy.defense).toBe('5,000');
        expect(spy.speed).toBe('7,500');
        expect(spy.dexterity).toBe('2,500');
    });

    it('parses multiple blocks', () => {
        const input = `
Name: Bravo [234]
Level: 55

You managed to get the following results:
Strength: 2000
Defense: 3000
Speed: 4000
Dexterity: 1000
============================
Name: Charlie [345]
Level: 60

You managed to get the following results:
Strength: 5000
Defense: 6000
Speed: 7000
Dexterity: 8000
    `.trim();

        const spies = parseSpyText(input);
        expect(spies).toHaveLength(2);
        expect(spies[0].name).toBe('Bravo');
        expect(spies[1].name).toBe('Charlie');
    });
});

describe('stat value helpers', () => {
    const spy = {
        strength: '1,000',
        defense: '2000',
        speed: '3,000',
        dexterity: 'invalid',
    };

    it('getStatValue parses valid numbers and returns null for invalid', () => {
        expect(getStatValue(spy, StatNames.STRENGTH)).toBe(1000);
        expect(getStatValue(spy, StatNames.DEFENSE)).toBe(2000);
        expect(getStatValue(spy, StatNames.SPEED)).toBe(3000);
        expect(getStatValue(spy, StatNames.DEXTERITY)).toBeNull();
    });

    it('getAllStatValues returns numeric object with null for invalids', () => {
        const values = getAllStatValues(spy);
        expect(values).toEqual({
            strength: 1000,
            defense: 2000,
            speed: 3000,
            dexterity: null,
        });
    });

    it('getTotalStatsValue sums only valid numbers', () => {
        const total = getTotalStatsValue(spy);
        expect(total).toBe(6000); // dexterity is null
    });

    it('getTotalStatsFormatted returns "N/A" if any stat is invalid', () => {
        const formatted = getTotalStatsFormatted(spy);
        expect(formatted).toBe('N/A');
    });

    it('getTotalStatsFormatted returns formatted string when valid', () => {
        const validSpy = {
            strength: '100000',
            defense: '200000',
            speed: '300000',
            dexterity: '400000',
        };
        const formatted = getTotalStatsFormatted(validSpy);
        expect(formatted).toBe('1,000,000');
    });

    it('isValidSpy returns true only if all stat values are valid', () => {
        expect(isCompleteSpy(spy)).toBe(false);

        const validSpy = {
            strength: '1000',
            defense: '2000',
            speed: '3000',
            dexterity: '4000',
        };
        expect(isCompleteSpy(validSpy)).toBe(true);
    });
});
