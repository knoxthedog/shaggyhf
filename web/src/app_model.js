import { parseSpyText, parseNumber, formatNumber } from './spy_parser.js'

const STORAGE_KEY = 'spyAppState';

export function newAppModel() {
    return {
        input: '',
        spies: [],
        debouncedPersist: null,

        init() {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    this.input = state.input || '';
                    this.spies = Array.isArray(state.spies) ? state.spies : [];
                } catch (e) {
                    console.warn('Failed to load state:', e);
                }
            }

            this.debouncedPersist = debounce(() => this.persist(), 300);
        },

        persist() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                input: this.input,
                spies: this.spies,
            }));
        },

        parse() {
            this.spies = parseSpyText(this.input);
            this.persist();
        },

        clear() {
            this.input = '';
            this.spies = [];
            localStorage.removeItem(STORAGE_KEY);
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

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
