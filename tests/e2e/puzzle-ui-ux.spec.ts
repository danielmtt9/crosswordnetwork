import { test, expect } from '@playwright/test';

// Puzzle page is publicly accessible (excluded from auth middleware)
const PUZZLE_ID = process.env.PUZZLE_ID || '1';

test.describe('Puzzle UI/UX', () => {
  let firstPuzzle: { id?: number; title?: string; description?: string | null } | null = null;

  test.beforeEach(async ({ page }) => {
    // Navigate to puzzles list and click first puzzle, or go directly if we have ID
    const res = await page.goto('/api/puzzles?limit=1');
    if (res?.ok) {
      const data = await res.json();
      firstPuzzle = data.puzzles?.[0] || null;
      const firstId = firstPuzzle?.id;
      if (firstId) {
        await page.goto(`/puzzles/${firstId}`);
      } else {
        await page.goto(`/puzzles/${PUZZLE_ID}`);
      }
    } else {
      await page.goto(`/puzzles/${PUZZLE_ID}`);
    }
    // Wait for puzzle UI to become interactive.
    // In dev mode, first compile can take a while; be generous, but do not
    // silently continue if the page is still stuck on "Loading puzzle...".
    await page.waitForSelector('[data-testid="theme-toggle"]', { timeout: 120000 });
    await page.waitForSelector('[data-testid^="clue-across-"]', { timeout: 120000 });
  });

  test('title is shown, and description is shown when present', async ({ page }) => {
    // Title should always be visible in the header.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const hasDescription =
      typeof firstPuzzle?.description === 'string' && firstPuzzle.description.trim().length > 0;

    if (hasDescription) {
      await expect(page.getByTestId('puzzle-description')).toBeVisible();
      // Avoid strict full-text match to reduce flake; just confirm it contains part of the description.
      await expect(page.getByTestId('puzzle-description')).toContainText(
        firstPuzzle!.description!.trim().slice(0, 12)
      );
    } else {
      await expect(page.getByTestId('puzzle-description')).toHaveCount(0);
    }
  });

  test('timer display is visible', async ({ page }) => {
    const timer = page.getByTestId('timer-display');
    await expect(timer).toBeVisible();
    await expect(timer).toContainText(/\d+:\d{2}/);
  });

  test('keyboard shortcuts modal opens on ? key', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Keyboard Shortcuts');
    await expect(page.getByRole('dialog')).toContainText('Enter');
    await expect(page.getByRole('dialog')).toContainText('Escape');
    await expect(page.getByRole('dialog')).toContainText('Backspace');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('keyboard shortcuts modal opens from help button', async ({ page }) => {
    await page.getByTestId('keyboard-shortcuts-btn').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Keyboard Shortcuts');
  });

  test('theme toggle is present and clickable', async ({ page }) => {
    const toggle = page.getByTestId('theme-toggle');
    await expect(toggle).toBeVisible();
    const html = page.locator('html');
    const beforeClass = await html.getAttribute('class');
    await toggle.click();
    await page.waitForTimeout(300);
    const afterClass = await html.getAttribute('class');
    expect(beforeClass !== afterClass || beforeClass === null).toBeTruthy();
  });

  test('clue list is visible and clickable', async ({ page }) => {
    const firstClue = page.locator('[data-testid^="clue-across-"]').first();
    await expect(firstClue).toBeVisible({ timeout: 5000 });
    await firstClue.click();
    await expect(firstClue).toBeVisible();
  });

  test('clue navigation arrows exist when clue selected', async ({ page }) => {
    const firstClue = page.locator('[data-testid^="clue-across-"]').first();
    await expect(firstClue).toBeVisible({ timeout: 5000 });
    await firstClue.click();
    await expect(page.getByTestId('clue-prev')).toBeVisible();
    await expect(page.getByTestId('clue-next')).toBeVisible();
  });

  test('hints menu opens and shows options', async ({ page }) => {
    const hintsBtn = page.getByTestId('hints-menu');
    await expect(hintsBtn).toBeVisible();
    await hintsBtn.click();
    const menu = page.getByRole('menu');
    await expect(menu.getByText('Reveal Letter')).toBeVisible({ timeout: 3000 });
    await expect(menu.getByText('Reveal Word')).toBeVisible();
    await expect(menu.getByText('Check Puzzle')).toBeVisible();
  });

  test('progress bar is visible', async ({ page }) => {
    const progress = page.getByRole('progressbar');
    await expect(progress.first()).toBeVisible({ timeout: 5000 });
  });

  test('grid iframe loads', async ({ page }) => {
    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
