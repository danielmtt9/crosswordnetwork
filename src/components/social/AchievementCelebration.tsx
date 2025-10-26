"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, ThumbsUp, PartyPopper, Trophy, Award, Crown, Star, Zap, Target, Users, Shield, Sparkles, X } from "lucide-react";
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
  earnedAt: string;
}

interface Celebration {
  id: string;
  achievement: Achievement;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  reactions: {
    userId: string;
    userName: string;
    userAvatar?: string;
    type: 'like' | 'love' | 'celebrate';
    timestamp: string;
  }[];
  createdAt: string;
}

interface AchievementCelebrationProps {
  celebration: Celebration;
  currentUserId?: string;
  onReact?: (celebrationId: string, reactionType: 'like' | 'love' | 'celebrate') => void;
  onClose?: () => void;
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

const getReactionIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <ThumbsUp className="h-4 w-4" />;
    case 'love':
      return <Heart className="h-4 w-4" />;
    case 'celebrate':
      return <PartyPopper className="h-4 w-4" />;
    default:
      return <ThumbsUp className="h-4 w-4" />;
  }
};

const getReactionColor = (type: string) => {
  switch (type) {
    case 'like':
      return 'text-blue-500';
    case 'love':
      return 'text-red-500';
    case 'celebrate':
      return 'text-yellow-500';
    default:
      return 'text-blue-500';
  }
};

export function AchievementCelebration({
  celebration,
  currentUserId,
  onReact,
  onClose,
  className,
}: AchievementCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showReactions, setShowReactions] = useState(false);

  const achievement = celebration.achievement;
  const tierColor = tierColors[achievement.tier as keyof typeof tierColors] || tierColors.BRONZE;
  const Icon = getIcon(achievement.iconName);

  const handleReaction = (type: 'like' | 'love' | 'celebrate') => {
    if (onReact) {
      onReact(celebration.id, type);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn("w-full max-w-md", className)}
        >
          <Card className={cn(
            "relative overflow-hidden shadow-lg border-2",
            tierColor.bg,
            tierColor.border
          )}>
            {/* Close Button */}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="absolute top-2 right-2 z-10 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={celebration.user.avatar} alt={celebration.user.name} />
                  <AvatarFallback>
                    {celebration.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">
                    {celebration.user.name} earned an achievement!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(celebration.createdAt)}
                  </p>
                </div>
              </div>

              {/* Achievement */}
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 mb-4",
                tierColor.bg,
                tierColor.border
              )}>
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                  tierColor.bg,
                  tierColor.border,
                  "border-2"
                )}>
                  <Icon className={cn("w-6 h-6", tierColor.icon)} />
                </div>
                <div className="flex-1">
                  <h4 className={cn("font-bold text-sm", tierColor.text)}>
                    {achievement.name}
                  </h4>
                  {achievement.description && (
                    <p className="text-xs text-muted-foreground">
                      {achievement.description}
                    </p>
                  )}
                </div>
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

              {/* Reactions */}
              <div className="space-y-3">
                {/* Reaction Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction('like')}
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-xs">Like</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction('love')}
                    className="flex items-center gap-1 text-red-500 hover:text-red-600"
                  >
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">Love</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction('celebrate')}
                    className="flex items-center gap-1 text-yellow-500 hover:text-yellow-600"
                  >
                    <PartyPopper className="h-4 w-4" />
                    <span className="text-xs">Celebrate</span>
                  </Button>
                </div>

                {/* Reaction List */}
                {celebration.reactions.length > 0 && (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReactions(!showReactions)}
                      className="text-xs text-muted-foreground"
                    >
                      {celebration.reactions.length} reaction{celebration.reactions.length !== 1 ? 's' : ''}
                    </Button>
                    
                    {showReactions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1"
                      >
                        {celebration.reactions.map((reaction, index) => (
                          <div
                            key={`${reaction.userId}-${reaction.timestamp}`}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={reaction.userAvatar} alt={reaction.userName} />
                              <AvatarFallback className="text-xs">
                                {reaction.userName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn("flex items-center gap-1", getReactionColor(reaction.type))}>
                              {getReactionIcon(reaction.type)}
                              <span className="text-xs font-medium">{reaction.userName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatTimeAgo(reaction.timestamp)}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Glow Effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 animate-pulse" />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
