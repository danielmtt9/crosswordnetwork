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
  tier: string | null;
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

const accessLevelColors = {
  free: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  premium: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
};

export default function PuzzlesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedAccess, setSelectedAccess] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [filters, setFilters] = useState<PuzzlesResponse["filters"]>({
    categories: [],
    difficulties: ["easy", "medium", "hard"],
    tiers: ["free", "premium"]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPuzzles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedDifficulty !== "all") params.append("difficulty", selectedDifficulty);
      if (selectedAccess !== "all") params.append("tier", selectedAccess);
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
  }, [searchTerm, selectedDifficulty, selectedAccess, selectedCategory]);

  // Get featured puzzles (top 3 by play count)
  const featuredPuzzles = puzzles
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
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

              <select
                value={selectedAccess}
                onChange={(e) => setSelectedAccess(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Access</option>
                {filters.tiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
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
                                  {puzzle.tier && (
                                    <Badge className={accessLevelColors[puzzle.tier as keyof typeof accessLevelColors]}>
                                      {puzzle.tier.charAt(0).toUpperCase() + puzzle.tier.slice(1)}
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
                              <Link href={`/puzzles/${puzzle.id}`}>
                                {puzzle.tier === "premium" ? (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Premium Puzzle
                                  </>
                                ) : (
                                  <>
                                    <Puzzle className="mr-2 h-4 w-4" />
                                    Start Puzzle
                                  </>
                                )}
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
                                {puzzle.tier && (
                                  <Badge className={accessLevelColors[puzzle.tier as keyof typeof accessLevelColors]}>
                                    {puzzle.tier.charAt(0).toUpperCase() + puzzle.tier.slice(1)}
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

                          <Button asChild className="w-full" variant={puzzle.tier === "premium" ? "outline" : "default"}>
                            <Link href={`/puzzles/${puzzle.id}`}>
                              {puzzle.tier === "premium" ? (
                                <>
                                  <Lock className="mr-2 h-4 w-4" />
                                  Premium Puzzle
                                </>
                              ) : (
                                <>
                                  <Puzzle className="mr-2 h-4 w-4" />
                                  Start Puzzle
                                </>
                              )}
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
