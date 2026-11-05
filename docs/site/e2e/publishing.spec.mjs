import { test, expect } from '@playwright/test';
test('curated production pages retain navigation, search and base-aware resources', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (new URL(r.url()).hostname === '127.0.0.1' && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'PuzlWerk documentation', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '2×2 solver reference', exact: true }).last().click();
  await expect(page).toHaveURL(/\/puzlwerk\/reference\/solver-2x2\/$/);
  await expect(page.getByRole('link', { name: 'Canonical source', exact: true })).toHaveAttribute('href', /github.com\/wstein\/puzlwerk\/blob\/main\//);
  await page.getByRole('button', { name: /Search/ }).click();
  await page.getByRole('textbox', { name: 'Search', exact: true }).fill('provenance');
  await expect(page.locator('.pagefind-ui__result-link').first()).toBeVisible();
  await expect(page.locator('.pagefind-ui__result-link').first()).toHaveAttribute('href', /\/puzlwerk\//);
  expect(errors).toEqual([]);
});
test('small viewport preserves a usable navigation menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./reference/solver-2x2/');
  await expect(page.getByRole('heading', { name: '2×2 solver reference', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Menu/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
