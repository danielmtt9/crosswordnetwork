import { test, expect } from '@playwright/test';

test.describe('Saving', () => {
  test('Save Now persists even when there are no pending changes (guest local)', async ({ page, request }) => {
    // Pick a puzzle ID (prefer the first available from API).
    let puzzleId = Number(process.env.PUZZLE_ID || '1');
    const res = await request.get('/api/puzzles?limit=1');
    if (res.ok()) {
      const data = await res.json();
      const firstId = data?.puzzles?.[0]?.id;
      if (typeof firstId === 'number') puzzleId = firstId;
    }

    await page.goto(`/puzzles/${puzzleId}`);
    await expect(page.getByTestId('theme-toggle')).toBeVisible({ timeout: 60000 });

    // First click should create the local progress entry already.
    const key = `cw:progress:${puzzleId}:guest`;
    await expect.poll(async () => page.evaluate((k) => window.localStorage.getItem(k), key), { timeout: 8000 }).not.toBeNull();

    const before = await page.evaluate((k) => {
      const raw = window.localStorage.getItem(k);
      if (!raw) return null;
      try { return JSON.parse(raw)?.savedAt ?? null; } catch { return null; }
    }, key);

    const saveNow = page.getByRole('button', { name: /save now/i }).first();
    await expect(saveNow).toBeVisible({ timeout: 60000 });
    await saveNow.click();

    await expect
      .poll(async () => {
        return await page.evaluate((k) => {
          const raw = window.localStorage.getItem(k);
          if (!raw) return null;
          try { return JSON.parse(raw)?.savedAt ?? null; } catch { return null; }
        }, key);
      }, { timeout: 8000 })
      .not.toBe(before);
  });
});

