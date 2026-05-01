import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';

test('debug: load root and log meta', async ({ page }) => {
  await page.goto('http://localhost:5174/');

  // wait for the meta section that appears after the article loads
  await page.locator('.meta').waitFor({ timeout: 15000 });

  const metaText = await page.locator('.meta').innerText();
  console.log('META_TEXT_START');
  console.log(metaText);
  console.log('META_TEXT_END');

  // also log the first content block text
  const firstContent = await page.locator('.content-cell .block-html').first().innerText();
  console.log('FIRST_BLOCK_START');
  console.log(firstContent.slice(0, 400));
  console.log('FIRST_BLOCK_END');

  const outputDir = path.resolve('test-results');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'test-wikiblame-root.png'), clip: { x: 0, y: 0, width: 1280, height: 800 } });
});
