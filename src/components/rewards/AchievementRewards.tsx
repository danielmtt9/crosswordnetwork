"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gift, 
  Star,
  Zap,
  Trophy,
  Award,
  Target,
  Calendar,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementReward {
  id: string;
  type: 'points' | 'badge' | 'hint_bonus' | 'special_event';
  name: string;
  description: string;
  icon: string;
  value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  requirements: {
    achievementId: string;
    achievementName: string;
    pointsRequired: number;
  }[];
}

interface UserRewards {
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  unlockedRewards: AchievementReward[];
  availableRewards: AchievementReward[];
  hintBonuses: {
    id: string;
    name: string;
    description: string;
    bonusAmount: number;
    unlocked: boolean;
    requiredPoints: number;
  }[];
  specialEvents: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    unlocked: boolean;
    requiredPoints: number;
  }[];
}

interface AchievementRewardsProps {
  className?: string;
}

export function AchievementRewards({ className }: AchievementRewardsProps) {
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rewards/achievements');
      
      if (!response.ok) {
        throw new Error('Failed to fetch rewards');
      }
      
      const data = await response.json();
      setRewards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const unlockReward = async (rewardId: string) => {
    try {
      const response = await fetch('/api/rewards/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to unlock reward');
      }
      
      await fetchRewards(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock reward');
    }
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

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'points':
        return <Star className="h-5 w-5" />;
      case 'badge':
        return <Award className="h-5 w-5" />;
      case 'hint_bonus':
        return <Zap className="h-5 w-5" />;
      case 'special_event':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Achievement Rewards</h2>
            <p className="text-muted-foreground">Unlock rewards with your achievement points</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
            <h2 className="text-2xl font-bold">Achievement Rewards</h2>
            <p className="text-muted-foreground">Unlock rewards with your achievement points</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchRewards} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rewards) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Achievement Rewards</h2>
          <p className="text-muted-foreground">Unlock rewards with your achievement points</p>
        </div>
      </div>

      {/* Points Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">Total Points</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {rewards.totalPoints.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              All time earned
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Available Points</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {rewards.availablePoints.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Ready to spend
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Unlocked Rewards</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {rewards.unlockedRewards.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {rewards.availableRewards.length} available
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="hints">Hint Bonuses</TabsTrigger>
          <TabsTrigger value="events">Special Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Recent Unlocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rewards.unlockedRewards.slice(0, 5).map((reward) => (
                    <div key={reward.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getRewardIcon(reward.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{reward.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {reward.description}
                        </div>
                      </div>
                      <Badge className={getRarityColor(reward.rarity)}>
                        {reward.rarity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Available Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rewards.availableRewards.slice(0, 5).map((reward) => (
                    <div key={reward.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getRewardIcon(reward.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{reward.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {reward.description}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Requires: {reward.requirements.map(r => r.achievementName).join(', ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {reward.value} points
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => unlockReward(reward.id)}
                          disabled={rewards.availablePoints < reward.value}
                        >
                          Unlock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Special Badges</CardTitle>
              <CardDescription>
                Unlock special badges to show off your achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.availableRewards
                  .filter(reward => reward.type === 'badge')
                  .map((reward) => (
                    <div key={reward.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-2xl">{reward.icon}</div>
                        <div>
                          <h4 className="font-medium">{reward.name}</h4>
                          <Badge className={getRarityColor(reward.rarity)}>
                            {reward.rarity}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {reward.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {reward.value} points
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => unlockReward(reward.id)}
                          disabled={rewards.availablePoints < reward.value}
                        >
                          {reward.unlocked ? 'Unlocked' : 'Unlock'}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hint Bonuses</CardTitle>
              <CardDescription>
                Get extra hints to help solve puzzles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rewards.hintBonuses.map((bonus) => (
                  <div key={bonus.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <div>
                        <h4 className="font-medium">{bonus.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {bonus.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          +{bonus.bonusAmount} hints
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {bonus.requiredPoints} points
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => unlockReward(bonus.id)}
                        disabled={bonus.unlocked || rewards.availablePoints < bonus.requiredPoints}
                      >
                        {bonus.unlocked ? 'Unlocked' : 'Unlock'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Special Events</CardTitle>
              <CardDescription>
                Access to exclusive events and challenges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rewards.specialEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {event.requiredPoints} points
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => unlockReward(event.id)}
                        disabled={event.unlocked || rewards.availablePoints < event.requiredPoints}
                      >
                        {event.unlocked ? 'Unlocked' : 'Unlock'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
