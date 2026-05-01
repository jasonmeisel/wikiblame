import { test, expect } from '@playwright/test';

test('assigned revision for first block matches earliest revision that contains it (should fail)', async ({
	page,
	request
}) => {
	await page.goto('http://localhost:5174/');
	await page.locator('.blame-grid').waitFor({ timeout: 20000 });

	// determine the page title and language from the meta links
	const pageLink = await page.locator('.meta a').nth(0).getAttribute('href');
	const langLink = await page.locator('.meta a').nth(1).getAttribute('href');
	if (!pageLink || !langLink) throw new Error('Could not find page/meta links');

	const title = decodeURIComponent(pageLink.split('/wiki/').pop() || '');
	const lang = new URL(langLink).hostname.split('.')[0] || 'en';

	// fetch recent revisions for the page (same API the app uses)
	const revApi = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=revisions&titles=${encodeURIComponent(
		title
	)}&rvprop=ids|timestamp|user|comment&rvlimit=10&rvdir=newer`;

	type WikiRevision = { revid: number; timestamp?: string; user?: string; comment?: string };
	const revRes = await request.get(revApi);
	const revJson = (await revRes.json()) as { query?: { pages?: Record<string, unknown> } };
	const pages = revJson.query?.pages ?? {};
	const pageObj = Object.values(pages)[0] as Record<string, unknown> | undefined;
	const revisions = Array.isArray(pageObj?.revisions) ? (pageObj.revisions as WikiRevision[]) : [];
	expect(revisions.length).toBeGreaterThan(0);

	// fetch the HTML for each revision and find the earliest revision that contains the snippet
	const revisionHtmls = await Promise.all(
		revisions.map(async (rev: WikiRevision) => {
			const r = await request.get(
				`https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}/${rev.revid}`
			);
			const html = r.ok() ? await r.text() : '';
			// strip tags and scripts to get comparable text content
			const textOnly = html
				.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
				.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
				.toLowerCase();
			return { id: rev.revid, text: textOnly };
		})
	);

	// iterate blocks and compare attribution against earliest matching revision
	const blocks = page.locator('.content-cell .block-html');
	const blockCount = await blocks.count();
	const mismatches: Array<{ index: number; assignedOldid: number | null; earliestRevId: number }> =
		[];

	for (let i = 0; i < blockCount; i++) {
		const text = (await blocks.nth(i).innerText())
			.slice(0, 200)
			.replace(/\s+/g, ' ')
			.trim()
			.toLowerCase();

		const earliestIndexForBlock = revisionHtmls.findIndex((rh) => rh.text.includes(text));
		if (earliestIndexForBlock < 0) continue; // not present in the recent revisions we fetched

		// find the corresponding blame anchor for this block (blame-cell and content-cell are paired)
		const blameCell = page.locator('.blame-cell').nth(i);
		const anchorsCount = await blameCell.locator('a').count();
		if (anchorsCount === 0) continue; // unknown revision

		const href = await blameCell.locator('a').first().getAttribute('href');
		const m = href ? href.match(/oldid=(\d+)/) : null;
		const assigned = m ? Number(m[1]) : null;
		const expected = revisionHtmls[earliestIndexForBlock].id;

		if (assigned !== expected) {
			mismatches.push({ index: i, assignedOldid: assigned, earliestRevId: expected });
			break; // stop on first mismatch to speed up test
		}
	}

	// Log the first mismatch (if any) so test output shows assigned vs expected
	if (mismatches.length > 0) console.log('blame-mismatch', JSON.stringify(mismatches[0]));
	// The implementation currently mis-assigns blame; this assertion should report mismatches.
	expect(mismatches.length).toBe(0);
});

test('load next 50 revisions when clicking the button', async ({ page }) => {
	await page.goto('http://localhost:5174/');
	const loadMoreButton = page.getByRole('button', { name: 'Load next 50 revisions' });
	await loadMoreButton.waitFor({ timeout: 30000 });
	await expect(loadMoreButton).toBeVisible();
	await loadMoreButton.click();
	await expect(page.locator('.meta')).toContainText('100 recent revisions');
});
