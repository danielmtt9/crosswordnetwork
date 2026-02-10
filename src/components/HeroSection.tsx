"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Puzzle, 
  ArrowRight,
  Sparkles,
  Coffee,
  Heart,
  Play
} from "lucide-react";

export default function HeroSection() {
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
                Cozy crossword moments
              </Badge>
              
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Relax and solve,{" "}
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  unwind
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Enjoy a curated collection of crossword puzzles designed for your relaxation.
                Track your progress, earn achievements, and solve at your own pace.
              </p>
            </div>

            {/* Play Now CTA */}
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button 
                  size="lg" 
                  asChild
                  className="text-lg px-8 py-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Link href="/puzzles">
                    <Play className="mr-2 h-5 w-5" />
                    Play Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Pure puzzles, no distractions</span>
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
                  <span className="text-sm font-medium text-muted-foreground">Daily Puzzle</span>
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
