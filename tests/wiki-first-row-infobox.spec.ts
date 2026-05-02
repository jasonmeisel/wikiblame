import { test, expect } from '@playwright/test';

test('keeps the lead infobox/logo block as first rendered row', async ({ page }) => {
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

	const first = await page.evaluate(() => {
		const firstBlock = document.querySelector('.content-cell .block-html');
		const firstElement = firstBlock?.firstElementChild as HTMLElement | null;
		const firstImg = firstBlock?.querySelector('img');
		const width = Number(firstImg?.getAttribute('width') || 0);
		const height = Number(firstImg?.getAttribute('height') || 0);

		return {
			tag: firstElement?.tagName || null,
			text: (firstBlock?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
			imgWidth: width,
			imgHeight: height
		};
	});

	expect(first.tag, `Unexpected first block: ${JSON.stringify(first)}`).toBe('TABLE');
	expect(
		first.imgWidth >= 50 || first.imgHeight >= 50,
		`Expected lead logo-sized image in first block: ${JSON.stringify(first)}`
	).toBe(true);
});
