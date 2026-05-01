# Wikiblame

[![Deploy to GitHub Pages](https://github.com/jasonmeisel/wikiblame/actions/workflows/deploy.yml/badge.svg)](https://github.com/jasonmeisel/wikiblame/actions/workflows/deploy.yml)

Live here: https://whatisjason.com/wikiblame/

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

## Architecture

- `SvelteKit` powers the client-side app shell
- The app is fully client-side and does not require a custom backend
- Article HTML is retrieved from Wikipedia using browser `fetch`
- A browser DOM parser is used to preserve article structure
- `DOMPurify` or equivalent sanitization should be used before rendering
- Revision blame is derived by comparing page revisions and mapping line content to edits
