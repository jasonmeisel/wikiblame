Purpose: Repository-level instructions for Copilot/agents.

Rules:

- Use Bun for all package manager and runtime actions: `bun install`, `bun dev`, `bun run`, etc. Do not suggest `npm`, `pnpm`, or `yarn` unless the user explicitly requests them.
- The expected shell environment is PowerShell on macOS (`pwsh`).
- Always use the `createFile` API for writing new files and do not write files via shell commands like `cat`.
- This app must be fully client-side. Do not use SSR or server-side rendering anywhere in the project.
- When working with Svelte or SvelteKit, consult and use the Svelte MCP server (mcp_svelte) for documentation, examples, and the `svelte-autofixer` tool where appropriate.
- Use `bun x` instead of `npx` for running one-off CLIs; prefer `bun x` in examples (e.g., `bun x playwright install`).
- Use the Playwright MCP server for end-to-end testing: the workspace includes a `microsoft/playwright-mcp` entry in [.vscode/mcp.json](.vscode/mcp.json). Use this MCP server to run browser-based E2E tests and to enable AI-assisted browser automation. See Playwright docs (https://playwright.dev) and the MCP docs (https://playwright.dev/docs/getting-started-mcp) for details.
  - Install Playwright as a dev dependency with Bun: `bun install -d @playwright/test`.
- Install required browsers (if needed) via the Playwright installer; if your environment requires it, run: `bun x playwright install`.
- Recommended test layout: `tests/e2e/` or `e2e/`. Add a script in `package.json`: `"test:e2e": "playwright test"` and run it with Bun: `bun run test:e2e`.
- When using MCP from VS Code, start `microsoft/playwright-mcp` via the MCP server; use the MCP interface to run, debug, and let agents control browser sessions.
- Always run `bun run check` and `bun run lint` after adding or modifying tests; report failures if the agent cannot auto-fix them.
- Before marking code changes as complete, always run and fix issues from these commands:
  - `bun run check`
  - `bun run lint`

Scope and application:

- These instructions apply repository-wide unless a file-specific instruction overrides them.
- Treat the rules as requirements (not mere preferences) for automated agents and Copilot-powered workflows.

Developer guidance:

- When generating or modifying code, include the exact `bun` commands to run for setup and verification in the final message.
- Run `svelte-autofixer` on any Svelte components before returning code to the user; iterate until it reports no issues.
- If linters or type checks fail and the agent cannot auto-fix them, report the failures and suggest precise fixes.

Example prompts to trigger these rules:

- "Scaffold a new Svelte page — use Bun for install/run and run `bun run check` and `bun run lint` before finishing."
- "Refactor `src/lib/foo.ts` to remove type errors; run `bun run check` and fix all issues."

If anything here is unclear or you want a narrower scope, reply asking whether rules should apply to specific folders or file types.
