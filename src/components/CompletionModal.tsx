"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Clock, 
  Star, 
  Lightbulb, 
  Target,
  X,
  Share2,
  RotateCcw
} from "lucide-react";

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleTitle: string;
  completionTime: number; // in seconds
  score: number;
  hintsUsed: number;
  difficulty: string;
  onPlayAgain?: () => void;
  onShare?: () => void;
}

export function CompletionModal({
  isOpen,
  onClose,
  puzzleTitle,
  completionTime,
  score,
  hintsUsed,
  difficulty,
  onPlayAgain,
  onShare,
}: CompletionModalProps) {
  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreRating = (score: number) => {
    if (score >= 1500) return { text: "Excellent!", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
    if (score >= 1000) return { text: "Great!", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
    if (score >= 500) return { text: "Good!", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
    return { text: "Keep trying!", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
  };

  const scoreRating = getScoreRating(score);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <motion.div
              className="mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
            </motion.div>
            
            <CardTitle className="text-2xl">Congratulations!</CardTitle>
            <CardDescription className="text-lg">
              You completed "{puzzleTitle}"
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {score.toLocaleString()}
              </div>
              <Badge className={scoreRating.color}>
                {scoreRating.text}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{formatTime(completionTime)}</div>
                <div className="text-sm text-muted-foreground">Time</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Lightbulb className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{hintsUsed}</div>
                <div className="text-sm text-muted-foreground">Hints Used</div>
              </div>
            </div>

            {/* Difficulty Badge */}
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                <Target className="h-3 w-3 mr-1" />
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Difficulty
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {onPlayAgain && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onPlayAgain}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
              )}
              
              {onShare && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}
            </div>

            <Button
              className="w-full"
              onClick={onClose}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
