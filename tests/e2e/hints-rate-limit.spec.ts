import { test, expect } from '@playwright/test';

const PUZZLE_ID = process.env.PUZZLE_ID || '1';

test.describe('Hint Rate Limits', () => {
  test('blocks Reveal Word after 2 uses per hour (UI shows limit message)', async ({ page }) => {
    // Mock the limiter endpoint so this test is deterministic and doesn't depend on DB state.
    let wordCalls = 0;
    await page.route('**/api/hints/use', async (route) => {
      const req = route.request();
      const raw = req.postData() || '{}';
      let body: any = {};
      try {
        body = JSON.parse(raw);
      } catch {}

      if (body.hintType === 'word') {
        wordCalls += 1;
        if (wordCalls >= 3) {
          await route.fulfill({
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '1800' },
            body: JSON.stringify({ error: 'Reveal Word limit reached', retryAfterSeconds: 1800 }),
          });
          return;
        }
      }

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, remaining: 0, limit: 2, windowSeconds: 3600 }),
      });
    });

    // Navigate to a puzzle page.
    const res = await page.goto('/api/puzzles?limit=1');
    if (res?.ok) {
      const data = await res.json();
      const firstId = data.puzzles?.[0]?.id;
      await page.goto(firstId ? `/puzzles/${firstId}` : `/puzzles/${PUZZLE_ID}`);
    } else {
      await page.goto(`/puzzles/${PUZZLE_ID}`);
    }

    // Wait for clue list and select the first across clue.
    await page.waitForSelector('[data-testid^="clue-across-"]', { timeout: 120000 });
    await page.locator('[data-testid^="clue-across-"]').first().click();

    const hintsBtn = page.getByTestId('hints-menu');

    // Use Reveal Word twice (allowed), then a third time (blocked).
    for (let i = 0; i < 3; i++) {
      await hintsBtn.click();
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await menu.getByText('Reveal Word').click();
    }

    // Expect a visible limit message.
    await expect(page.getByText(/reveal word limit reached/i)).toBeVisible();
  });
});

