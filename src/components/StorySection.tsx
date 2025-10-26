"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Share2, 
  Puzzle, 
  Smartphone, 
  Laptop, 
  Trophy, 
  Flame,
  ArrowRight,
  Heart,
  Coffee,
  Sparkles
} from "lucide-react";
import Link from "next/link";

interface StorySectionProps {
  className?: string;
}

export default function StorySection({ className = "" }: StorySectionProps) {
  const stories = [
    {
      id: "play-together",
      title: "Play Together",
      subtitle: "The magic happens when friends gather",
      icon: Users,
      color: "from-amber-500 to-orange-500",
      bgColor: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
      steps: [
        {
          icon: Users,
          title: "Start a room",
          description: "Create your cozy crossword space in seconds",
          action: "Host"
        },
        {
          icon: Share2,
          title: "Invite friends",
          description: "Share the 6-letter code or send a link",
          action: "Share"
        },
        {
          icon: Puzzle,
          title: "Solve together",
          description: "Watch letters appear in real-time as everyone contributes",
          action: "Collaborate"
        }
      ],
      cta: {
        text: "Start your first room",
        href: "/multiplayer/new",
        icon: ArrowRight
      },
      decorative: <Heart className="h-6 w-6 text-amber-500" />
    },
    {
      id: "save-resume",
      title: "Save & Resume",
      subtitle: "Your progress follows you everywhere",
      icon: Smartphone,
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
      steps: [
        {
          icon: Laptop,
          title: "Start on desktop",
          description: "Begin your puzzle on your computer",
          action: "Desktop"
        },
        {
          icon: Smartphone,
          title: "Continue on mobile",
          description: "Pick up exactly where you left off",
          action: "Mobile"
        },
        {
          icon: Puzzle,
          title: "Never lose progress",
          description: "Everything syncs automatically across devices",
          action: "Sync"
        }
      ],
      cta: {
        text: "Try cross-device solving",
        href: "/puzzles",
        icon: ArrowRight
      },
      decorative: <Sparkles className="h-6 w-6 text-blue-500" />
    },
    {
      id: "compete-improve",
      title: "Compete & Improve",
      subtitle: "Grow your skills and celebrate wins",
      icon: Trophy,
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
      steps: [
        {
          icon: Flame,
          title: "Build streaks",
          description: "Keep your solving momentum going",
          action: "Streak"
        },
        {
          icon: Trophy,
          title: "Earn achievements",
          description: "Unlock badges for your crossword mastery",
          action: "Achieve"
        },
        {
          icon: Users,
          title: "Climb leaderboards",
          description: "See how you stack up against friends",
          action: "Compete"
        }
      ],
      cta: {
        text: "View your progress",
        href: "/profile",
        icon: ArrowRight
      },
      decorative: <Coffee className="h-6 w-6 text-purple-500" />
    }
  ];

  return (
    <section className={`py-24 ${className}`}>
      <div className="container mx-auto max-w-7xl px-4">
        <motion.div 
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three cozy ways to enjoy puzzles
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you're solving solo or with friends, every moment is designed to feel warm and inviting.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className={`h-full bg-gradient-to-br ${story.bgColor} backdrop-blur-xl ring-1 ring-border hover:shadow-lg transition-all duration-300 group`}>
                <CardContent className="p-8">
                  {/* Story header */}
                  <div className="text-center mb-8">
                    <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${story.color} text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <story.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{story.title}</h3>
                    <p className="text-muted-foreground">{story.subtitle}</p>
                  </div>

                  {/* Story steps */}
                  <div className="space-y-6 mb-8">
                    {story.steps.map((step, stepIndex) => (
                      <motion.div
                        key={stepIndex}
                        className="flex items-start space-x-4"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: stepIndex * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r ${story.color} flex items-center justify-center text-white`}>
                          <step.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-foreground">{step.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${story.color} text-white font-medium`}>
                              {step.action}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="text-center">
                    <Button 
                      asChild 
                      className={`bg-gradient-to-r ${story.color} hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-200`}
                    >
                      <Link href={story.cta.href}>
                        {story.cta.text}
                        <story.cta.icon className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  {/* Decorative element */}
                  <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                    {story.decorative}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
