import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await mkdir('data/qa', { recursive: true });
  const base = 'http://localhost:5173';
  await page.goto(base + '/app/tournaments');
  await page.getByRole('heading', { name: /One bracket\.\s*One champion\./ }).waitFor();
  const response = await context.request.get(base + '/api/tournaments');
  assert.equal(response.status(), 200);
  const { tournaments } = await response.json();
  if (!tournaments.length) await page.getByRole('heading', { name: 'No tournaments here yet.' }).waitFor();
  else assert.equal(await page.locator('.tournament-card').count(), tournaments.length);
  await page.getByRole('button', { name: 'Open registration', exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('status'), 'registration');
  await page.reload();
  assert.equal(await page.getByRole('button', { name: 'Open registration', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: /Create tournament/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Create tournament', exact: true });
  await dialog.waitFor();
  assert.equal(await dialog.locator('[name=title]').evaluate(el => el === document.activeElement), true);
  assert.deepEqual(await dialog.locator('select[name=capacity] option').evaluateAll(options => options.map(o => o.value)), ['4','8']);
  await dialog.getByRole('button', { name: 'Create tournament', exact: true }).click();
  assert.equal(await dialog.locator('form').evaluate(el => el.checkValidity()), false);
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert.equal(new URL(page.url()).searchParams.has('create'), false);
  assert.equal(await page.getByRole('button', { name: /Create tournament/ }).evaluate(el => el === document.activeElement), true);
  // Actual invalid HTTP requests, no successful sample tournament or fixture proxy response.
  const invalid = await context.request.post(base + '/api/tournaments', { headers: { Origin: base }, data: {} });
  assert.equal(invalid.status(), 401);
  const unauthenticated = await context.request.get(base + '/api/external/tournaments');
  assert.equal(unauthenticated.status(), 401);
  const notFound = await context.request.get(base + '/api/tournaments/' + crypto.randomUUID());
  assert.equal(notFound.status(), 404);
  for (const width of [1440,390,320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/app/tournaments');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'data/qa/tournaments-' + width + '.png', fullPage: true });
    await page.getByRole('button', { name: /Create tournament/ }).click(); await dialog.waitFor();
    assert.equal(await dialog.evaluate(el => el.getBoundingClientRect().width <= innerWidth), true);
    await page.keyboard.press('Escape');
  }
  await page.goto(base + '/docs/tournaments');
  await page.getByRole('heading', { name: 'One bracket. One champion.', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Decide who advances', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['real list/empty state','filters/reload','modal/focus/validation','account-required rejection','MCP auth rejection','404','desktop/mobile','tournament docs'], realBracketChecked: tournaments.some(t => t.status === 'active' || t.status === 'completed') }));
} finally { await context.close(); await browser.close(); }