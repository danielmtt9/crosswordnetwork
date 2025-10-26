"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  Trophy, 
  Clock, 
  Puzzle, 
  Star,
  TrendingUp,
  Calendar,
  Target,
  Zap,
  Crown,
  ArrowRight,
  Edit,
  Share2
} from "lucide-react";
import { useSession } from "next-auth/react";

// Empty state components
const EmptyState = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="p-4 rounded-full bg-muted mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-sm">{description}</p>
  </div>
);

const difficultyColors = {
  EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const rarityColors = {
  common: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  rare: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  epic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  legendary: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<{
    user: {
      id: string;
      name: string | null;
      email: string | null;
      role: string;
      subscriptionStatus: string;
      joinDate: string;
      avatar: string | null;
    } | null;
    stats: {
      puzzlesCompleted: number;
      totalTimeSpent: string | null;
      currentStreak: number;
      longestStreak: number;
      hintsUsed: number;
      averageRating: number | null;
      rank: number | null;
    } | null;
    recentPuzzles: Array<{
      id: number;
      title: string;
      completedAt: string | null;
      timeSpent: string | null;
      rating: number | null;
      difficulty: string;
    }>;
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      rarity: string;
      earnedAt: string;
    }>;
  }>({ user: null, stats: null, recentPuzzles: [], achievements: [] });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const data = await res.json();
        if (isMounted) setApiData(data);
      } catch (e) {
        if (isMounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  // Compose view model from API with safe fallbacks
  const user = apiData.user ? {
    name: apiData.user.name || session?.user?.name || "User",
    email: apiData.user.email || session?.user?.email || "",
    role: apiData.user.role || (session as any)?.role || "FREE",
    subscriptionStatus: apiData.user.subscriptionStatus || (session as any)?.subscriptionStatus || "TRIAL",
    trialEndsAt: (session as any)?.trialEndsAt || null,
    joinDate: apiData.user.joinDate,
    avatar: apiData.user.avatar || session?.user?.image || null,
    stats: apiData.stats || {
      puzzlesCompleted: 0,
      totalTimeSpent: "0h 0m",
      currentStreak: 0,
      longestStreak: 0,
      hintsUsed: 0,
      averageRating: null,
      rank: null,
    },
    recentPuzzles: apiData.recentPuzzles || [],
    achievements: apiData.achievements || [],
  } : (session ? {
    name: session.user?.name || "User",
    email: session.user?.email || "",
    role: (session as any)?.role || "FREE",
    subscriptionStatus: (session as any)?.subscriptionStatus || "TRIAL",
    trialEndsAt: (session as any)?.trialEndsAt || null,
    joinDate: new Date().toISOString(),
    avatar: session.user?.image || null,
    stats: {
      puzzlesCompleted: 0,
      totalTimeSpent: "0h 0m",
      currentStreak: 0,
      longestStreak: 0,
      hintsUsed: 0,
      averageRating: null,
      rank: null,
    },
    recentPuzzles: [],
    achievements: [],
  } : {
    name: "User",
    email: "",
    role: "FREE",
    subscriptionStatus: "TRIAL",
    trialEndsAt: null,
    joinDate: new Date().toISOString(),
    avatar: null,
    stats: {
      puzzlesCompleted: 0,
      totalTimeSpent: "0h 0m",
      currentStreak: 0,
      longestStreak: 0,
      hintsUsed: 0,
      averageRating: null,
      rank: null,
    },
    recentPuzzles: [],
    achievements: [],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user.name}!</h1>
                <p className="text-muted-foreground">{loading ? 'Loading your dashboard…' : (error ? 'Some data may be unavailable' : "Here's your crossword journey so far")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={user.role === "PREMIUM" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}>
                <Crown className="mr-1 h-3 w-3" />
                {user.role === "PREMIUM" ? "Premium" : "Free"}
              </Badge>
              {user.subscriptionStatus === "TRIAL" && user.trialEndsAt && (
                <Badge variant="outline" className="text-xs">
                  Trial ends {new Date(user.trialEndsAt).toLocaleDateString()}
                </Badge>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Stats Overview */}
        <section className="mb-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Puzzle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{user.stats.puzzlesCompleted}</p>
                      <p className="text-sm text-muted-foreground">Puzzles Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{user.stats.totalTimeSpent}</p>
                      <p className="text-sm text-muted-foreground">Time Spent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                      <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{user.stats.currentStreak}</p>
                      <p className="text-sm text-muted-foreground">Day Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                      <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">#{user.stats.rank}</p>
                      <p className="text-sm text-muted-foreground">Global Rank</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Puzzles */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Puzzles
                    </CardTitle>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/puzzles">
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {user.recentPuzzles.length > 0 ? (
                    <div className="space-y-4">
                      {user.recentPuzzles.map((puzzle, index) => (
                        <motion.div
                          key={puzzle.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Puzzle className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{puzzle.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{puzzle.completedAt ? formatDate(puzzle.completedAt) : 'In Progress'}</span>
                                {puzzle.timeSpent && (
                                  <>
                                    <span>•</span>
                                    <span>{puzzle.timeSpent}</span>
                                  </>
                                )}
                                <Badge className={difficultyColors[puzzle.difficulty as keyof typeof difficultyColors]}>
                                  {puzzle.difficulty}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {puzzle.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium">{puzzle.rating}</span>
                              </div>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/puzzles/${puzzle.id}`}>
                                <Share2 className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Puzzle}
                      title="No puzzles yet"
                      description="Start your crossword journey by exploring our puzzle collection."
                    />
                  )}
                </CardContent>
              </Card>
            </motion.section>

            {/* Achievements */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.achievements.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {user.achievements.map((achievement, index) => (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                          className="flex items-center gap-4 p-4 rounded-lg border"
                        >
                          <div className="p-3 rounded-full bg-muted">
                            <Trophy className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{achievement.name}</h4>
                              <Badge className={rarityColors[achievement.rarity as keyof typeof rarityColors]}>
                                {achievement.rarity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Earned {formatDate(achievement.earnedAt)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Trophy}
                      title="No achievements yet"
                      description="Complete puzzles and reach milestones to unlock achievements."
                    />
                  )}
                </CardContent>
              </Card>
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/puzzles">
                      <Puzzle className="mr-2 h-4 w-4" />
                      Browse Puzzles
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/multiplayer/new">
                      <Share2 className="mr-2 h-4 w-4" />
                      Start Room
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/multiplayer/join">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Join Room
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Progress Goals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Puzzles Goal</span>
                      <span>12/20</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Streak Goal</span>
                      <span>12/30</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Subscription Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Premium Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Badge className="bg-primary text-primary-foreground mb-2">
                      Active
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Next billing: Feb 15, 2024
                    </p>
                  </div>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
