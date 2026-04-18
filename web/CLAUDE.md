# Shaggy Hi-Fidelity Faction Tools

Static multi-page web app for the Torn City online game. Tools help faction members with ranked war matchmaking and payroll calculations.

## Commands

All commands run from `web/`:

```
npm run dev        # Start Vite dev server
npm run build      # Production build to web/dist/
npm test           # Run Vitest (watch mode)
npx vitest run     # Run tests once (CI mode)
```

## Architecture

- **Multi-page app** — NOT a SPA. Each HTML file is its own page with its own `<script>` block.
- **Alpine.js** — Reactive UI framework. Models are factory functions returning plain objects with state + methods.
- **Tailwind CSS** — Utility-first CSS with custom color variables (CSS custom properties, dark mode via `prefers-color-scheme`).
- **Vite** — Build tool with multi-page rollup config. Each page is an entry point in `vite.config.js`.
- **No backend** — All API calls go directly from the browser to Torn.com v2 API and TornStats API.

## Pages

| File | Purpose | Alpine Model |
|------|---------|-------------|
| `index.html` | Landing page, API key storage, tool navigation | `apiKeyModel()` from `src/api_key_model.js` |
| `rw_matcher.html` | Ranked War Matchmaker (3-step wizard) | `newRWMatcherModel()` from `src/rw_matcher_model.js` |
| `rw_payroll.html` | Ranked War Payroll Calculator (3-step wizard) | `payrollModel()` from `src/rw_payroll_model.js` |
| `rw_lead.html` | Ranked War Lead Calculator (2-step wizard) | `leadModel()` from `src/rw_lead_model.js` |

## Module Map

```
src/
├── api_key_model.js        # Shared API key save/load (localStorage)
├── spy_parser.js            # Parse spy report text into structured data
├── target_matcher.js        # Match attackers to targets by battle stats
├── torn_api.js              # Torn.com v2 API client + hit classification
├── datetime_model.js        # Alpine component for datetime-local inputs
├── wizard_nav.js            # Shared wizard footer (Back/dots/Next)
├── war_score.js             # Ranked war target decay formulas
├── rw_lead_model.js         # Lead calculator page Alpine model
├── rw_matcher_model.js      # Matcher page Alpine model
├── rw_payroll_model.js      # Payroll page Alpine model
└── style.css                # Tailwind base + custom CSS variables
```

**Dependency graph:**
- `torn_api.js` → (none)
- `spy_parser.js` → (none)
- `target_matcher.js` → `spy_parser.js`
- `rw_matcher_model.js` → `spy_parser.js`, `target_matcher.js`
- `rw_payroll_model.js` → `torn_api.js`
- `rw_lead_model.js` → `torn_api.js`, `war_score.js`, `datetime_model.js`
- `war_score.js` → (none)
- `datetime_model.js` → (none)
- `wizard_nav.js` → (none)
- `api_key_model.js` → (none)

## Code Style

- ES6 modules (`import`/`export`), no CommonJS
- `export function` for named exports, prefer function declarations
- `const` for immutable values, `let` for reassignment, no `var`
- camelCase for variables/functions, PascalCase for constants/enums (e.g., `MatchClass`)
- `throw new Error()` with descriptive messages for error handling
- All source files use `.js` extension

## Key Conventions

### Alpine Model Pattern

Each page model is a factory function that returns a plain object. The object contains reactive state, computed getters, and methods. Example:

```js
export function myModel() {
    return {
        step: 1,
        data: [],
        init() { /* called by Alpine x-init */ },
        nextStep() { ... },
        prevStep() { ... },
        canProceed() { ... },
    }
}
```

Models are registered in the page's `<script type="module">` block, either via `window.modelName = factory` or `Alpine.data('name', factory)`.

### Wizard Pages

Wizard pages use a step-based pattern with `step`, `prevStep()`, `nextStep()`, and `canProceed()` on the model. The shared wizard footer is mounted via `mountWizardFooter(steps)` from `src/wizard_nav.js` — call it **before** `Alpine.start()`, passing the number of steps explicitly.

`prevStep()` at step 1 navigates back to `./index.html` — this is a shared contract across all wizard models.

### localStorage

- `tornApiKey` — shared across all pages (stored by `apiKeyModel`, read by `payrollModel`)
- `rw_matcher_state` — matcher page state (serialized JSON)
- Payroll page uses URL query params for state instead of localStorage

### Hardcoded Values

- Faction ID `49297` (Shaggy Hi-Fidelity) is hardcoded in `rw_matcher_model.js` and `rw_payroll_model.js`

### Tailwind Classes in JS

Tailwind scans `./src/**/*.{js,html}` and `./*.html` for class names. When writing Tailwind classes in JS template literals, use **complete class strings** — never interpolate partial class names (e.g., `` `max-w-${size}` `` will NOT be detected).

## Adding a New Wizard Page

1. **Create the HTML file** in `web/`:
   ```html
   <!DOCTYPE html>
   <html lang="en" class="bg-background">
   <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>Page Title</title>
       <link rel="stylesheet" href="./src/style.css" />
   </head>
   <body class="min-h-screen p-6 pb-24 text-textPrimary bg-background"
         x-data="myModel()" x-init="init()">
   <div class="max-w-4xl mx-auto bg-surface p-6 rounded-xl shadow-md">
       <h1 class="text-2xl font-bold mb-4">Page Title</h1>
       <!-- Step content using <template x-if="step === N"> -->
   </div>

   <script type="module">
       import Alpine from 'alpinejs'
       import { myModel } from './src/my_model.js'
       import { mountWizardFooter } from './src/wizard_nav.js'

       Alpine.data('myModel', myModel)
       mountWizardFooter(3)
       Alpine.start()
   </script>
   </body>
   </html>
   ```

2. **Create the model** in `src/my_model.js` — must expose `step`, `prevStep()`, `nextStep()`, `canProceed()`

3. **Add the entry** to `vite.config.js`:
   ```js
   input: {
       main: 'index.html',
       rw_matcher: 'rw_matcher.html',
       rw_payroll: 'rw_payroll.html',
       my_page: 'my_page.html',   // <-- add this
   }
   ```

4. **Add a link** on `index.html`

5. **Write tests** for the model in `src/my_model.test.js`

## Adding a Non-Wizard Page

Same as above but omit `pb-24` on `<body>`, don't import `mountWizardFooter`, and the model doesn't need step navigation.

## Testing

- **Framework:** Vitest with jsdom environment, globals enabled
- **Pattern:** Test pure JS functions directly. No Alpine integration tests.
- **Mocking:** Use `vi.fn()` for browser APIs (`fetch`, `navigator.clipboard`, `alert`, `setTimeout`). localStorage is available via jsdom. For `window.location.href` assignment, use `delete window.location; window.location = { href: '' }`.
- **File naming:** `src/module_name.test.js` alongside the source file

## Deployment

- **Primary:** Cloudflare Pages — auto-deploys on push to `main` when `web/**` changes
- **Fallback:** GitHub Pages — manual workflow in `.github/workflows/build_deploy.yml`
- **CI:** Tests run on PRs to `main` via `.github/workflows/test_pr.yml` (Node 22)
- **Domain:** `www.shaggyhf.com` (Cloudflare Worker redirects bare `shaggyhf.com` → `www`)
