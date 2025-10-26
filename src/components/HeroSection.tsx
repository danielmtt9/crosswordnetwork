"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Puzzle, 
  Users, 
  ArrowRight,
  Sparkles,
  Coffee,
  Heart,
  Home
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface HeroSectionProps {
  liveRoomsCount?: number;
  onlineUsersCount?: number;
}

export default function HeroSection({ 
  liveRoomsCount = 12, 
  onlineUsersCount = 47 
}: HeroSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleStartRoom = () => {
    if (session) {
      router.push("/multiplayer/new");
    } else {
      router.push("/signup?redirect=/multiplayer/new");
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    
    // Validate room code format (6 characters)
    if (roomCode.length !== 6) {
      alert("Room code must be 6 characters long");
      return;
    }
    
    setIsJoining(true);
    try {
      // Check if room exists and redirect
      router.push(`/multiplayer/join/${roomCode.toUpperCase()}`);
    } catch (error) {
      alert("Room not found. Please check the code and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20">
      {/* Cozy background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-200/30 dark:bg-amber-800/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-200/30 dark:bg-orange-800/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-red-200/30 dark:bg-red-800/20 rounded-full blur-xl"></div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-24 md:py-32 relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Hero Content */}
          <motion.div 
            className="flex flex-col justify-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-6">
              <Badge variant="secondary" className="w-fit bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                <Coffee className="mr-2 h-4 w-4" />
                Cozy crossword nights
              </Badge>
              
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Crossword nights,{" "}
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  together
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Gather your friends for the coziest crossword solving experience. 
                Share laughs, celebrate victories, and create memories one puzzle at a time.
              </p>
            </div>

            {/* Room Creation and Joining */}
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button 
                  size="lg" 
                  onClick={handleStartRoom}
                  className="text-lg px-8 py-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Start a room
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Or join a friend's room</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 6-letter code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="flex-1 text-center font-mono text-lg tracking-wider"
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  />
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleJoinRoom}
                    disabled={isJoining || roomCode.length !== 6}
                    className="px-6"
                  >
                    Join
                  </Button>
                </div>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span>1-week free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>No credit card required</span>
              </div>
            </div>
          </motion.div>

          {/* Room Preview Visual */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl ring-1 ring-amber-200/50 dark:ring-amber-800/50 p-8 shadow-2xl">
              {/* Room header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-muted-foreground">Room ABC123</span>
                </div>
                <div className="flex -space-x-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white dark:ring-gray-900"
                    />
                  ))}
                </div>
              </div>

              {/* Crossword grid preview */}
              <div className="grid grid-cols-5 gap-1 mb-4">
                {Array.from({ length: 25 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="aspect-square rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-800 dark:text-amber-200 font-bold text-sm border border-amber-200/50 dark:border-amber-800/50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.02 }}
                  >
                    {i === 12 ? <Puzzle className="h-4 w-4" /> : 
                     i === 6 || i === 8 || i === 16 || i === 18 ? String.fromCharCode(65 + (i % 26)) : ''}
                  </motion.div>
                ))}
              </div>

              {/* Live activity indicator */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Users className="h-3 w-3" />
                  <span>4 solving together</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              </div>

              {/* Cozy vibes indicator */}
              <div className="flex items-center justify-center space-x-1 text-xs text-amber-600 dark:text-amber-400 mt-2">
                <Heart className="h-3 w-3" />
                <span>Cozy vibes</span>
              </div>

              {/* Cozy elements */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                <Heart className="h-3 w-3 text-white" />
              </div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                <Coffee className="h-3 w-3 text-white" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
