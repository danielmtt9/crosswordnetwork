"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Flame, 
  Star, 
  Target, 
  Clock,
  Award,
  Zap,
  Heart,
  Coffee,
  Users
} from "lucide-react";

interface GamificationPreviewProps {
  userStreak?: number;
  recentAchievements?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: string;
    rarity: "common" | "rare" | "epic" | "legendary";
  }>;
  leaderboardData?: Array<{
    rank: number;
    name: string;
    score: number;
    avatar?: string;
  }>;
  lockedAchievements?: Array<{
    id: string;
    name: string;
    description: string;
    progress: number;
    maxProgress: number;
  }>;
}

export default function GamificationPreview({
  userStreak = 7,
  recentAchievements = [],
  leaderboardData = [],
  lockedAchievements = []
}: GamificationPreviewProps) {
  const [currentAchievement, setCurrentAchievement] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Mock data if none provided
  const displayAchievements = recentAchievements.length > 0 ? recentAchievements : [
    {
      id: "streak-master",
      name: "Streak Master",
      description: "Solved puzzles for 7 days in a row",
      icon: "flame",
      unlockedAt: "2 hours ago",
      rarity: "rare" as const
    },
    {
      id: "focused-solver",
      name: "Focused Solver",
      description: "Completed 5 puzzles",
      icon: "star",
      unlockedAt: "1 day ago",
      rarity: "common" as const
    },
    {
      id: "speed-demon",
      name: "Speed Demon",
      description: "Solved a puzzle in under 5 minutes",
      icon: "zap",
      unlockedAt: "3 days ago",
      rarity: "epic" as const
    }
  ];

  const displayLeaderboard = leaderboardData.length > 0 ? leaderboardData : [
    { rank: 1, name: "Sarah M.", score: 2847, avatar: undefined },
    { rank: 2, name: "Alex K.", score: 2653, avatar: undefined },
    { rank: 3, name: "You", score: 2431, avatar: undefined },
    { rank: 4, name: "Mike R.", score: 2198, avatar: undefined },
    { rank: 5, name: "Emma L.", score: 2056, avatar: undefined }
  ];

  const displayLockedAchievements = lockedAchievements.length > 0 ? lockedAchievements : [
    {
      id: "puzzle-master",
      name: "Puzzle Master",
      description: "Solve 100 puzzles",
      progress: 47,
      maxProgress: 100
    },
    {
      id: "night-owl",
      name: "Night Owl",
      description: "Solve puzzles after 10 PM",
      progress: 0,
      maxProgress: 1
    },
    {
      id: "perfectionist",
      name: "Perfectionist",
      description: "Complete 10 puzzles without hints",
      progress: 3,
      maxProgress: 10
    }
  ];

  // Rotate through achievements
  useEffect(() => {
    if (displayAchievements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAchievement((prev) => (prev + 1) % displayAchievements.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [displayAchievements.length]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
      case "rare": return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
      case "epic": return "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300";
      case "legendary": return "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300";
      default: return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "flame": return <Flame className="h-5 w-5" />;
      case "zap": return <Zap className="h-5 w-5" />;
      case "trophy": return <Trophy className="h-5 w-5" />;
      case "star": return <Star className="h-5 w-5" />;
      case "target": return <Target className="h-5 w-5" />;
      case "award": return <Award className="h-5 w-5" />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  if (!isVisible) return null;

  return (
    <section className="py-16 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/10">
      <div className="container mx-auto max-w-7xl px-4">
        <motion.div 
          className="text-center space-y-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your cozy crossword journey
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Celebrate your progress, unlock achievements, and keep building your momentum.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* User Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 backdrop-blur-xl ring-1 ring-amber-200/50 dark:ring-amber-800/50">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
                  <Flame className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-foreground">Current Streak</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  {userStreak} days
                </div>
                <p className="text-muted-foreground mb-4">
                  Keep the momentum going! You're on fire! 🔥
                </p>
                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                  <Heart className="mr-1 h-3 w-3" />
                  Cozy vibes
                </Badge>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <Card className="h-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 backdrop-blur-xl ring-1 ring-blue-200/50 dark:ring-blue-800/50">
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-blue-500" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentAchievement}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {displayAchievements.slice(0, 3).map((achievement, index) => (
                      <div
                        key={achievement.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                          index === currentAchievement 
                            ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-200 dark:ring-blue-800' 
                            : 'bg-white/50 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${getRarityColor(achievement.rarity)}`}>
                          {getIcon(achievement.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{achievement.name}</div>
                          <div className="text-sm text-muted-foreground">{achievement.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">{achievement.unlockedAt}</div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Leaderboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Card className="h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 backdrop-blur-xl ring-1 ring-purple-200/50 dark:ring-purple-800/50">
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center">
                  <Users className="mr-2 h-5 w-5 text-purple-500" />
                  Top Solvers Tonight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displayLeaderboard.slice(0, 5).map((player, index) => (
                    <motion.div
                      key={player.rank}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors duration-200"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        player.rank === 1 ? 'bg-amber-500 text-white' :
                        player.rank === 2 ? 'bg-gray-400 text-white' :
                        player.rank === 3 ? 'bg-orange-500 text-white' :
                        'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                      }`}>
                        {player.rank}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{player.name}</div>
                        <div className="text-sm text-muted-foreground">{player.score} points</div>
                      </div>
                      {player.rank <= 3 && (
                        <Trophy className="h-4 w-4 text-amber-500" />
                      )}
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Coffee className="h-4 w-4" />
                    <span>Friendly competition</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Locked Achievements Preview */}
        {displayLockedAchievements.length > 0 && (
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 backdrop-blur-xl ring-1 ring-gray-200/50 dark:ring-gray-800/50">
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center">
                  <Target className="mr-2 h-5 w-5 text-gray-500" />
                  Coming Up Next
                </CardTitle>
                <p className="text-muted-foreground">Achievements you're working towards</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {displayLockedAchievements.slice(0, 3).map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center opacity-50">
                          <Star className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground opacity-75">{achievement.name}</div>
                          <div className="text-sm text-muted-foreground">{achievement.description}</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {achievement.progress}/{achievement.maxProgress}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
}
