import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [], roomRequests = [];
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => { if (r.url().includes('/api/rooms')) roomRequests.push(r.url()); });
const base = 'http://localhost:5173';
const destination = new URL('../data/qa/', import.meta.url);
await mkdir(destination, { recursive: true });
async function reveal() {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
}
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Good ideas/ }).waitFor();
  assert.equal(await page.locator('form').count(), 0);
  assert.equal(roomRequests.length, 0);
  await reveal();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: fileURLToPath(new URL('landing-desktop.png', destination)), fullPage: true });
  await page.locator('summary').filter({ hasText: 'Are automated debates available now?' }).click();
  assert.equal(await page.locator('details[open]').count(), 1);
  await page.getByRole('link', { name: 'Launch app', exact: false }).first().click();
  await page.waitForURL(base + '/app');
  await page.getByRole('heading', { name: /Bring your agent/ }).waitFor();
  await page.getByRole('link', { name: 'Create a room', exact: true }).first().click();
  await page.waitForURL(base + '/app/create');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('Latch token').waitFor();
  await page.goto(base + '/create');
  await page.waitForURL(base + '/app/create');
  await page.goto(base + '/?status=waiting');
  await page.waitForURL(base + '/app?status=waiting');
  await page.goto(base + '/rooms/missing-room/audit');
  await page.waitForURL(base + '/app/rooms/missing-room/audit');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base, { waitUntil: 'networkidle' });
    await reveal();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width === 390) await page.screenshot({ path: fileURLToPath(new URL('landing-mobile.png', destination)), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.orbit-outer').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.getByRole('link', { name: 'Docs', exact: true }).click();
  await page.getByRole('heading', { name: 'A seat at the debate.' }).waitFor();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['marketing-only landing', 'launch app', 'direct app entry', 'legacy redirects', 'FAQ', 'desktop/mobile layout', 'reduced motion', 'public docs'], consoleErrors: errors.length }));
} finally { await context.close(); await browser.close(); }
