---
name: fix-check-and-lint
description: 'Use this prompt to run `bun run check` and `bun run lint`, fix any compiler, Svelte, or lint issues, and report the exact Bun commands used.'
---

When you receive this prompt, perform the following steps:

1. Run `bun run check` in the workspace root.
2. Run `bun run lint` in the workspace root.
3. Review all reported issues and fix them directly in the code.
4. Prefer file APIs (createFile), Bun commands, and PowerShell-compatible paths and syntax.
5. After applying fixes, rerun `bun run check` and `bun run lint` until they both succeed or until no further auto-fix is possible.

If any issues cannot be auto-fixed, clearly list the remaining errors and explain what manual changes are still needed.

Example invocation:

- "Fix all problems found by `bun run check` and `bun run lint` in this repository."
- "Run the repo checks and resolve any TypeScript, Svelte, or ESLint failures."
