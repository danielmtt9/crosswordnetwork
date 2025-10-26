"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  id: string;
  rank?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  value: number;
  metric: string;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  metric: string;
  className?: string;
}

const getRankIcon = (rank?: number) => {
  if (!rank) return null;
  
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
  if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
  return null;
};

const getRankBadgeColor = (rank?: number) => {
  if (!rank) return "secondary";
  
  if (rank === 1) return "default";
  if (rank === 2) return "secondary";
  if (rank === 3) return "outline";
  return "secondary";
};

const formatValue = (value: number, metric: string) => {
  switch (metric) {
    case 'fastest_time':
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    case 'highest_score':
      return value.toLocaleString();
    case 'most_completed':
      return value.toString();
    case 'best_accuracy':
      return `${value.toFixed(1)}%`;
    case 'longest_streak':
      return `${value} days`;
    default:
      return value.toString();
  }
};

export function LeaderboardTable({
  entries,
  currentUserId,
  metric,
  className,
}: LeaderboardTableProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
        <div className="col-span-1">Rank</div>
        <div className="col-span-7">Player</div>
        <div className="col-span-4 text-right">
          {metric === 'fastest_time' && 'Time'}
          {metric === 'highest_score' && 'Score'}
          {metric === 'most_completed' && 'Puzzles'}
          {metric === 'best_accuracy' && 'Accuracy'}
          {metric === 'longest_streak' && 'Streak'}
        </div>
      </div>

      {/* Entries */}
      {entries.map((entry, index) => {
        const isCurrentUser = entry.userId === currentUserId;
        const rank = entry.rank || index + 1;
        
        return (
          <div
            key={entry.id}
            className={cn(
              "grid grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-colors",
              isCurrentUser
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-muted/50"
            )}
          >
            {/* Rank */}
            <div className="col-span-1 flex items-center gap-2">
              <Badge
                variant={getRankBadgeColor(rank)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center p-0 text-xs font-bold",
                  rank <= 3 && "ring-2 ring-offset-1",
                  rank === 1 && "ring-yellow-500",
                  rank === 2 && "ring-gray-400",
                  rank === 3 && "ring-amber-600"
                )}
              >
                {getRankIcon(rank) || rank}
              </Badge>
            </div>

            {/* Player */}
            <div className="col-span-7 flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={entry.userAvatar} alt={entry.userName} />
                <AvatarFallback className="text-xs">
                  {entry.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium",
                  isCurrentUser && "text-primary"
                )}>
                  {entry.userName}
                  {isCurrentUser && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      You
                    </Badge>
                  )}
                </span>
              </div>
            </div>

            {/* Value */}
            <div className="col-span-4 flex items-center justify-end">
              <span className="text-sm font-mono font-medium">
                {formatValue(entry.value, metric)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No entries found for this leaderboard.
          </p>
        </div>
      )}
    </div>
  );
}
