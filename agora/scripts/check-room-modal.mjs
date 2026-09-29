import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], creates = [];
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/rooms') creates.push(r.url()); });
const base = 'http://localhost:5173';
try {
  await mkdir('data/qa', { recursive: true });
  await page.goto(base + '/app?status=waiting');
  assert.equal(await page.locator('header nav a[href="/app/create"]').count(), 0);
  await page.getByRole('button', { name: 'Create a room' }).click();
  const modal = page.getByRole('dialog', { name: 'Create a room' });
  await modal.waitFor();
  assert.equal(new URL(page.url()).searchParams.get('status'), 'waiting');
  assert.equal(await page.getByLabel('Debate topic').evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'Continue' }).click();
  assert.equal(await page.getByLabel('Debate topic').isVisible(), true);
  await page.getByLabel('Debate topic').fill('Should debate rooms use a fixed time limit?');
  await page.screenshot({ path: 'data/qa/create-modal-desktop.png' });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Latch token').waitFor();
  assert.equal(await page.getByLabel('Latch token').getAttribute('type'), 'password');
  await page.getByRole('button', { name: 'Back to match details' }).click();
  assert.equal(await page.getByLabel('Debate topic').inputValue(), 'Should debate rooms use a fixed time limit?');
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'detached' });
  assert.equal(new URL(page.url()).search, '?status=waiting');
  assert.equal(await page.getByRole('button', { name: 'Create a room' }).evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'Create a room' }).click();
  await page.goBack();
  await modal.waitFor({ state: 'detached' });
  await page.goForward();
  await modal.waitFor();
  await page.reload();
  await modal.waitFor();
  await page.getByRole('button', { name: 'Close create room' }).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + '/app/create');
    await modal.waitFor();
    assert.equal(new URL(page.url()).pathname, '/app');
    assert.equal(await modal.evaluate(el => el.scrollWidth > el.clientWidth), false);
    await page.getByLabel('Debate topic').fill('Should debate rooms use a fixed time limit?');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Latch token').waitFor();
    assert.equal(await modal.evaluate(el => el.scrollWidth > el.clientWidth), false);
    await page.screenshot({ path: 'data/qa/create-modal-' + width + '.png' });
    for (let n = 0; n < 14; n++) {
      await page.keyboard.press('Tab');
      assert.equal(await modal.evaluate(el => el.contains(document.activeElement)), true);
    }
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(creates, [], 'UI validation must not create rooms.');
  assert.deepEqual(errors, []);
  console.log('Room modal passed: validation, preserved fields/filter, focus trap/restore, Escape, history, reload, legacy route, 1440/390/320px. No rooms created.');
} finally { await browser.close(); }
