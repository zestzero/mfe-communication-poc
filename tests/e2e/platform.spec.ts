import { expect, test } from '@playwright/test';

test('server HTML includes the federated product before JavaScript runs', async ({ request }) => {
  const response = await request.get('/products');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('Cedar Pour-Over');
  expect(html).toContain('data-testid="mfe-product"');
  expect(html).toContain('data-testid="host-header"');
  expect(html).toContain('data-testid="debug-panel"');
});

test('concurrent SSR requests keep users and locales apart', async ({ request }) => {
  const [english, thai] = await Promise.all([
    request.get('/products', { headers: { cookie: 'platform_session=user-mara; platform_locale=en' } }),
    request.get('/products', { headers: { cookie: 'platform_session=user-somchai; platform_locale=th' } }),
  ]);
  const englishHtml = await english.text();
  const thaiHtml = await thai.text();
  expect(englishHtml).toContain('Mara Ellison');
  expect(englishHtml).toContain('Cedar Pour-Over');
  expect(englishHtml).not.toContain('สมชาย');
  expect(thaiHtml).toContain('สมชาย ใจดี');
  expect(thaiHtml).toContain('ดริปเปอร์ซีดาร์');
  expect(thaiHtml).not.toContain('Mara Ellison');
});

test('login, cart, language, navigation, refresh, and runtime identity', async ({ page }) => {
  const hydration: string[] = [];
  page.on('console', (message) => {
    if (message.text().toLowerCase().includes('hydration')) hydration.push(message.text());
  });
  await page.goto('/products', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('product-auth')).toContainText('Sign in');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('host-user')).toHaveText('Mara Ellison');
  await expect(page.getByTestId('product-auth')).toHaveText('Mara Ellison');
  const hostRuntime = (await page.getByTestId('runtime-id').innerText()).replace('Runtime ', '');
  const productRuntime = await page.getByTestId('mfe-product').getAttribute('data-runtime-id');
  expect(productRuntime).toBe(hostRuntime);

  await page.getByTestId('add-cedar-pour-over').click();
  await expect(page.getByTestId('host-cart-count')).toHaveText('1');
  await expect(page.getByTestId('debug-entry').filter({ hasText: 'cart.item.add.requested' })).toBeVisible();
  await page.getByTestId('go-cart').click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId('cart-line-cedar-pour-over')).toContainText('Cedar Pour-Over');
  await page.goBack();
  await expect(page.getByTestId('mfe-product')).toBeVisible();
  await page.getByTestId('add-cedar-pour-over').click();
  await expect(page.getByTestId('host-cart-count')).toHaveText('2');

  await page.getByTestId('language-select').selectOption('th');
  await expect(page.getByTestId('product-name-cedar-pour-over')).toHaveText('ดริปเปอร์ซีดาร์');
  await page.goto('/profile');
  await expect(page.getByTestId('profile-name')).toHaveText('Mara Ellison');
  await page.getByTestId('profile-language').click();
  await expect(page.getByTestId('debug-locale')).toHaveText('en');

  const cookies = await page.context().cookies();
  const cookie = cookies.map((item) => `${item.name}=${item.value}`).join('; ');
  const refreshed = await page.request.get('/products', { headers: { cookie } });
  const refreshedHtml = await refreshed.text();
  expect(refreshedHtml).toContain('Mara Ellison');
  expect(refreshedHtml).toContain('Cedar Pour-Over');

  await page.getByTestId('send-invalid').click();
  await expect(page.getByTestId('validation-entry').first()).toBeVisible();
  await page.getByTestId('profile-logout').click();
  await expect(page.getByTestId('auth-status')).toContainText('Signed out');
  await expect(page.getByTestId('host-cart-count')).toHaveText('0');
  expect(hydration).toEqual([]);
});

test('client navigation runs route loaders, history, and the auth guard', async ({ page }) => {
  await page.goto('/products', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('route-loader')).toHaveText('products');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('host-user')).toHaveText('Mara Ellison');
  const runtime = (await page.getByTestId('runtime-id').innerText()).replace('Runtime ', '');

  await page.getByTestId('nav-cart').click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId('route-loader')).toHaveText('cart');
  await expect(page.getByTestId('mfe-cart')).toBeVisible();
  await expect(page.getByTestId('runtime-id')).toContainText(runtime);

  await page.goBack();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByTestId('route-loader')).toHaveText('products');
  await expect(page.getByTestId('mfe-product')).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('route-loader')).toHaveText('cart');

  await page.getByTestId('nav-profile').click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByTestId('route-loader')).toHaveText('profile');
  await expect(page.getByTestId('mfe-profile')).toBeVisible();
  await expect(page.getByTestId('runtime-id')).toContainText(runtime);

  await page.getByTestId('profile-logout').click();
  await page.getByTestId('nav-cart').click();
  await expect(page).toHaveURL(/\/products\?notice=auth$/);
  await expect(page.getByTestId('auth-guard')).toBeVisible();
  await expect(page.getByTestId('mfe-product')).toBeVisible();
  await expect(page.getByTestId('mfe-cart')).toHaveCount(0);
});

test('a direct protected URL redirects anonymous visitors and still renders the cart when signed in', async ({ request }) => {
  const anonymous = await request.get('/cart');
  expect(anonymous.url()).toContain('/products?notice=auth');
  const anonymousHtml = await anonymous.text();
  expect(anonymousHtml).toContain('data-testid="auth-guard"');
  expect(anonymousHtml).toContain('Cedar Pour-Over');
  expect(anonymousHtml).not.toContain('data-testid="mfe-cart"');

  const signedIn = await request.get('/cart', { headers: { cookie: 'platform_session=user-mara' } });
  expect(signedIn.url()).toMatch(/\/cart$/);
  const signedInHtml = await signedIn.text();
  expect(signedInHtml).toContain('data-testid="route-loader"');
  expect(signedInHtml).toContain('>cart<');
  expect(signedInHtml).toContain('data-testid="mfe-cart"');
  expect(signedInHtml).toContain('The basket is empty.');
});

test('the host stays up when one remote is unavailable', async ({ page }) => {
  await page.route('**/127.0.0.1:3003/**', (route) => route.abort());
  await page.goto('/products', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('host-header')).toBeVisible();
  await expect(page.getByTestId('mfe-product')).toBeVisible();
});
