import { epochToDatetimeLocal, datetimeLocalToEpoch } from './datetime_field.js'

describe('epochToDatetimeLocal', () => {
    it('formats an epoch as a datetime-local string in UTC', () => {
        const epoch = Date.UTC(2025, 6, 17, 12, 0) / 1000; // 2025-07-17 12:00:00 UTC
        const result = epochToDatetimeLocal(epoch);
        expect(result).toBe('2025-07-17T12:00');
    });

    it('pads month, day, hours, minutes properly', () => {
        const epoch = Date.UTC(2025, 0, 1, 1, 1) / 1000; // 2025-01-01 01:01 UTC
        const result = epochToDatetimeLocal(epoch);
        expect(result).toBe('2025-01-01T01:01');
    });
});

describe('datetimeLocalToEpoch', () => {
    it('parses datetime-local string as UTC and converts to epoch', () => {
        const dtStr = '2025-07-17T12:00';
        const result = datetimeLocalToEpoch(dtStr);
        const expectedEpoch = Date.UTC(2025, 6, 17, 12, 0) / 1000;
        expect(result).toBe(expectedEpoch);
    });

    it('handles midnight correctly', () => {
        const dtStr = '2025-01-01T00:00';
        const result = datetimeLocalToEpoch(dtStr);
        const expectedEpoch = Date.UTC(2025, 0, 1, 0, 0) / 1000;
        expect(result).toBe(expectedEpoch);
    });
});
