'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';

type ClueCell = { row: number; col: number };
type Clue = { number: number; text: string; cells?: ClueCell[] };

export interface NativeCrosswordRendererProps {
  puzzleId: number;
}

/**
 * NativeCrosswordRenderer (hybrid groundwork)
 *
 * This is intentionally minimal scaffolding behind a feature flag.
 * The iframe remains the primary solver until the native renderer reaches parity.
 */
export function NativeCrosswordRenderer({ puzzleId }: NativeCrosswordRendererProps) {
  const [loading, setLoading] = useState(true);
  const [across, setAcross] = useState<Clue[]>([]);
  const [down, setDown] = useState<Clue[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/puzzles/${puzzleId}/clues`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAcross(Array.isArray(data?.clues?.across) ? data.clues.across : []);
        setDown(Array.isArray(data?.clues?.down) ? data.clues.down : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [puzzleId]);

  const stats = useMemo(() => {
    const cells = new Set<string>();
    for (const c of [...across, ...down]) {
      for (const cell of c.cells || []) cells.add(`${cell.row},${cell.col}`);
    }
    return { across: across.length, down: down.length, uniqueCells: cells.size };
  }, [across, down]);

  return (
    <Card className="w-full rounded-2xl p-4">
      <div className="text-sm text-muted-foreground">
        Native renderer is under construction (hybrid rollout).
      </div>
      <div className="mt-2 text-sm">
        {loading ? 'Loading clue data…' : `Loaded clues: ${stats.across} across, ${stats.down} down (${stats.uniqueCells} unique cells).`}
      </div>
    </Card>
  );
}

