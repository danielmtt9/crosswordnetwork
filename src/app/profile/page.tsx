"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Puzzle,
  Trophy,
  Clock,
  Star,
  Share2,
  Loader2,
} from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  bio?: string;
  joinedAt: string;
  avatar?: string;
  stats: {
    puzzlesCompleted: number;
    totalTimeSpent: string;
    averageRating: number;
    currentStreak: number;
  };
  recentPuzzles: Array<{
    id: number;
    title: string;
    difficulty: string;
    timeSpent: string;
    rating: number;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    rarity: string;
  }>;
}

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const rarityColors: Record<string, string> = {
  common: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  rare: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  epic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  legendary: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/me');
        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Failed to load profile'}</p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Profile</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{profile.name}</h2>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{profile.bio || "No bio available"}</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  Joined {new Date(profile.joinedAt).toLocaleDateString()}
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{profile.stats.puzzlesCompleted}</p>
                  <p className="text-sm text-muted-foreground">Puzzles</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.currentStreak}</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.averageRating}</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.totalTimeSpent}</p>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Puzzles */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Puzzle className="h-5 w-5" />
                    Recent Puzzles
                  </CardTitle>
                  <CardDescription>User's latest completed puzzles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profile.recentPuzzles && profile.recentPuzzles.length > 0 ? profile.recentPuzzles.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Puzzle className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{p.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge className={difficultyColors[p.difficulty]}>${""}{p.difficulty}</Badge>
                              <span>•</span>
                              <span>{p.timeSpent}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">{p.rating}</span>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/puzzles/${p.id}`}>Open</Link>
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No recent puzzles completed</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Achievements */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {profile.achievements && profile.achievements.length > 0 ? profile.achievements.map((ach, idx) => (
                      <motion.div
                        key={ach.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 + idx * 0.1 }}
                        className="flex items-center gap-4 p-4 rounded-lg border"
                      >
                        <div className="p-3 rounded-full bg-muted">
                          <Trophy className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{ach.name}</h4>
                            <Badge className={rarityColors[ach.rarity]}>{ach.rarity}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{ach.description}</p>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="col-span-2 text-center py-8">
                        <p className="text-muted-foreground">No achievements earned yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}


