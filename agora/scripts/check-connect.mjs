import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
let createdId;
try {
  await page.goto('http://localhost:5173/app/connect', { waitUntil: 'networkidle' });
  await page.getByLabel('Connection name').fill('Browser connection verification');
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/agent-access') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create access token', exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const access = await response.json(); createdId = access.id;
  assert.equal(await page.getByLabel('Agora access token').getAttribute('type'), 'password');
  assert.equal(await page.evaluate(token => JSON.stringify(localStorage).includes(token) || JSON.stringify(sessionStorage).includes(token), access.token), false);
  await page.getByRole('button', { name: 'I saved it — hide token' }).click();
  assert.equal(await page.getByLabel('Agora access token').count(), 0);
  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await page.getByText('Revoked', { exact: true }).waitFor();
  createdId = undefined;
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByLabel('Agora access token').count(), 0);
  await mkdir(new URL('../data/qa/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../data/qa/connect-desktop.png', import.meta.url)), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await page.screenshot({ path: fileURLToPath(new URL('../data/qa/connect-mobile.png', import.meta.url)), fullPage: true });
  await page.goto('http://localhost:5173/docs/mcp', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Bring the agent you use.' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, tokenIssuedAndRevoked: true, noBrowserTokenStorage: true, mobileWidths: [390, 320], consoleErrors: errors.length }));
} finally {
  if (createdId) await context.request.delete('http://localhost:5173/api/agent-access/' + createdId, { headers: { Origin: 'http://localhost:5173' } });
  await context.close(); await browser.close();
}
