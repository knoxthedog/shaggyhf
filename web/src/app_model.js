import {parseSpyText, isCompleteSpy, formatNumber, getStatValue, getTotalStatsFormatted} from './spy_parser.js';
import {makeMatches, filterMatches, MatchClass} from './target_matcher.js';

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

        // Matchup Report state
        matches: [],
        filteredMatches: [],
        showImpossibleMatches: false,
        showHardMatches: true,
        showEvenMatches: true,
        showEasyMatches: true,
        showTrivialMatches: true,
        showUnmatchedTargets: true,

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
                    this.step = 1;
                    this.lastFetchedMembers = state.lastFetchedMembers ? new Date(state.lastFetchedMembers) : null;

                    this.showImpossibleMatches = state.showImpossibleMatches ?? false;
                    this.showHardMatches = state.showHardMatches ?? true;
                    this.showEvenMatches = state.showEvenMatches ?? true;
                    this.showEasyMatches = state.showEasyMatches ?? true;
                    this.showTrivialMatches = state.showTrivialMatches ?? true;
                    this.showUnmatchedTargets = state.showUnmatchedTargets ?? true;
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
                lastFetchedMembers: this.lastFetchedMembers ? this.lastFetchedMembers.toISOString() : null,

                showImpossibleMatches: this.showImpossibleMatches,
                showHardMatches: this.showHardMatches,
                showEvenMatches: this.showEvenMatches,
                showEasyMatches: this.showEasyMatches,
                showTrivialMatches: this.showTrivialMatches,
                showUnmatchedTargets: this.showUnmatchedTargets,
            }));
        },

        parse() { // TODO rename to parseSpies
            this.spies = parseSpyText(this.input);
            this.persist();
        },

        clear() { // TODO rename to clearSpies
            this.input = '';
            this.spies = [];
            localStorage.removeItem(STORAGE_KEY);
        },

        hasInput() { // TODO rename to hasSpyInput
            return this.input && this.input.trim().length > 0;
        },

        isInvalidStat(spy, statName) {
            return getStatValue(spy, statName) === null;
        },

        hasInvalidStats(spies) {
            return spies.some(spy => !isCompleteSpy(spy));
        },

        formatStatTotal(spy) {
            return getTotalStatsFormatted(spy);
        },

        nextStep() {
            if (this.step < 3 && this.canProceed()) {
                this.step++;
                if (this.step === 3) {
                    this.computeMatches();
                }
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
                return this.spies.some(spy => isCompleteSpy(spy))
            }
            if (this.step === 2) {
                return this.fetchedMembers.some(spy => isCompleteSpy(spy))
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

        computeMatches() {
            const validSpies = this.spies.filter(s => isCompleteSpy(s));
            const validTargets = this.fetchedMembers.filter(m => isCompleteSpy(m));
            this.matches = makeMatches(validSpies, validTargets);
            this.filterMatches();
        },

        filterMatches() {
            if (!Array.isArray(this.matches)) {
                this.filteredMatches = [];
                return;
            }

            let includeClasses = [];
            if (this.showImpossibleMatches) includeClasses.push(MatchClass.IMPOSSIBLE);
            if (this.showHardMatches) includeClasses.push(MatchClass.HARD);
            if (this.showEvenMatches) includeClasses.push(MatchClass.EVEN);
            if (this.showEasyMatches) includeClasses.push(MatchClass.EASY);
            if (this.showTrivialMatches) includeClasses.push(MatchClass.TRIVIAL);

            this.filteredMatches = filterMatches(this.matches, this.showUnmatchedTargets, includeClasses);
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
