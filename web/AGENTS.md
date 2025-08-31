# Agent Guidelines for Torn City Tools

## Build/Test/Lint Commands
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm test` - Run all tests with Vitest
- `npm test filename` - Run single test file (e.g., `npm test spy_parser`)
- `vitest --run filename.test.js` - Run specific test file directly

## Code Style Guidelines
- **Modules**: ES6 modules (`import`/`export`), no CommonJS
- **Functions**: Use `export function` for named exports, prefer function declarations
- **Variables**: Use `const` for immutable values, `let` for reassignment, avoid `var`
- **Naming**: camelCase for variables/functions, PascalCase for constants/enums
- **JSDoc**: Add comprehensive JSDoc comments for public functions with @param/@returns
- **Error Handling**: Use `throw new Error()` with descriptive messages
- **Testing**: Use Vitest with `describe`/`it` blocks, `expect()` assertions

## Project Structure
- `src/` - Source code modules
- `*.html` - Entry points for different tools (index, rw_matcher, rw_payroll)
- All source files use `.js` extension with ES6 module syntax
- Test files follow `*.test.js` naming convention

## Dependencies
- Alpine.js for reactive UI components
- Tailwind CSS for styling
- Vitest for testing with jsdom environment