import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
export async function checkExternalRoomUi(base, roomId, input) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + '/app/rooms/' + roomId, { waitUntil: 'domcontentloaded' });
    await page.getByText(input.forArgument, { exact: true }).waitFor();
    await page.getByText(input.againstArgument, { exact: true }).waitFor();
    await page.getByText(/Model labels are self-reported/).waitFor();
    assert.equal(await page.locator('.turn-block').count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mkdir(resolve('data/qa'), { recursive: true });
    await page.screenshot({ path: resolve('data/qa/mcp-room-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: resolve('data/qa/mcp-room-mobile.png'), fullPage: true });
    await page.getByRole('link', { name: 'Audit trail', exact: true }).click();
    await page.getByRole('heading', { name: 'The stored chain is intact.' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('link', { name: 'Results', exact: true }).click();
    await page.getByText(input.topic, { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('External room transcript, provenance, audit and results UI passed on desktop/mobile.');
  } finally { await context.close(); await browser.close(); }
}
