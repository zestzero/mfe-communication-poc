import { expect, test } from '@playwright/test';

test('streams the host shell before the browser runs the remotes', async ({ request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('Northwind Atelier');
  expect(html).toContain('data-testid="host-header"');
  expect(html).toContain('Mara Ellison');
  expect(html).toContain('data-testid="debug-panel"');
  expect(
    html.includes('Cedar Pour-Over') || html.includes('Loading the product atelier'),
  ).toBeTruthy();
});

test('product, cart, and profile share one basket, one viewer, and the debug log', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('host-header')).toBeVisible();
  await expect(page.getByTestId('mfe-product')).toBeVisible();
  await expect(page.getByTestId('mfe-cart')).toBeVisible();
  await expect(page.getByTestId('mfe-profile')).toBeVisible();
  await expect(page.getByTestId('debug-panel')).toBeVisible();
  await expect(page.getByTestId('host-user')).toHaveText('Mara Ellison');
  await expect(page.getByTestId('host-cart-count')).toHaveText('0');
  await expect(page.getByTestId('cart-empty')).toBeVisible();

  await page.getByTestId('add-cedar-pour-over').click();
  await expect(page.getByTestId('cart-line-cedar-pour-over')).toContainText('Cedar Pour-Over');
  await expect(page.getByTestId('host-cart-count')).toHaveText('1');
  await expect(page.getByTestId('debug-entry').filter({ hasText: 'cart.item.added' })).toBeVisible();
  await expect(page.getByTestId('mitt-count')).toHaveText('Mitt deliveries: 1');

  await page.getByTestId('select-linen-apron').click();
  await expect(page.getByTestId('profile-viewing')).toHaveText('Looking at Linen Apron');
  await expect(page.getByTestId('debug-entry').filter({ hasText: 'catalog.product.selected' })).toBeVisible();

  await page.getByTestId('switch-user').click();
  await expect(page.getByTestId('host-user')).toHaveText('Julian Cho');
  await expect(page.getByTestId('profile-name')).toHaveText('Julian Cho');
  await expect(page.getByTestId('cart-line-cedar-pour-over')).toBeVisible();

  await page.getByTestId('remove-cedar-pour-over').click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('host-cart-count')).toHaveText('0');
});
