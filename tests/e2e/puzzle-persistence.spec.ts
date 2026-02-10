import { test, expect } from '@playwright/test';

test.describe('Puzzle Persistence', () => {
  test('filled letters persist after refresh (guest local fallback)', async ({ page, request }) => {
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

    await page.goto(`/puzzles/${puzzleId}`);

    // Select clue.
    const clueBtn = page.getByTestId(`clue-across-${clue.number}`);
    await expect(clueBtn).toBeVisible({ timeout: 60000 });
    await clueBtn.click();
    await expect(clueBtn).toHaveAttribute('aria-pressed', 'true');

    // Use "Reveal Letter" hint (more reliable than keyboard input in an iframe).
    const hintsBtn = page.getByTestId('hints-menu');
    await expect(hintsBtn).toBeVisible({ timeout: 60000 });
    await hintsBtn.click();
    await page.getByRole('menuitem', { name: /reveal letter/i }).click();

    const frame = page.frameLocator('iframe').first();
    const frameBody = frame.locator('body');
    await expect(frameBody).toBeVisible({ timeout: 60000 });

    // Find which cell was revealed (first non-empty cell among the clue cells).
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

    // The poll above returns truthy, but we need the value.
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

    // Give autosave/local fallback a moment to write.
    // Prefer explicit save to avoid timing flakiness.
    const saveNow = page.getByRole('button', { name: /save now/i });
    if (await saveNow.count()) {
      await saveNow.first().click();
      await page.waitForTimeout(500);
    } else {
      await page.waitForTimeout(1500);
    }

    // Assert localStorage has the saved progress for guest scope.
    const key = `cw:progress:${puzzleId}:guest`;
    await expect
      .poll(async () => {
        return await page.evaluate((k) => window.localStorage.getItem(k), key);
      }, { timeout: 5000 })
      .not.toBeNull();

    // Ensure the saved payload includes the revealed letter.
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

    // Refresh and confirm the letter is still present.
    await page.reload();
    await expect(page.getByTestId(`clue-across-${clue.number}`)).toBeVisible({ timeout: 60000 });

    const frame2 = page.frameLocator('iframe').first();
    const cell2 = frame2.locator(`#${(revealedCell as any).cellId}`);
    await expect(cell2).toBeVisible({ timeout: 60000 });
    await expect
      .poll(async () => cell2.evaluate((el) => (el.textContent || '').trim()), { timeout: 20000 })
      .toBe((revealedCell as any).letter);
  });
});
