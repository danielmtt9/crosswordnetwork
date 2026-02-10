import { test, expect } from '@playwright/test';

function consentCookieValue(preferencesAccepted: boolean) {
  const v = {
    v: 1,
    updatedAt: new Date().toISOString(),
    preferencesAccepted,
  };
  return encodeURIComponent(JSON.stringify(v));
}

test.describe('Help + Legal + Cookies', () => {
  test('cookie banner appears and can accept preferences', async ({ page, context }) => {
    await page.goto('/');
    const banner = page.getByTestId('cookie-banner');
    await expect(banner).toBeVisible({ timeout: 60000 });
    await page.getByTestId('cookie-accept').click();
    await expect(banner).toHaveCount(0);

    const cookies = await context.cookies();
    const consent = cookies.find((c) => c.name === 'cw_cookie_consent');
    expect(consent?.value).toBeTruthy();
  });

  test('footer links navigate to help/contact/faq and legal pages', async ({ page, context }) => {
    // Pre-set consent so the banner doesn't cover the footer.
    await context.addCookies([
      {
        name: 'cw_cookie_consent',
        value: consentCookieValue(false),
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();

    await page.getByRole('link', { name: 'Help Center' }).click();
    await expect(page.getByTestId('doc-title')).toContainText('Help Center');

    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'FAQ' }).click();
    await expect(page.getByTestId('doc-title')).toContainText('FAQ');

    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Contact Us' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact Us');

    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Terms of Service' }).click();
    await expect(page.getByTestId('doc-title')).toContainText('Terms of Service');

    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page.getByTestId('doc-title')).toContainText('Privacy Policy');

    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Cookie Policy' }).click();
    await expect(page.getByTestId('doc-title')).toContainText('Cookie Policy');
  });

  test('contact form validates and submits (mocked)', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'cw_cookie_consent',
        value: consentCookieValue(false),
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact Us');

    await page.getByTestId('contact-submit').click();
    await expect(page.getByText(/please fill in email, subject, and message/i)).toBeVisible();

    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByTestId('contact-email').fill('player@example.com');
    await page.getByTestId('contact-subject').fill('Progress not saving');
    await page.getByTestId('contact-message').fill('My progress resets after refresh on puzzle 1.');
    await page.getByTestId('contact-submit').click();

    await expect(page.getByText(/message sent/i)).toBeVisible();
  });
});

