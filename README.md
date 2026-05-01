# Wikiblame

Wikiblame is a client-side SvelteKit app that loads any Wikipedia article and renders it in a "blame view" similar to a code editor's git blame.

The result is a normal-looking Wikipedia article with an extra left-hand column. Each line or logical row is annotated with the date it was introduced, the revision link, and hover text showing the editing username and edit summary.

## What this app does

- Accepts a Wikipedia article title or URL
- Fetches the article content from Wikipedia's public APIs
- Parses and sanitizes the rendered HTML client-side
- Computes a line-level blame mapping using revision metadata and diffing heuristics
- Renders the article with a prepended blame gutter
- Links blame dates back to the exact Wikipedia revision
- Shows username + comment/log on hover

## Why this app exists

Wikiblame makes historical attribution visible at a fine-grained level. It helps users inspect which revision introduced a given sentence, paragraph, or line in a Wikipedia page, without leaving the article view.

## Current status

This repository currently contains a minimal SvelteKit starter app. The planned enhancement is to replace the starter content in `src/routes/+page.svelte` with the Wikiblame UI and logic.

## Architecture

- `SvelteKit` powers the client-side app shell
- The app is fully client-side and does not require a custom backend
- Article HTML is retrieved from Wikipedia using browser `fetch`
- A browser DOM parser is used to preserve article structure
- `DOMPurify` or equivalent sanitization should be used before rendering
- Revision blame is derived by comparing page revisions and mapping line content to edits

## Recommended libraries and packages

The hardest parts are:

1. Fetching and rendering Wikipedia/MediaWiki content safely
2. Attributing each rendered line to a revision

Recommended libraries:

- `dompurify`
  - sanitize Wikipedia HTML before inserting it into the page
  - prevents script injection and unsafe markup
- `diff-match-patch` or `jsdiff`
  - compute diffs between revision versions
  - map text/line changes to revision metadata
- `@wikimedia/mediawiki-parser` or a similar MediaWiki parser
  - optional when working with wikitext instead of rendered HTML
  - useful for tokenizing article content and line-level attribution
- `htmlparser2` / built-in `DOMParser`
  - parse HTML into a document structure for manipulation

## API approach

This project should use Wikipedia's public APIs, such as:

- `https://en.wikipedia.org/api/rest_v1/page/html/{title}`
- `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles={title}&rvprop=ids|timestamp|user|comment|content`
- `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles={title}&rvdiffto=prev`

Because the app is client-side, the implementation must rely on CORS-friendly endpoints and browser-safe fetch requests.

## Getting started

```bash
npm install
npm run dev
```

Open the app in your browser at `http://localhost:5173`.

## Full TODO list

1. Replace the starter page with Wikiblame UI and article input form
2. Implement client-side article fetching from Wikipedia REST or MediaWiki APIs
3. Parse and sanitize fetched HTML before rendering
4. Render the article with a two-column blame layout
5. Build a revision metadata loader for page history, authors, timestamps, and comments
6. Implement a line-level diff and blame attribution algorithm
7. Link each blame entry to the corresponding Wikipedia revision URL
8. Add hover tooltips showing author and edit summary
9. Handle article redirects, non-existent pages, and disambiguation pages
10. Add loading states, error handling, and rate-limit/backoff logic
11. Support mobile and responsive layout for the blame column
12. Add tests for API data handling and blame mapping
13. Improve UX by preserving Wikipedia styles and page layout where possible

## Notes

- Exact line-level blame is inherently approximate when rendering HTML, because line breaks in the browser depend on layout. A practical implementation may map blame at the text-block or sentence level instead of strict visual lines.
- The app should prioritize readability, safety, and correct revision linking over perfect line-wrapping accuracy.
