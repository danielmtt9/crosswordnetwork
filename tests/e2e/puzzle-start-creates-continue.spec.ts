import { test, expect } from '@playwright/test';

test.describe('Continue List', () => {
  test('opening a puzzle creates an in-progress entry (guest local)', async ({ page, request }) => {
    // Pick a puzzle ID (prefer the first available from API).
    let puzzleId = Number(process.env.PUZZLE_ID || '1');
    const res = await request.get('/api/puzzles?limit=1');
    if (res.ok()) {
      const data = await res.json();
      const firstId = data?.puzzles?.[0]?.id;
      if (typeof firstId === 'number') puzzleId = firstId;
    }

    await page.goto(`/puzzles/${puzzleId}`);

    // Wait for clue list to appear so we know the page got past "Loading puzzle...".
    await expect(page.locator('[data-testid^="clue-across-"]').first()).toBeVisible({ timeout: 60000 });

    const key = `cw:progress:${puzzleId}:guest`;
    await expect
      .poll(async () => page.evaluate((k) => window.localStorage.getItem(k), key), { timeout: 8000 })
      .not.toBeNull();
  });
});

