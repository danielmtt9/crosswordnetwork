import { test as base, type Page } from '@playwright/test';

/**
 * Auth fixture for Playwright E2E tests.
 * Provides authenticated page using test user credentials.
 *
 * Test users (run npm run db:seed-test-users first):
 * - free@test.com / Test123!
 * - premium@test.com / Test123!
 *
 * Note: Puzzle pages (/puzzles, /puzzles/[id]) are excluded from auth middleware
 * and are publicly accessible. Use authenticatedPage for protected routes.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/signin');
    await page.getByPlaceholder('Email').fill('free@test.com');
    await page.getByPlaceholder('Password').fill('Test123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
    await use(page);
  },
});

export { expect } from '@playwright/test';
