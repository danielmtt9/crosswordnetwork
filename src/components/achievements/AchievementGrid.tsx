"use client";

import { useState } from "react";
import { AchievementBadge } from "./AchievementBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  tier: string;
  points: number;
  iconName: string;
  isSecret: boolean;
  userProgress?: {
    progress: number;
    earnedAt: Date | null;
    notified: boolean;
  } | null;
}

interface AchievementGridProps {
  achievements: Achievement[];
  className?: string;
}

const categories = [
  { key: 'ALL', label: 'All', count: 0 },
  { key: 'COMPLETION', label: 'Completion', count: 0 },
  { key: 'SPEED', label: 'Speed', count: 0 },
  { key: 'STREAK', label: 'Streak', count: 0 },
  { key: 'ACCURACY', label: 'Accuracy', count: 0 },
  { key: 'SOCIAL', label: 'Social', count: 0 },
  { key: 'MASTERY', label: 'Mastery', count: 0 },
  { key: 'SPECIAL', label: 'Special', count: 0 },
];

const tiers = [
  { key: 'ALL', label: 'All Tiers', count: 0 },
  { key: 'BRONZE', label: 'Bronze', count: 0 },
  { key: 'SILVER', label: 'Silver', count: 0 },
  { key: 'GOLD', label: 'Gold', count: 0 },
  { key: 'PLATINUM', label: 'Platinum', count: 0 },
  { key: 'DIAMOND', label: 'Diamond', count: 0 },
];

export function AchievementGrid({ achievements, className }: AchievementGridProps) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  // Calculate counts for filters
  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: cat.key === 'ALL' 
      ? achievements.length 
      : achievements.filter(a => a.category === cat.key).length
  }));

  const tierCounts = tiers.map(tier => ({
    ...tier,
    count: tier.key === 'ALL' 
      ? achievements.length 
      : achievements.filter(a => a.tier === tier.key).length
  }));

  // Filter achievements
  const filteredAchievements = achievements.filter(achievement => {
    const categoryMatch = selectedCategory === 'ALL' || achievement.category === selectedCategory;
    const tierMatch = selectedTier === 'ALL' || achievement.tier === selectedTier;
    const earnedMatch = !showEarnedOnly || achievement.userProgress?.earnedAt !== null;
    
    return categoryMatch && tierMatch && earnedMatch;
  });

  // Sort achievements: earned first, then by tier, then by order
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const aEarned = a.userProgress?.earnedAt !== null;
    const bEarned = b.userProgress?.earnedAt !== null;
    
    if (aEarned !== bEarned) {
      return aEarned ? -1 : 1;
    }
    
    const tierOrder = { DIAMOND: 5, PLATINUM: 4, GOLD: 3, SILVER: 2, BRONZE: 1 };
    const aTierOrder = tierOrder[a.tier as keyof typeof tierOrder] || 0;
    const bTierOrder = tierOrder[b.tier as keyof typeof tierOrder] || 0;
    
    return bTierOrder - aTierOrder;
  });

  const earnedCount = achievements.filter(a => a.userProgress?.earnedAt !== null).length;
  const totalPoints = achievements
    .filter(a => a.userProgress?.earnedAt !== null)
    .reduce((sum, a) => sum + a.points, 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Summary */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {earnedCount} / {achievements.length}
          </Badge>
          <span className="text-sm text-muted-foreground">Achievements</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {totalPoints} pts
          </Badge>
          <span className="text-sm text-muted-foreground">Total Points</span>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Category Filter */}
        <div>
          <h3 className="text-sm font-medium mb-2">Category</h3>
          <div className="flex flex-wrap gap-2">
            {categoryCounts.map(category => (
              <Button
                key={category.key}
                variant={selectedCategory === category.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.key)}
                className="text-xs"
              >
                {category.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Tier Filter */}
        <div>
          <h3 className="text-sm font-medium mb-2">Tier</h3>
          <div className="flex flex-wrap gap-2">
            {tierCounts.map(tier => (
              <Button
                key={tier.key}
                variant={selectedTier === tier.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTier(tier.key)}
                className="text-xs"
              >
                {tier.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tier.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Show Earned Only Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showEarnedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowEarnedOnly(!showEarnedOnly)}
            className="text-xs"
          >
            {showEarnedOnly ? "Show All" : "Earned Only"}
          </Button>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedAchievements.map(achievement => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            userProgress={achievement.userProgress}
            size="md"
            showProgress={true}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedAchievements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No achievements found matching your filters.
          </p>
        </div>
      )}
    </div>
  );
}
