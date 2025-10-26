"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Trophy, Award, Crown, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  achievement: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    category: string;
    tier: string;
    points: number;
    iconName: string;
    isSecret: boolean;
  };
  userProgress?: {
    progress: number;
    earnedAt: Date | null;
    notified: boolean;
  } | null;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

const tierColors = {
  BRONZE: {
    bg: 'bg-amber-100 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  SILVER: {
    bg: 'bg-gray-100 dark:bg-gray-800/20',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-800 dark:text-gray-200',
    icon: 'text-gray-600 dark:text-gray-400',
  },
  GOLD: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  PLATINUM: {
    bg: 'bg-slate-100 dark:bg-slate-800/20',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-800 dark:text-slate-200',
    icon: 'text-slate-600 dark:text-slate-400',
  },
  DIAMOND: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/20',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-800 dark:text-cyan-200',
    icon: 'text-cyan-600 dark:text-cyan-400',
  },
};

const sizeClasses = {
  sm: {
    container: 'w-16 h-16',
    icon: 'w-6 h-6',
    text: 'text-xs',
    progress: 'h-1',
  },
  md: {
    container: 'w-20 h-20',
    icon: 'w-8 h-8',
    text: 'text-sm',
    progress: 'h-1.5',
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'w-10 h-10',
    text: 'text-base',
    progress: 'h-2',
  },
};

const getIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Baby: Trophy,
    Target: Award,
    Award: Award,
    Crown: Crown,
    Trophy: Trophy,
    Zap: Zap,
    Bolt: Zap,
    Flame: Star,
    Calendar: Star,
    Star: Star,
    Crosshair: Award,
    CheckCircle: Award,
    Shield: Award,
    Sword: Award,
    Users: Award,
    Home: Award,
  };
  return icons[iconName] || Trophy;
};

export function AchievementBadge({
  achievement,
  userProgress,
  size = 'md',
  showProgress = true,
  className,
}: AchievementBadgeProps) {
  const isEarned = userProgress?.earnedAt !== null;
  const isLocked = !isEarned;
  const tierColor = tierColors[achievement.tier as keyof typeof tierColors] || tierColors.BRONZE;
  const sizeClass = sizeClasses[size];
  const Icon = getIcon(achievement.iconName);

  // Calculate progress percentage for incremental achievements
  const progressPercentage = userProgress ? (userProgress.progress / 100) * 100 : 0;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 p-2 transition-all duration-200',
        sizeClass.container,
        isLocked
          ? 'opacity-40 grayscale'
          : 'hover:scale-105 hover:shadow-lg',
        tierColor.bg,
        tierColor.border,
        className
      )}
      title={achievement.isSecret && isLocked ? 'Secret Achievement' : achievement.name}
    >
      {/* Lock overlay for locked achievements */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-4 h-4 text-gray-500" />
        </div>
      )}

      {/* Achievement icon */}
      <div className={cn('mb-1', tierColor.icon)}>
        <Icon className={sizeClass.icon} />
      </div>

      {/* Achievement name */}
      <div className={cn('text-center font-medium', sizeClass.text, tierColor.text)}>
        {achievement.isSecret && isLocked ? '???' : achievement.name}
      </div>

      {/* Points badge */}
      {isEarned && (
        <Badge
          variant="secondary"
          className={cn(
            'absolute -top-1 -right-1 text-xs',
            tierColor.bg,
            tierColor.text
          )}
        >
          {achievement.points}
        </Badge>
      )}

      {/* Progress bar for incremental achievements */}
      {showProgress && !isEarned && userProgress && userProgress.progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-1">
          <Progress
            value={progressPercentage}
            className={cn(sizeClass.progress, 'bg-gray-200 dark:bg-gray-700')}
          />
        </div>
      )}

      {/* Glow effect for earned achievements */}
      {isEarned && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </div>
  );
}
