import { test, expect } from '@playwright/test';

const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

test('renders every source article block text from the original page HTML', async ({ page }) => {
	test.setTimeout(120000);
	await page.goto('/');

	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			await page.waitForFunction(
				() => document.querySelectorAll('.content-cell .block-html').length > 0,
				undefined,
				{ timeout: 30000 }
			);
			break;
		} catch (error) {
			if (attempt === 2) throw error;
			await page.getByRole('button', { name: 'Load article' }).click();
		}
	}

	const coverage = await page.evaluate(() => {
		const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
		const sourceLineSelector =
			'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, dd, dt, figcaption, th, td';

		const rendered = Array.from(document.querySelectorAll('.content-cell .block-html'))
			.map((el) => normalize(el.textContent || ''))
			.filter(Boolean);

		return fetch('https://en.wikipedia.org/api/rest_v1/page/html/Svelte')
			.then((res) => res.text())
			.then((html) => {
				const parser = new DOMParser();
				const doc = parser.parseFromString(html, 'text/html');
				const root = doc.querySelector('.mw-parser-output') ?? doc.body;
				const expected = Array.from(root.querySelectorAll(sourceLineSelector))
					.map((el) => normalize(el.textContent || ''))
					.filter(Boolean);

				const missing = expected.filter(
					(line) => !rendered.some((renderedLine) => renderedLine.includes(line))
				);

				return {
					expectedCount: expected.length,
					renderedCount: rendered.length,
					missingCount: missing.length,
					missingExamples: missing.slice(0, 5)
				};
			});
	});

	expect(
		coverage.missingCount,
		`Missing ${coverage.missingCount} source lines. Examples: ${JSON.stringify(coverage.missingExamples)}`
	).toBe(0);

	// Keep a simple sanity check in Node context for normalized behavior parity.
	expect(normalizeText('  A\n\tB  ')).toBe('a b');
});
