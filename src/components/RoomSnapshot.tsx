"use client";

import { motion } from "framer-motion";
import { Puzzle, Users, Clock, Heart, Coffee, Sparkles } from "lucide-react";

interface RoomSnapshotProps {
  roomCode: string;
  participantCount: number;
  maxParticipants?: number;
  isActive?: boolean;
  timeElapsed?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  theme?: "Cozy" | "Challenging" | "Social";
}

export default function RoomSnapshot({
  roomCode,
  participantCount,
  maxParticipants = 8,
  isActive = true,
  timeElapsed = "12:34",
  difficulty = "Medium",
  theme = "Cozy"
}: RoomSnapshotProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "text-green-600 dark:text-green-400";
      case "Medium": return "text-amber-600 dark:text-amber-400";
      case "Hard": return "text-red-600 dark:text-red-400";
      default: return "text-amber-600 dark:text-amber-400";
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "Cozy": return <Coffee className="h-4 w-4" />;
      case "Challenging": return <Puzzle className="h-4 w-4" />;
      case "Social": return <Users className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  return (
    <motion.div 
      className="relative rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl ring-1 ring-amber-200/50 dark:ring-amber-800/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Room header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="font-mono text-lg font-bold text-foreground">Room {roomCode}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {getThemeIcon(theme)}
          <span className="capitalize">{theme}</span>
        </div>
      </div>

      {/* Crossword grid preview */}
      <div className="grid grid-cols-5 gap-1 mb-4">
        {Array.from({ length: 25 }).map((_, i) => {
          const isCenter = i === 12;
          const hasLetter = i === 6 || i === 8 || i === 16 || i === 18 || i === 2 || i === 22;
          const isFilled = Math.random() > 0.7;
          
          return (
            <motion.div
              key={i}
              className={`aspect-square rounded-md flex items-center justify-center text-sm font-bold border transition-colors duration-200 ${
                isCenter 
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                  : isFilled
                  ? 'bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.01 }}
              whileHover={{ scale: 1.1 }}
            >
              {isCenter ? (
                <Puzzle className="h-4 w-4" />
              ) : hasLetter && isFilled ? (
                String.fromCharCode(65 + Math.floor(Math.random() * 26))
              ) : ''}
            </motion.div>
          );
        })}
      </div>

      {/* Room stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">
              {participantCount}/{maxParticipants} solving
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">{timeElapsed}</span>
          </div>
        </div>
        <div className={`font-medium ${getDifficultyColor(difficulty)}`}>
          {difficulty}
        </div>
      </div>

      {/* Participant avatars */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/50">
        <div className="flex -space-x-2">
          {Array.from({ length: Math.min(participantCount, 4) }).map((_, i) => (
            <motion.div
              key={i}
              className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-white text-xs font-medium"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
            >
              {String.fromCharCode(65 + i)}
            </motion.div>
          ))}
          {participantCount > 4 && (
            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-medium">
              +{participantCount - 4}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-amber-600 dark:text-amber-400">
          <Heart className="h-3 w-3" />
          <span>Cozy vibes</span>
        </div>
      </div>

      {/* Cozy decorative elements */}
      <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center opacity-80">
        <Sparkles className="h-3 w-3 text-white" />
      </div>
      <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center opacity-80">
        <Coffee className="h-3 w-3 text-white" />
      </div>
    </motion.div>
  );
}
