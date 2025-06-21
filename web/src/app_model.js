import { parseSpyText, parseNumber, formatNumber } from './spy_parser.js';

const STORAGE_KEY = 'spyAppState';
const FACTION_ID = 49297; // Shaggy Hi-Fidelity

export function newAppModel() {
    return {
        // Spy Parser state
        input: '',
        spies: [],

        // Faction Stats state
        apiKey: '',
        fetchedMembers: [],
        lastFetchedMembers: null,
        isFetchingMembers: false,
        fetchMembersError: null,
        fetchMembersErrorDetail: null,

        // Application state
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
                    this.lastFetchedMembers = state.lastFetchedMembers ? new Date(state.lastFetchedMembers) : null;
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
                lastFetchedMembers: this.lastFetchedMembers ? this.lastFetchedMembers.toISOString() : null,
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

        hasInput() {
            return this.input && this.input.trim().length > 0;
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

        hasValidAPIKey() {
            return this.apiKey && this.apiKey.trim().length > 0;
        },

        async fetchFactionStats() {
            if (!this.apiKey) return;

            this.isFetchingMembers = true;
            this.fetchedMembers = [];
            this.fetchMembersError = null;
            this.fetchMembersErrorDetail = null;

            try {
                const response = await fetch(`https://www.tornstats.com/api/v2/${this.apiKey}/spy/faction/${FACTION_ID}`)
                const data = await response.json();

                this.fetchedMembers = getSpiesFromFaction(data.faction || []);
                this.lastFetchedMembers = new Date();
                this.persist();
            } catch (e) {
                console.error("Fetch error:", e);
                this.fetchMembersError = 'Failed to fetch faction stats. Please check your API key or try again later.';
                this.fetchMembersErrorDetail = e?.message || String(e) || 'Unknown error';
            } finally {
                this.isFetchingMembers = false;
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