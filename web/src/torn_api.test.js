import { newTornApiClient, collectRankedWarHitsFromData } from './torn_api.js';


function createMockFetchWithMatcher(matcherFn) {
    return async function mockFetch(url) {
        const responseData = matcherFn(url);
        if (!responseData) {
            throw new Error(`Unexpected URL: ${url}`);
        }
        return {
            ok: true,
            json: async () => responseData
        };
    };
}

describe('newTornApiClient', () => {
    it('fetchRankedWars returns parsed data', async () => {
        const matcher = (url) => {
            if (url.includes('/rankedwars')) {
                return { rankedwars: [{ id: 1, name: 'Test War' }] };
            }
            return null;
        };
        const mockFetch = createMockFetchWithMatcher(matcher);
        const api = newTornApiClient('APIKEY', mockFetch, 'https://mock.api');

        const result = await api.fetchRankedWars(123);
        expect(result).toEqual({ rankedwars: [{ id: 1, name: 'Test War' }] });
    });

    it('fetchRankedWarReport returns war report', async () => {
        const matcher = (url) => {
            if (url.includes('/rankedwarreport')) {
                return { start: 1000, end: 2000 };
            }
            return null;
        };
        const mockFetch = createMockFetchWithMatcher(matcher);
        const api = newTornApiClient('APIKEY', mockFetch, 'https://mock.api');

        const result = await api.fetchRankedWarReport(1);
        expect(result).toEqual({ start: 1000, end: 2000 });
    });

    it('fetchFactionMembers returns member IDs as numbers', async () => {
        const matcher = (url) => {
            if (url.includes('?selections=basic')) {
                return { members: { 111: {}, 222: {} } };
            }
            return null;
        };
        const mockFetch = createMockFetchWithMatcher(matcher);
        const api = newTornApiClient('APIKEY', mockFetch, 'https://mock.api');

        const result = await api.fetchFactionMembers(555);
        expect(result).toEqual([111, 222]);
    });

    it('fetchAttacksInWindow paginates correctly', async () => {
        const matcher = (url) => {
            if (url.includes('/attacks')) {
                if (url.includes('page=2')) {
                    return {
                        "attacks": [
                            {
                                "id": "a2",
                                "started": 1073741824,
                                "ended": 1073741824,
                                "attacker": {
                                    "id": 1073741824,
                                    "name": "string",
                                    "faction": {
                                        "id": 1073741824
                                    }
                                },
                                "defender": {
                                    "id": 1073741824,
                                    "name": "string",
                                    "faction": {
                                        "id": 1073741824
                                    }
                                },
                                "result": "None",
                                "chain": 1073741824
                            }
                        ]
                    };
                }
                return {
                    "attacks": [
                        {
                            "id": "a1",
                            "started": 1073741825,
                            "ended": 1073741825,
                            "attacker": {
                                "id": 1073741824,
                                "name": "string",
                                "faction": {
                                    "id": 1073741824
                                }
                            },
                            "defender": {
                                "id": 1073741824,
                                "name": "string",
                                "faction": {
                                    "id": 1073741824
                                }
                            },
                            "result": "None",
                            "chain": 1073741824
                        }
                    ],
                    "_metadata": {
                        "links": {
                            "prev": "https://mock.api/attacks?page=2"
                        }
                    }
                };
            }
            return null;
        };
        const mockFetch = createMockFetchWithMatcher(matcher);
        const api = newTornApiClient('APIKEY', mockFetch, 'https://mock.api');

        const result = await api.fetchAttacksInWindow(1000, 2000);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('a1');
        expect(result[1].id).toBe('a2');
    });
});

describe('collectRankedWarHitsFromData', () => {
    const myFactionId = 1;
    const opposingFactionId = 2;

    const rankedWar = {
        start: 1000,
        end: 2000,
        factions: [
            { id: myFactionId, name: 'MyFaction' },
            { id: opposingFactionId, name: 'EnemyFaction' }
        ]
    };

    it('returns empty array when no attacks', () => {
        const result = collectRankedWarHitsFromData(rankedWar, [], myFactionId);
        expect(result).toEqual([]);
    });

    it('ignores attacks outside war timeframe', () => {
        const attacks = [{
            started: 500,  // before war start
            attacker: { id: 10, name: 'Alice', faction: { id: myFactionId } },
            defender: { id: 20, name: 'Bob', faction: { id: opposingFactionId } },
            chain: 123
        }];
        const result = collectRankedWarHitsFromData(rankedWar, attacks, myFactionId);
        expect(result).toEqual([]);
    });

    it('ignores attacks not from my faction', () => {
        const attacks = [{
            started: 1500,
            attacker: { id: 30, name: 'Eve', faction: { id: 999 } },  // not my faction
            defender: { id: 40, name: 'Mallory', faction: { id: myFactionId } },
            chain: 123
        }];
        const result = collectRankedWarHitsFromData(rankedWar, attacks, myFactionId);
        expect(result).toEqual([]);
    });

    it('classifies war hits correctly', () => {
        const attacks = [{
            started: 1500,
            attacker: { id: 10, name: 'Alice', faction: { id: myFactionId } },
            defender: { id: 20, name: 'Bob', faction: { id: opposingFactionId } },
            chain: 123
        }];
        const result = collectRankedWarHitsFromData(rankedWar, attacks, myFactionId);
        expect(result).toHaveLength(1);
        expect(result[0].warHits).toHaveLength(1);
        expect(result[0].outsideHits).toHaveLength(0);
    });

    it('classifies outside hits correctly', () => {
        const attacks = [{
            started: 1500,
            attacker: { id: 10, name: 'Alice', faction: { id: myFactionId } },
            defender: { id: 99, name: 'OtherGuy', faction: { id: 999 } },  // not opposing faction
            chain: 456
        }];
        const result = collectRankedWarHitsFromData(rankedWar, attacks, myFactionId);
        expect(result).toHaveLength(1);
        expect(result[0].warHits).toHaveLength(0);
        expect(result[0].outsideHits).toHaveLength(1);
    });

    it('groups multiple attacks by attacker', () => {
        const attacks = [
            {
                started: 1500,
                attacker: { id: 10, name: 'Alice', faction: { id: myFactionId } },
                defender: { id: 20, name: 'Bob', faction: { id: opposingFactionId } },
                chain: 1
            },
            {
                started: 1600,
                attacker: { id: 10, name: 'Alice', faction: { id: myFactionId } },
                defender: { id: 99, name: 'Charlie', faction: { id: 999 } },
                chain: 2
            }
        ];
        const result = collectRankedWarHitsFromData(rankedWar, attacks, myFactionId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(10);
        expect(result[0].name).toBe('Alice');
        expect(result[0].warHits).toHaveLength(1);
        expect(result[0].outsideHits).toHaveLength(1);
    });

    it('ignores non-chain, non-war hits', () => {
        const attacks = [{
            started: 1500,
            attacker: { id: 10, name: 'Alice', faction: { id: myFactionId } },
            defender: { id: 999, name: 'Neutral', faction: { id: 999 } },
            chain: null
        }];
        const result = collectRankedWarHitsFromData(rankedWar, attacks, myFactionId);
        expect(result).toEqual([]);
    });

    it('throws if opposing faction not found', () => {
        const badRankedWar = {
            start: 1000,
            end: 2000,
            factions: [{ id: myFactionId, name: 'MyFaction' }]  // no opponent
        };
        const attacks = [{
            started: 1500,
            attacker: { id: 10, name: 'Alice', faction: { id: myFactionId } },
            defender: { id: 20, name: 'Bob', faction: { id: 2 } },
            chain: 123
        }];
        expect(() => collectRankedWarHitsFromData(badRankedWar, attacks, myFactionId))
            .toThrow('Opposing faction not found in rankedWar.factions');
    });
});