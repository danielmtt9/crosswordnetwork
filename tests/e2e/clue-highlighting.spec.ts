import { test, expect } from '@playwright/test';

function pad3(n: number): string {
  if (n < 10) return `00${n}`;
  if (n < 100) return `0${n}`;
  return String(n);
}

test.describe('Clue Highlighting', () => {
  test('clicking a clue highlights the clue row and its cells in the iframe', async ({ page, request }) => {
    // Pick a puzzle ID (prefer the first available from API).
    let puzzleId = Number(process.env.PUZZLE_ID || '1');
    try {
      const res = await request.get(`/api/puzzles?limit=1`);
      if (res.ok()) {
        const data = await res.json();
        const firstId = data?.puzzles?.[0]?.id;
        if (typeof firstId === 'number') puzzleId = firstId;
      }
    } catch {
      // ignore, fallback to env/default
    }

    // Fetch clues so we can validate the exact cells for a known clue.
    const cluesRes = await request.get(`/api/puzzles/${puzzleId}/clues`);
    expect(cluesRes.ok()).toBeTruthy();
    const cluesJson = await cluesRes.json();
    const across = cluesJson?.clues?.across || [];
    expect(Array.isArray(across)).toBeTruthy();
    expect(across.length).toBeGreaterThan(0);

    const clue = across[0];
    expect(typeof clue.number).toBe('number');
    expect(Array.isArray(clue.cells)).toBeTruthy();
    expect(clue.cells.length).toBeGreaterThan(0);

    await page.goto(`/puzzles/${puzzleId}`);

    const clueBtn = page.getByTestId(`clue-across-${clue.number}`);
    await expect(clueBtn).toBeVisible({ timeout: 60000 });
    await clueBtn.click();

    // Clue row highlight (left panel).
    await expect(clueBtn).toHaveAttribute('aria-pressed', 'true');
    // Cozy amber selection glow.
    await expect(clueBtn).toHaveCSS('box-shadow', /rgba\(217,\s*119,\s*6/i);

    // Grid highlight (iframe): check at least one cell from the clue is highlighted.
    const firstCell = clue.cells[0];
    const cellId = `c${pad3(firstCell.col)}${pad3(firstCell.row)}`;

    const frame = page.frameLocator('iframe').first();
    const cell = frame.locator(`#${cellId}`);
    await expect(cell).toBeVisible({ timeout: 60000 });

    await expect
      .poll(
        async () =>
          cell.evaluate((el) => {
            const cs = window.getComputedStyle(el as HTMLElement);
            const shadow = (cs.boxShadow || '').toLowerCase();
            const bg = (cs.backgroundColor || '').toLowerCase();
            const hasDataset =
              typeof (el as HTMLElement).dataset.cwOrigShadow !== 'undefined' ||
              typeof (el as HTMLElement).dataset.cwOrigBg !== 'undefined';

            // Highlight is considered "on" if we see a box-shadow, a non-transparent bg,
            // or our ECW fallback data attributes.
            const highlighted =
              hasDataset ||
              (shadow !== '' && shadow !== 'none') ||
              (bg !== '' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent');

            return highlighted;
          }),
        { timeout: 5000 }
      )
      .toBe(true);

    // Move mouse away from clues panel; the selected clue highlight should remain pinned.
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);
    await expect(clueBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
