import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const destination = new URL('../data/qa/', import.meta.url);
await mkdir(destination, { recursive: true });
const base = 'http://localhost:5173';
try {
  await page.goto(base + '/app', { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Open seats/ }).click();
  assert.equal(new URL(page.url()).search, '?status=waiting');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('link', { name: /Open seats/ }).getAttribute('aria-current'), 'page');
  await page.getByRole('link', { name: /^Live/ }).click();
  assert.equal(new URL(page.url()).search, '?status=live');
  await page.goBack();
  await page.waitForURL('**/app?status=waiting');
  assert.equal(await page.getByRole('link', { name: /Open seats/ }).getAttribute('aria-current'), 'page');
  await page.goForward();
  await page.waitForURL('**/app?status=live');
  await page.getByRole('link', { name: /^Finished/ }).click();
  assert.equal(new URL(page.url()).search, '?status=closed');
  await page.getByRole('link', { name: /All rooms/ }).click();
  assert.equal(new URL(page.url()).search, '');
  await page.goto(base + '/app?status=unknown', { waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('link', { name: /All rooms/ }).getAttribute('aria-current'), 'page');
  await page.getByRole('link', { name: 'Docs', exact: true }).click();
  await page.getByRole('heading', { name: 'A seat at the debate.' }).waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('docs-desktop.png', destination)), fullPage: true });
  const sections = [
    ['rooms', 'Set the terms. Take a side.'],
    ['latch', 'Your access stays under your control.'],
    ['matches', 'The clock sets the limit.'],
    ['voting', 'Judge the argument.'],
    ['audit', 'Follow the record.']
  ];
  for (const [slug, title] of sections) {
    await page.goto(base + '/docs/' + slug, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.equal(await page.locator('nav[aria-label="Documentation"] a[aria-current="page"]').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Follow the record.' }).waitFor();
  await page.goto(base + '/docs/not-a-guide', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Guide not found.' }).waitFor();
  const response = await context.request.get(base + '/api/rooms');
  assert.equal(response.status(), 200);
  const { rooms } = await response.json();
  if (rooms.length) {
    for (const suffix of ['', '/audit', '/results', '/join']) {
      await page.goto(base + '/app/rooms/' + rooms[0].id + suffix, { waitUntil: 'domcontentloaded' });
      await page.getByText(rooms[0].topic, { exact: true }).first().waitFor();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/docs/latch', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Your access stays under your control.' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: fileURLToPath(new URL('docs-mobile.png', destination)), fullPage: true });
  await page.getByRole('link', { name: 'Launch app ↗', exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, docsPages: 6, consoleErrors: errors.length,
    checks: ['filter URLs', 'reload', 'back/forward', 'direct docs links', 'unknown guide', 'mobile layout'],
    populatedRoomRoutesChecked: rooms.length > 0 }));
} finally { await context.close(); await browser.close(); }
