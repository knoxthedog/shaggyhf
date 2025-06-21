import { parseSpyText, parseNumber, formatNumber } from './spy_parser.js';

const STORAGE_KEY = 'spyAppState';
const FACTION_ID = 49297; // Shaggy Hi-Fidelity

export function newAppModel() {
    return {
        input: '',
        spies: [],
        apiKey: '',
        fetchedMembers: [],
        step: 1,
        debouncedPersist: null,

        init() {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    this.input = state.input || '';
                    this.spies = Array.isArray(state.spies) ? state.spies : [];
                    this.apiKey = state.apiKey || '';
                    this.fetchedMembers = Array.isArray(state.fetchedMembers) ? state.fetchedMembers : [];
                    this.step = state.step || 1;
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
                apiKey: this.apiKey,
                fetchedMembers: this.fetchedMembers,
                step: this.step,
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

        hasInvalidStats(spies) {
            return spies.some(spy =>
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
        },

        nextStep() {
            if (this.step < 3 && this.canProceed()) {
                this.step++;
                this.persist();
            }
        },

        prevStep() {
            if (this.step > 1) {
                this.step--;
                this.persist();
            }
        },

        canProceed() {
            if (this.step === 1) {
                return validSpyExists(this.spies);
            }
            if (this.step === 2) {
                return validSpyExists(this.fetchedMembers);
            }
            return false;
        },

        async fetchFactionStats() {
            if (!this.apiKey) {
                alert("API key required");
                return;
            }

            try {
                const res = await fetch(`https://www.tornstats.com/api/v2/${this.apiKey}/spy/faction/${FACTION_ID}`)
                const json = await res.json();
                if (json) {
                    this.fetchedMembers = getSpiesFromFaction(json.faction || {});
                    this.persist();
                } else {
                    alert("Invalid response from TornStats");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to fetch faction data");
            }
        },
    };
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Extract spies from faction data in the same format as parseSpyText
export function getSpiesFromFaction(faction) {
    let members = Object.values(faction.members || {});
    return members.map(member => {
        const spy = member.spy || {};
        return {
            name: member.name,
            level: member.level + '',
            speed: formatNumber(spy.speed ?? null),
            strength: formatNumber(spy.strength ?? null),
            defense: formatNumber(spy.defense ?? null),
            dexterity: formatNumber(spy.dexterity ?? null),
        };
    });
}

function validSpyExists(spies) {
    return spies.some(spy => {
        const s = parseNumber(spy.speed);
        const st = parseNumber(spy.strength);
        const d = parseNumber(spy.defense);
        const dx = parseNumber(spy.dexterity);
        return s != null && st != null && d != null && dx != null;
    });
}