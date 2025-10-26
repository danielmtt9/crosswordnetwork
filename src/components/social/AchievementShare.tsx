"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Check, Twitter, Facebook, Link, Trophy, Award, Crown, Star, Zap, Target, Users, Shield, Sparkles } from "lucide-react";
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

interface AchievementShareProps {
  achievement: Achievement;
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

export function AchievementShare({ achievement, onClose, className }: AchievementShareProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const tierColor = tierColors[achievement.tier as keyof typeof tierColors] || tierColors.BRONZE;
  const Icon = getIcon(achievement.iconName);

  const shareText = `🎉 I just earned the "${achievement.name}" achievement on Crossword.Network! ${achievement.description ? `\n\n${achievement.description}` : ''} \n\n#CrosswordNetwork #Achievement #${achievement.tier}`;
  const shareUrl = `${window.location.origin}/achievements`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  const shareToLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedinUrl, '_blank', 'width=550,height=420');
  };

  const shareViaWebAPI = async () => {
    if (navigator.share) {
      try {
        setSharing(true);
        await navigator.share({
          title: `Achievement Unlocked: ${achievement.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      } finally {
        setSharing(false);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Your Achievement
        </CardTitle>
        <CardDescription>
          Let your friends know about your accomplishment!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Achievement Preview */}
        <div className={cn(
          "flex items-center gap-4 p-4 rounded-lg border-2",
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
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-bold text-sm", tierColor.text)}>
              Achievement Unlocked!
            </h3>
            <p className={cn("font-semibold text-base", tierColor.text)}>
              {achievement.name}
            </p>
            {achievement.description && (
              <p className="text-xs text-muted-foreground mt-1">
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

        {/* Share Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Share via:</h4>
          
          {/* Native Share (Mobile) */}
          {navigator.share && (
            <Button
              onClick={shareViaWebAPI}
              disabled={sharing}
              className="w-full"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {sharing ? 'Sharing...' : 'Share'}
            </Button>
          )}

          {/* Social Media Options */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={shareToTwitter}
              className="flex items-center gap-2"
            >
              <Twitter className="h-4 w-4" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareToFacebook}
              className="flex items-center gap-2"
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </Button>
          </div>

          {/* Copy Link */}
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="w-full flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        {/* Share Preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Preview:</h4>
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="whitespace-pre-wrap">{shareText}</p>
            <p className="text-muted-foreground mt-2">{shareUrl}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={shareViaWebAPI} className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
