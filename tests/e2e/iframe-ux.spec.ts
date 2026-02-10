import { test, expect } from '@playwright/test';

test.describe('Iframe UX', () => {
  test('classic default loads (no premium theme injection)', async ({ page, request }) => {
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

    const frame = page.frameLocator('iframe').first();
    const body = frame.locator('body');
    await expect(body).toBeVisible({ timeout: 60000 });

    // Premium theme tag should not exist by default.
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          return !!document.getElementById('crossword-theme-styles');
        });
      }, { timeout: 15000 })
      .toBe(false);

    // Highlight styles should still be present (site UX layer).
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          return !!document.getElementById('crossword-highlight-styles');
        });
      }, { timeout: 15000 })
      .toBe(true);
  });

  test('theme + override CSS are layered (no clobber)', async ({ page, request }) => {
    // Pick a puzzle ID (prefer the first available from API).
    let puzzleId = Number(process.env.PUZZLE_ID || '1');
    const res = await request.get('/api/puzzles?limit=1');
    if (res.ok()) {
      const data = await res.json();
      const firstId = data?.puzzles?.[0]?.id;
      if (typeof firstId === 'number') puzzleId = firstId;
    }

    await page.goto(`/puzzles/${puzzleId}?ecw=premium`);
    await expect(page.getByTestId('theme-toggle')).toBeVisible({ timeout: 60000 });

    const frame = page.frameLocator('iframe').first();
    const body = frame.locator('body');
    await expect(body).toBeVisible({ timeout: 60000 });

    // Ensure both style tags exist in the iframe.
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const hasTheme = !!document.getElementById('crossword-theme-styles');
          const hasOverrides = !!document.getElementById('crossword-overrides-styles');
          return hasTheme && hasOverrides;
        });
      }, { timeout: 15000 })
      .toBe(true);

    // Readability: cell background should differ from page background in premium mode.
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const cell = document.querySelector('.ecw-box') as HTMLElement | null;
          if (!cell) return false;
          const bodyBg = getComputedStyle(document.body).backgroundColor;
          const cellBg = getComputedStyle(cell).backgroundColor;
          return bodyBg !== cellBg;
        });
      }, { timeout: 15000 })
      .toBe(true);
  });

  test('ECW uses crisp sizing (no transform scaling wrapper)', async ({ page, request }) => {
    let puzzleId = Number(process.env.PUZZLE_ID || '1');
    const res = await request.get('/api/puzzles?limit=1');
    if (res.ok()) {
      const data = await res.json();
      const firstId = data?.puzzles?.[0]?.id;
      if (typeof firstId === 'number') puzzleId = firstId;
    }

    await page.goto(`/puzzles/${puzzleId}?ecw=premium`);
    await expect(page.getByTestId('theme-toggle')).toBeVisible({ timeout: 60000 });

    // Wrapper should not be scaled for ECW.
    const wrapper = page.getByTestId('puzzle-iframe-wrapper');
    await expect(wrapper).toBeVisible({ timeout: 60000 });
    await expect(wrapper).toHaveCSS('transform', /none/);

    // Iframe root should have ECW sizing variables set.
    const frame = page.frameLocator('iframe').first();
    const body = frame.locator('body');
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const v = getComputedStyle(document.documentElement).getPropertyValue('--ecw-cell-size').trim();
          return v;
        });
      }, { timeout: 15000 })
      .toMatch(/px$/);

    // Ensure the crossword table is not in a stretched "block" mode.
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const t = document.getElementById('crossword');
          if (!t) return '';
          return getComputedStyle(t).display;
        });
      }, { timeout: 15000 })
      .toMatch(/table/);

    // Cells should remain square-ish (no stretching).
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const cell = document.querySelector('.ecw-box') as HTMLElement | null;
          if (!cell) return 0;
          const r = cell.getBoundingClientRect();
          if (!r.width || !r.height) return 0;
          return r.width / r.height;
        });
      }, { timeout: 15000 })
      .toBeGreaterThanOrEqual(0.97);
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const cell = document.querySelector('.ecw-box') as HTMLElement | null;
          if (!cell) return 999;
          const r = cell.getBoundingClientRect();
          if (!r.width || !r.height) return 999;
          return r.width / r.height;
        });
      }, { timeout: 15000 })
      .toBeLessThanOrEqual(1.03);
  });

  test('mobile solver has a clues drawer', async ({ page, request }) => {
    let puzzleId = Number(process.env.PUZZLE_ID || '1');
    const res = await request.get('/api/puzzles?limit=1');
    if (res.ok()) {
      const data = await res.json();
      const firstId = data?.puzzles?.[0]?.id;
      if (typeof firstId === 'number') puzzleId = firstId;
    }

    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12-ish
    await page.goto(`/puzzles/${puzzleId}?ecw=premium`);
    await expect(page.getByTestId('mobile-solver')).toBeVisible({ timeout: 60000 });

    // Cells should remain square-ish on mobile too.
    const frame = page.frameLocator('iframe').first();
    const body = frame.locator('body');
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const cell = document.querySelector('.ecw-box') as HTMLElement | null;
          if (!cell) return 0;
          const r = cell.getBoundingClientRect();
          if (!r.width || !r.height) return 0;
          return r.width / r.height;
        });
      }, { timeout: 15000 })
      .toBeGreaterThanOrEqual(0.97);
    await expect
      .poll(async () => {
        return await body.evaluate(() => {
          const cell = document.querySelector('.ecw-box') as HTMLElement | null;
          if (!cell) return 999;
          const r = cell.getBoundingClientRect();
          if (!r.width || !r.height) return 999;
          return r.width / r.height;
        });
      }, { timeout: 15000 })
      .toBeLessThanOrEqual(1.03);

    const openClues = page.getByTestId('open-clues');
    await expect(openClues).toBeVisible();
    await openClues.click();

    // Drawer should show Across tab trigger.
    await expect(page.getByRole('tab', { name: /across/i })).toBeVisible({ timeout: 15000 });
  });
});
