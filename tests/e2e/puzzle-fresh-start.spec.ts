import { test, expect } from '@playwright/test';

test.describe('Start Puzzle (Fresh)', () => {
  test('Start Puzzle opens a clean slate even if there is existing local progress', async ({ page, request }) => {
    // Pick a puzzle ID (prefer the first available from API).
    let puzzleId = Number(process.env.PUZZLE_ID || '1');
    const res = await request.get('/api/puzzles?limit=1');
    if (res.ok()) {
      const data = await res.json();
      const firstId = data?.puzzles?.[0]?.id;
      if (typeof firstId === 'number') puzzleId = firstId;
    }

    // Get first across clue and its first cell.
    const cluesRes = await request.get(`/api/puzzles/${puzzleId}/clues`);
    expect(cluesRes.ok()).toBeTruthy();
    const cluesJson = await cluesRes.json();
    const clue = cluesJson?.clues?.across?.[0];
    expect(clue).toBeTruthy();
    expect(Array.isArray(clue.cells)).toBeTruthy();
    expect(clue.cells.length).toBeGreaterThan(0);

    // Create some guest progress via "Reveal Letter" hint (reliable in an iframe).
    await page.goto(`/puzzles/${puzzleId}`);
    const clueBtn = page.getByTestId(`clue-across-${clue.number}`);
    await expect(clueBtn).toBeVisible({ timeout: 60000 });
    await clueBtn.click();

    const frame = page.frameLocator('iframe').first();
    const frameBody = frame.locator('body');
    await expect(frameBody).toBeVisible({ timeout: 60000 });

    const hintsBtn = page.getByTestId('hints-menu');
    await expect(hintsBtn).toBeVisible({ timeout: 60000 });
    await hintsBtn.click();
    await page.getByRole('menuitem', { name: /reveal letter/i }).click();

    const clueCells: Array<{ row: number; col: number }> = clue.cells;
    await expect
      .poll(
        async () =>
          await frameBody.evaluate((_el, { cells }) => {
            const pad3 = (n: number) => String(n).padStart(3, '0');
            for (const c of cells) {
              const id = `c${pad3(c.col)}${pad3(c.row)}`;
              const el = document.getElementById(id);
              const txt = (el?.textContent || '').trim();
              if (txt) return { cellId: id, letter: txt };
            }
            return null;
          }, { cells: clueCells }),
        { timeout: 15000 }
      )
      .toBeTruthy();

    const revealedCell = await frameBody.evaluate((_el, { cells }) => {
      const pad3 = (n: number) => String(n).padStart(3, '0');
      for (const c of cells) {
        const id = `c${pad3(c.col)}${pad3(c.row)}`;
        const el = document.getElementById(id);
        const txt = (el?.textContent || '').trim();
        if (txt) return { cellId: id, letter: txt };
      }
      return null;
    }, { cells: clueCells });
    expect(revealedCell).toBeTruthy();

    // Save now to ensure localStorage contains the letter.
    const saveNow = page.getByRole('button', { name: /save now/i });
    await expect(saveNow.first()).toBeVisible({ timeout: 60000 });
    await saveNow.first().click();

    const key = `cw:progress:${puzzleId}:guest`;
    await expect
      .poll(async () => {
        return await page.evaluate(
          ({ k, cid }) => {
            const raw = window.localStorage.getItem(k);
            if (!raw) return null;
            try {
              const parsed = JSON.parse(raw);
              return parsed?.gridState?.[cid] ?? null;
            } catch {
              return null;
            }
          },
          { k: key, cid: (revealedCell as any).cellId }
        );
      }, { timeout: 8000 })
      .toBe((revealedCell as any).letter);

    // Now "Start Puzzle" fresh should wipe existing progress and load a clean grid.
    await page.goto(`/puzzles/${puzzleId}?fresh=1`);
    await expect(page.getByTestId(`clue-across-${clue.number}`)).toBeVisible({ timeout: 60000 });

    const frame2 = page.frameLocator('iframe').first();
    const cell2 = frame2.locator(`#${(revealedCell as any).cellId}`);
    await expect(cell2).toBeVisible({ timeout: 60000 });
    await expect.poll(async () => cell2.evaluate((el) => (el.textContent || '').trim()), { timeout: 20000 }).toBe('');

    // Local progress should exist again (fresh entry), but it must not contain the old letter.
    await expect
      .poll(async () => {
        return await page.evaluate(
          ({ k, cid }) => {
            const raw = window.localStorage.getItem(k);
            if (!raw) return null;
            try {
              const parsed = JSON.parse(raw);
              return parsed?.gridState?.[cid] ?? '';
            } catch {
              return null;
            }
          },
          { k: key, cid: (revealedCell as any).cellId }
        );
      }, { timeout: 8000 })
      .toBe('');
  });
});
