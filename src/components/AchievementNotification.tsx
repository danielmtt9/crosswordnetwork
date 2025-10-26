"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Trophy, Award, Crown, Star, Zap, Target, Users, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementNotificationData {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  tier: string;
  points: number;
  iconName: string;
  earnedAt: string;
}

interface AchievementNotificationProps {
  achievement: AchievementNotificationData;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
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

const getIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Trophy: Trophy,
    Award: Award,
    Crown: Crown,
    Star: Star,
    Zap: Zap,
    Target: Target,
    Users: Users,
    Shield: Shield,
    Sparkles: Sparkles,
  };
  return icons[iconName] || Trophy;
};

export function AchievementNotification({
  achievement,
  onDismiss,
  autoHide = true,
  duration = 5000,
  className,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (autoHide) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (duration / 100));
          if (newProgress >= 100) {
            setIsVisible(false);
            setTimeout(onDismiss, 300); // Wait for animation to complete
            return 100;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [autoHide, duration, onDismiss]);

  const tierColor = tierColors[achievement.tier as keyof typeof tierColors] || tierColors.BRONZE;
  const Icon = getIcon(achievement.iconName);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn("fixed top-4 right-4 z-50 max-w-sm", className)}
        >
          <Card className={cn(
            "relative overflow-hidden shadow-lg border-2",
            tierColor.bg,
            tierColor.border
          )}>
            {/* Progress bar */}
            {autoHide && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            )}

            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Achievement Icon */}
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                  tierColor.bg,
                  tierColor.border,
                  "border-2"
                )}>
                  <Icon className={cn("w-6 h-6", tierColor.icon)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className={cn("font-bold text-sm", tierColor.text)}>
                        Achievement Unlocked!
                      </h3>
                      <p className={cn("font-semibold text-base mt-1", tierColor.text)}>
                        {achievement.name}
                      </p>
                      {achievement.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                      )}
                    </div>

                    {/* Points Badge */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "flex-shrink-0 text-xs",
                        tierColor.bg,
                        tierColor.text
                      )}
                    >
                      +{achievement.points}
                    </Badge>
                  </div>

                  {/* Tier Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        tierColor.border,
                        tierColor.text
                      )}
                    >
                      {achievement.tier}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs"
                    >
                      {achievement.category}
                    </Badge>
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsVisible(false);
                    setTimeout(onDismiss, 300);
                  }}
                  className="flex-shrink-0 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>

            {/* Glow Effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 animate-pulse" />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing achievement notifications
export function useAchievementNotifications() {
  const [notifications, setNotifications] = useState<AchievementNotificationData[]>([]);

  const addNotification = (achievement: AchievementNotificationData) => {
    setNotifications(prev => [...prev, achievement]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  };
}

// Component for displaying multiple notifications
export function AchievementNotificationContainer() {
  const { notifications, removeNotification } = useAchievementNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((achievement, index) => (
        <AchievementNotification
          key={achievement.id}
          achievement={achievement}
          onDismiss={() => removeNotification(achievement.id)}
          className="transform"
          style={{
            transform: `translateY(${index * 10}px)`,
          }}
        />
      ))}
    </div>
  );
}