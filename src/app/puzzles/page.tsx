"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  Clock, 
  Star, 
  Lock,
  Users,
  Puzzle,
  Trophy,
  Zap,
  Loader2
} from "lucide-react";

interface PuzzleData {
  id: number;
  title: string;
  description: string | null;
  difficulty: string | null;
  category: string | null;
  play_count: number | null;
  completion_rate: number | null;
  estimated_solve_time: number | null;
  upload_date: string;
}

interface PuzzlesResponse {
  puzzles: PuzzleData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    categories: string[];
    difficulties: string[];
    tiers: string[];
  };
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

export default function PuzzlesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [storageScope, setStorageScope] = useState<string>('guest');
  const [continuePuzzles, setContinuePuzzles] = useState<Array<{
    puzzleId: number;
    title: string;
    difficulty: string | null;
    category: string | null;
    remainingMs: number;
    startedAt: string;
    lastPlayedAt: string | null;
    source: 'server' | 'local';
  }>>([]);
  const [continueLoading, setContinueLoading] = useState(false);
  const [filters, setFilters] = useState<PuzzlesResponse["filters"]>({
    categories: [],
    difficulties: ["easy", "medium", "hard"],
    tiers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Determine current user (if signed in) to scope "Continue Puzzle".
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return;
        const session = await res.json();
        const userId = session?.user?.id;
        if (!cancelled && typeof userId === 'string' && userId.length > 0) {
          setStorageScope(userId);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Guest-mode "Continue" uses localStorage written by the puzzle page.
    // If the explicit pointer is missing, scan for the most recently saved progress key.
    // Now: build a list of in-progress puzzles (server if signed-in, plus local fallback).
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const loadLocal = async () => {
      const localItems: Array<{
        puzzleId: number;
        title?: string;
        difficulty?: string | null;
        category?: string | null;
        startedAt: string;
        lastPlayedAt: string | null;
        remainingMs: number;
      }> = [];

      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (!key || !key.startsWith('cw:progress:')) continue;
          if (!key.endsWith(`:${storageScope}`)) continue;

          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.isCompleted === true) continue;
            const pid = typeof parsed?.puzzleId === 'number' ? parsed.puzzleId : parseInt(String(parsed?.puzzleId || ''), 10);
            if (Number.isNaN(pid)) continue;

            const startedAtRaw = String(parsed?.startedAt || parsed?.savedAt || '');
            const startedAtMs = Date.parse(startedAtRaw);
            if (!Number.isNaN(startedAtMs) && now - startedAtMs > SEVEN_DAYS_MS) {
              // Expired; remove to keep list clean.
              try { window.localStorage.removeItem(key); } catch {}
              continue;
            }

            const expiresAtMs = !Number.isNaN(startedAtMs) ? startedAtMs + SEVEN_DAYS_MS : now;
            const remainingMs = Math.max(0, expiresAtMs - now);

            localItems.push({
              puzzleId: pid,
              title: typeof parsed?.puzzleTitle === 'string' ? parsed.puzzleTitle : undefined,
              difficulty: parsed?.puzzleDifficulty ?? null,
              category: parsed?.puzzleCategory ?? null,
              startedAt: startedAtRaw || new Date().toISOString(),
              lastPlayedAt: typeof parsed?.savedAt === 'string' ? parsed.savedAt : null,
              remainingMs,
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      // Fill missing titles from API.
      const enriched = await Promise.all(
        localItems.map(async (it) => {
          if (it.title) return it;
          try {
            const res = await fetch(`/api/puzzles/${it.puzzleId}`);
            if (!res.ok) return it;
            const p = await res.json();
            return {
              ...it,
              title: p?.title || `Puzzle #${it.puzzleId}`,
              difficulty: p?.difficulty ?? it.difficulty ?? null,
              category: p?.category ?? it.category ?? null,
            };
          } catch {
            return it;
          }
        })
      );

      return enriched
        .filter((it) => it.remainingMs > 0)
        .map((it) => ({
          puzzleId: it.puzzleId,
          title: it.title || `Puzzle #${it.puzzleId}`,
          difficulty: it.difficulty ?? null,
          category: it.category ?? null,
          remainingMs: it.remainingMs,
          startedAt: it.startedAt,
          lastPlayedAt: it.lastPlayedAt,
          source: 'local' as const,
        }));
    };

    const loadServer = async () => {
      try {
        const res = await fetch('/api/puzzles/in-progress');
        if (!res.ok) return [];
        const data = await res.json();
        const rows = Array.isArray(data?.puzzles) ? data.puzzles : [];
        return rows.map((row: any) => ({
          puzzleId: row?.puzzle?.id,
          title: row?.puzzle?.title,
          difficulty: row?.puzzle?.difficulty ?? null,
          category: row?.puzzle?.category ?? null,
          remainingMs: row?.progress?.remainingMs ?? 0,
          startedAt: row?.progress?.startedAt,
          lastPlayedAt: row?.progress?.lastPlayedAt ?? null,
          source: 'server' as const,
        })).filter((r: any) => typeof r.puzzleId === 'number' && typeof r.title === 'string' && r.remainingMs > 0);
      } catch {
        return [];
      }
    };

    (async () => {
      setContinueLoading(true);
      const [server, local] = await Promise.all([loadServer(), loadLocal()]);
      const seen = new Set<number>();
      const merged = [...server, ...local].filter((it) => {
        if (seen.has(it.puzzleId)) return false;
        seen.add(it.puzzleId);
        return true;
      });
      merged.sort((a, b) => (b.lastPlayedAt || '').localeCompare(a.lastPlayedAt || '') || b.remainingMs - a.remainingMs);
      setContinuePuzzles(merged);
      setContinueLoading(false);
    })();
  }, [storageScope]);

  const discardContinuePuzzle = async (puzzleId: number, source: 'server' | 'local') => {
    try {
      if (source === 'server') {
        await fetch(`/api/puzzles/in-progress/${puzzleId}`, { method: 'DELETE' });
      } else {
        window.localStorage.removeItem(`cw:progress:${puzzleId}:${storageScope}`);
      }
    } catch {
      // ignore
    } finally {
      setContinuePuzzles((prev) => prev.filter((p) => p.puzzleId !== puzzleId));
    }
  };

  const formatRemaining = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const fetchPuzzles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedDifficulty !== "all") params.append("difficulty", selectedDifficulty);
      if (selectedCategory !== "all") params.append("category", selectedCategory);

      const response = await fetch(`/api/puzzles?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch puzzles");
      
      const data: PuzzlesResponse = await response.json();
      setPuzzles(data.puzzles);
      setFilters(data.filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch puzzles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPuzzles();
  }, [searchTerm, selectedDifficulty, selectedCategory]);

  // Get featured puzzles (top 3 by play count)
  const featuredPuzzles = puzzles
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      {/* Header */}
      <section className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Puzzle Gallery
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover crosswords for every mood and skill level. From quick coffee breaks to deep dives.
            </p>

            {(continueLoading || continuePuzzles.length > 0) && (
              <div className="pt-4">
                <div className="mx-auto max-w-3xl rounded-2xl border bg-card/40 backdrop-blur-xl p-4 text-left">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <h2 className="text-base font-semibold">Continue Puzzles</h2>
                      <span className="text-xs text-muted-foreground">(7-day limit)</span>
                    </div>
                    {continueLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </div>
                    )}
                  </div>

                  {continuePuzzles.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {continuePuzzles.slice(0, 6).map((p) => (
                        <div key={p.puzzleId} className="rounded-xl border bg-background/50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{p.title}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {p.difficulty && <span className="rounded bg-muted px-2 py-0.5">{p.difficulty}</span>}
                                {p.category && <span className="rounded bg-muted px-2 py-0.5">{p.category}</span>}
                                <span className="rounded bg-muted px-2 py-0.5">{formatRemaining(p.remainingMs)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button asChild size="sm">
                                <Link href={`/puzzles/${p.puzzleId}`}>Continue</Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => discardContinuePuzzle(p.puzzleId, p.source)}
                              >
                                Discard
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !continueLoading && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        No in-progress puzzles found.
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search puzzles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                {filters.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Difficulties</option>
                {filters.difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Puzzles */}
      <section className="py-12">
        <div className="container mx-auto max-w-7xl px-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading puzzles...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchPuzzles}>Try Again</Button>
            </div>
          ) : (
            <>
              {featuredPuzzles.length > 0 && (
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500" />
                    Featured Puzzles
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {featuredPuzzles.map((puzzle, index) => (
                      <motion.div
                        key={puzzle.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                      >
                        <Card className="h-full bg-card/70 backdrop-blur-xl ring-1 ring-border hover:shadow-lg transition-all duration-300 group">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                                  {puzzle.title}
                                </CardTitle>
                                <div className="flex gap-2">
                                  {puzzle.difficulty && (
                                    <Badge className={difficultyColors[puzzle.difficulty as keyof typeof difficultyColors]}>
                                      {puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Star className="h-5 w-5 text-yellow-500 fill-current" />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <CardDescription className="text-base">
                              {puzzle.description || "No description available."}
                            </CardDescription>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {puzzle.estimated_solve_time ? `${puzzle.estimated_solve_time} min` : "N/A"}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {puzzle.play_count?.toLocaleString() || 0}
                              </div>
                              {puzzle.completion_rate && (
                                <div className="flex items-center gap-1">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  {Number(puzzle.completion_rate).toFixed(1)}%
                                </div>
                              )}
                            </div>

                            {puzzle.category && (
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  {puzzle.category}
                                </Badge>
                              </div>
                            )}

                            <Button asChild className="w-full">
                              <Link href={`/puzzles/${puzzle.id}?fresh=1`}>
                                <Puzzle className="mr-2 h-4 w-4" />
                                Start Puzzle
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* All Puzzles */}
          {!loading && !error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Puzzle className="h-6 w-6 text-primary" />
                All Puzzles ({puzzles.length})
              </h2>
              
              {puzzles.length === 0 ? (
                <div className="text-center py-12">
                  <Puzzle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No puzzles found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {puzzles.map((puzzle, index) => (
                    <motion.div
                      key={puzzle.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 + index * 0.05 }}
                    >
                      <Card className="h-full bg-card/70 backdrop-blur-xl ring-1 ring-border hover:shadow-lg transition-all duration-300 group">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {puzzle.title}
                              </CardTitle>
                              <div className="flex gap-2">
                                {puzzle.difficulty && (
                                  <Badge className={difficultyColors[puzzle.difficulty as keyof typeof difficultyColors]}>
                                    {puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CardDescription>
                            {puzzle.description || "No description available."}
                          </CardDescription>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {puzzle.estimated_solve_time ? `${puzzle.estimated_solve_time} min` : "N/A"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {puzzle.play_count?.toLocaleString() || 0}
                            </div>
                            {puzzle.completion_rate && (
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                {Number(puzzle.completion_rate).toFixed(1)}%
                              </div>
                            )}
                          </div>

                          {puzzle.category && (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {puzzle.category}
                              </Badge>
                            </div>
                          )}

                          <Button asChild className="w-full" variant="default">
                            <Link href={`/puzzles/${puzzle.id}?fresh=1`}>
                              <Puzzle className="mr-2 h-4 w-4" />
                              Start Puzzle
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
