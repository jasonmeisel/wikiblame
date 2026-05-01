# Playwright-Verified Code Change Prompt

Purpose
- Turn a user's code/change request into minimal, safe edits and verify UI behavior using the Playwright MCP (Playwright Microservice) before finalizing. The agent should both modify the repo (via apply_patch/create_file) and use Playwright MCP calls (mcp_microsoft_pla_browser_*) to inspect, assert, and collect artifacts (snapshots, screenshots, console/network logs).

Scope
- Workspace-scoped prompt. Use this when a user asks for code changes that affect UI, routing, or runtime behavior that can be validated in a browser.

Inputs (optional)
- `user_request` (string): natural-language instruction from the user.
- `dev_url` (string): base URL for the dev server (default: `http://localhost:5173`).
- `dev_command` (string): command to start dev server if needed (suggested: `npm run dev` / `bun dev`).
- `test_command` (string): e2e test command to run (optional).
- `verify_selectors` (array): list of CSS selectors/text to assert.

Agent workflow (required)
1. Confirm or ask clarifying questions only if the request is ambiguous or missing crucial context (target page, selector, expected text, URL). Keep clarifying Qs concise.
2. Explore the repository to find relevant files and test scaffolding. Prefer a quick search (filenames, components, routes).
3. Create a short plan and update the TODO list using the `manage_todo_list` tool. Keep steps small and verifiable.
4. Make minimal code changes. Use `apply_patch` or `create_file` and keep edits focused and reversible. Include a short commit-style summary with the patch.
5. Start or ensure the dev server is available. If you need to start it, ask the user for permission (long-running processes) or run it briefly for verification.
6. Verify with Playwright MCP (see checklist below). Capture artifacts (screenshots, accessibility/DOM snapshot, console/network logs, evaluation results).
7. If verification fails, produce a concise diagnosis, a follow-up small patch, and re-run checks. Iterate until verification passes or you need user input.
8. Return a final summary: files changed, the patch (or link to it), verification status, artifacts, and reproduction steps.

Playwright MCP checklist (how to verify)
- Open a new tab: `mcp_microsoft_pla_browser_tabs action=new`.
- Navigate: `mcp_microsoft_pla_browser_navigate` to the target URL (route or page under test).
- Wait for page readiness: `mcp_microsoft_pla_browser_wait_for` (text or selector) or `mcp_microsoft_pla_browser_snapshot` to observe DOM.
- Interact as needed: use `mcp_microsoft_pla_browser_click`, `mcp_microsoft_pla_browser_type`, `mcp_microsoft_pla_browser_select_option`, `mcp_microsoft_pla_browser_hover`.
- Capture DOM & accessibility: `mcp_microsoft_pla_browser_snapshot` (include `boxes` optional) to inspect structure and roles.
- Capture visuals: `mcp_microsoft_pla_browser_take_screenshot` (fullPage when helpful).
- Collect console errors: `mcp_microsoft_pla_browser_console_messages level=error`.
- Inspect network: `mcp_microsoft_pla_browser_network_requests` (filter endpoints if needed) and inspect specific requests via `mcp_microsoft_pla_browser_network_request`.
- Run assertions: `mcp_microsoft_pla_browser_evaluate` with small JS checks (e.g., return !!document.querySelector('selector')).
- Save artifacts and reference them in the final summary.

Verification checklist (pass criteria)
- Expected DOM/text is present and correct.
- No new console errors at `error` level related to the change.
- Relevant network requests succeed (status < 400) where applicable.
- Visual changes match expectation (screenshot suffices for simple checks).
- Accessibility snapshot shows correct roles/labels for interactive elements.
- Unit or integration tests (if present) continue to pass.

Outputs (what to return)
- A concise plan and `manage_todo_list` updates showing progress.
- The exact patch applied (apply_patch diff or file list created/modified).
- Verification artifacts: screenshots, snapshots, console logs, network request details.
- Final summary with reproduction steps and suggested commit message.

Safety & constraints
- Keep edits minimal; prefer adding tests or small refactors over large rewrites.
- Do not publish secrets or credentials. If a dev server requires secrets, ask the user.
- For long-running dev servers or CI tasks, ask the user for permission first.

Example invocation
- User: "When viewing a wiki page, disable the Save button while a save is in progress and show a spinner next to it."
- Agent actions:
  1. Locate the Save button component or route.
  2. Update component to add `isSaving` state and spinner markup (apply_patch).
  3. Start dev server or use existing dev_url.
  4. Use Playwright MCP to navigate to the wiki page, click Save, assert the button is disabled and spinner is visible, capture screenshot and console messages.
  5. If checks pass, return the patch and artifacts.

How to iterate
- If an assertion fails, provide a one-paragraph diagnosis, propose a single targeted change, apply it, and re-run the Playwright MCP sequence.

When to ask for human input
- Missing target URL or which page to test.
- When starting a dev server would be disruptive or requires secrets.
- When multiple plausible files could be changed and autonomy would be risky.

Notes for prompt authors
- Keep the instructions specific about which Playwright MCP calls to use and what artifacts to collect.
- Encourage short, testable steps and frequent verification.

---

Created by: GitHub Copilot assistant prompt template
