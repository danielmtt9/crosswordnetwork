"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Coffee, Heart, Sparkles } from "lucide-react";

interface SocialPresenceStripProps {
  liveRoomsCount?: number;
  onlineUsersCount?: number;
  activeUsers?: Array<{
    id: string;
    name: string;
    avatar?: string;
    isActive: boolean;
  }>;
}

export default function SocialPresenceStrip({ 
  liveRoomsCount = 12, 
  onlineUsersCount = 47,
  activeUsers = []
}: SocialPresenceStripProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(0);

  const cozyMessages = [
    "Good vibes flowing",
    "Puzzle magic happening",
    "Cozy solving energy",
    "Warm crossword moments",
    "Friends connecting",
    "Memories being made"
  ];

  // Rotate messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % cozyMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Generate mock active users if none provided
  const displayUsers = activeUsers.length > 0 ? activeUsers : Array.from({ length: 8 }, (_, i) => ({
    id: `user-${i}`,
    name: `Solver ${i + 1}`,
    avatar: undefined,
    isActive: true
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.section 
          className="py-4 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-y border-amber-100/50 dark:border-amber-900/20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left side - User avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {displayUsers.slice(0, 6).map((user, index) => (
                    <motion.div
                      key={user.id}
                      className="relative"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 200
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-white text-xs font-medium">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {user.isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-900">
                          <div className="w-full h-full bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {displayUsers.length > 6 && (
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-medium">
                      +{displayUsers.length - 6}
                    </div>
                  )}
                </div>
              </div>

              {/* Center - Live stats */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <motion.div 
                  className="flex items-center gap-2"
                  key={`rooms-${liveRoomsCount}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Live now: {liveRoomsCount} rooms</span>
                </motion.div>
                
                <motion.div 
                  className="flex items-center gap-2"
                  key={`users-${onlineUsersCount}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Users className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{onlineUsersCount} solvers online</span>
                </motion.div>
              </div>

              {/* Right side - Cozy message */}
              <motion.div 
                className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
                key={currentMessage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Heart className="h-4 w-4" />
                <span className="font-medium">{cozyMessages[currentMessage]}</span>
              </motion.div>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden mt-3 space-y-2">
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{liveRoomsCount} rooms live</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  <span>{onlineUsersCount} online</span>
                </div>
              </div>
              <div className="text-center">
                <motion.div 
                  className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400"
                  key={`mobile-${currentMessage}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Heart className="h-4 w-4" />
                  <span>{cozyMessages[currentMessage]}</span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
