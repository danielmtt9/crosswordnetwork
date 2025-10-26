"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Crown, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface HintLimitBannerProps {
  hintsUsed: number;
  hintLimit: number;
  isPremium: boolean;
  onUpgrade?: () => void;
}

export function HintLimitBanner({
  hintsUsed,
  hintLimit,
  isPremium,
  onUpgrade,
}: HintLimitBannerProps) {
  // Don't show banner for premium users
  if (isPremium) return null;

  const remainingHints = Math.max(0, hintLimit - hintsUsed);
  const isAtLimit = remainingHints === 0;

  if (!isAtLimit && hintsUsed === 0) return null; // Don't show if no hints used

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <Card className={`border-l-4 ${
        isAtLimit 
          ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' 
          : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAtLimit ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Lightbulb className="h-5 w-5 text-yellow-500" />
              )}
              
              <div>
                <div className="font-semibold text-sm">
                  {isAtLimit ? 'Hint Limit Reached' : 'Hint Usage Warning'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isAtLimit 
                    ? `You've used all ${hintLimit} hints for this puzzle.`
                    : `${remainingHints} hint${remainingHints !== 1 ? 's' : ''} remaining.`
                  }
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isAtLimit ? "default" : "outline"}
                size="sm"
                asChild
                className={isAtLimit ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" : ""}
              >
                <Link href="/pricing">
                  <Crown className="h-4 w-4 mr-2" />
                  {isAtLimit ? 'Upgrade Now' : 'Upgrade'}
                </Link>
              </Button>
            </div>
          </div>

          {!isAtLimit && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(hintsUsed / hintLimit) * 100}%` }}
                  />
                </div>
                <span>{hintsUsed}/{hintLimit}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
