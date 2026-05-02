import { test, expect } from '@playwright/test';

test('does not render adjacent duplicate content rows', async ({ page }) => {
	test.setTimeout(120000);
	await page.goto('/');
	await page.getByText('recent revisions loaded').first().waitFor({ timeout: 90000 });

	const result = await page.evaluate(() => {
		const rows = Array.from(document.querySelectorAll('.content-cell .block-html'));
		const texts = rows
			.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
			.filter(Boolean);

		let adjacentDupes = 0;
		const examples: Array<{ index: number; text: string }> = [];

		for (let i = 1; i < texts.length; i += 1) {
			if (texts[i] === texts[i - 1]) {
				adjacentDupes += 1;
				if (examples.length < 5) {
					examples.push({ index: i, text: texts[i].slice(0, 180) });
				}
			}
		}

		return {
			rowCount: texts.length,
			adjacentDupes,
			examples
		};
	});

	expect(
		result.adjacentDupes,
		`Found adjacent duplicate rows among ${result.rowCount} rows: ${JSON.stringify(result.examples)}`
	).toBe(0);
});
