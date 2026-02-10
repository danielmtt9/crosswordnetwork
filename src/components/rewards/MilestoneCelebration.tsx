"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy,
  Star,
  Zap, 
  Gift,
  Target,
  Calendar,
  Clock,
  Award,
  Sparkles,
  PartyPopper
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  type: 'achievement_count' | 'points_total' | 'streak_days' | 'puzzles_completed' | 'special_event';
  name: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  reward: {
    type: 'points' | 'badge' | 'special_title';
    value: number;
    name: string;
  };
  unlocked: boolean;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface MilestoneCelebrationProps {
  className?: string;
  onMilestoneReached?: (milestone: Milestone) => void;
}

export function MilestoneCelebration({ className, onMilestoneReached }: MilestoneCelebrationProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedMilestone, setCelebratedMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rewards/milestones');
      
      if (!response.ok) {
        throw new Error('Failed to fetch milestones');
      }
      
      const data = await response.json();
      setMilestones(data.milestones);
      
      // Check for newly unlocked milestones
      const newMilestones = data.milestones.filter((m: Milestone) => 
        m.unlocked && !m.unlockedAt
      );
      
      if (newMilestones.length > 0) {
        const latestMilestone = newMilestones[0];
        setCelebratedMilestone(latestMilestone);
        setShowCelebration(true);
        onMilestoneReached?.(latestMilestone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const closeCelebration = () => {
    setShowCelebration(false);
    setCelebratedMilestone(null);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'rare':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'achievement_count':
        return <Award className="h-5 w-5" />;
      case 'points_total':
        return <Star className="h-5 w-5" />;
      case 'streak_days':
        return <Zap className="h-5 w-5" />;
      case 'puzzles_completed':
        return <Target className="h-5 w-5" />;
      case 'special_event':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Milestone Celebrations</h2>
            <p className="text-muted-foreground">Track your progress towards special milestones</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Milestone Celebrations</h2>
            <p className="text-muted-foreground">Track your progress towards special milestones</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchMilestones} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Celebration Modal */}
      {showCelebration && celebratedMilestone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="text-6xl mb-2">🎉</div>
                <h3 className="text-2xl font-bold mb-2">Milestone Reached!</h3>
                <p className="text-muted-foreground">
                  You've achieved a special milestone!
                </p>
              </div>
              
              <div className="border rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{celebratedMilestone.icon}</div>
                  <div>
                    <h4 className="font-bold">{celebratedMilestone.name}</h4>
                    <Badge className={getRarityColor(celebratedMilestone.rarity)}>
                      {celebratedMilestone.rarity}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {celebratedMilestone.description}
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <Gift className="h-4 w-4" />
                    <span className="font-medium">Reward Unlocked:</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    {celebratedMilestone.reward.name}
                  </p>
                </div>
              </div>
              
              <Button onClick={closeCelebration} className="w-full">
                Awesome!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Milestone Celebrations</h2>
          <p className="text-muted-foreground">Track your progress towards special milestones</p>
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestones.map((milestone) => (
          <Card key={milestone.id} className={cn(
            "transition-all duration-200",
            milestone.unlocked && "ring-2 ring-green-500 bg-green-50"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{milestone.icon}</div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{milestone.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRarityColor(milestone.rarity)}>
                      {milestone.rarity}
                    </Badge>
                    {milestone.unlocked && (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Unlocked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {milestone.description}
              </p>
              
              {/* Progress */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">
                    {milestone.current.toLocaleString()} / {milestone.target.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={getProgressPercentage(milestone.current, milestone.target)} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {getProgressPercentage(milestone.current, milestone.target).toFixed(1)}% complete
                </div>
              </div>

              {/* Reward */}
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Reward:</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {milestone.reward.name}
                </p>
                {milestone.unlocked && milestone.unlockedAt && (
                  <p className="text-xs text-green-600 mt-1">
                    Unlocked on {new Date(milestone.unlockedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Milestone Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {milestones.filter(m => m.unlocked).length}
              </div>
              <div className="text-sm text-muted-foreground">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {milestones.filter(m => !m.unlocked).length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {milestones.filter(m => m.rarity === 'legendary').length}
              </div>
              <div className="text-sm text-muted-foreground">Legendary</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(milestones.reduce((acc, m) => acc + getProgressPercentage(m.current, m.target), 0) / milestones.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
