import { parseSpyText, parseNumber, formatNumber } from './spy_parser.js'

export function newAppModel() {
    return {
        input: '',
        spies: [],

        parse() {
            this.spies = parseSpyText(this.input)
        },

        clear() {
            this.input = ''
            this.spies = []
        },

        isInvalid(value) {
            const parsed = parseNumber(value);
            return parsed == null;
        },

        hasInvalidStats() {
            return this.spies.some(spy =>
                this.isInvalid(spy.speed) ||
                this.isInvalid(spy.strength) ||
                this.isInvalid(spy.defense) ||
                this.isInvalid(spy.dexterity)
            );
        },

        formatTotal(spy) {
            const s = parseNumber(spy.speed);
            const st = parseNumber(spy.strength);
            const d = parseNumber(spy.defense);
            const dx = parseNumber(spy.dexterity);

            return (s != null && st != null && d != null && dx != null)
                ? formatNumber(s + st + d + dx)
                : 'N/A';
        }
    };
}
