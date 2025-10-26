"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Gift,
  Coffee,
  Star,
  Users
} from "lucide-react";
import Link from "next/link";

interface TrialMessagingProps {
  hasActiveTrial?: boolean;
  trialDaysRemaining?: number;
  trialExpiresAt?: Date;
  showCountdown?: boolean;
}

export default function TrialMessaging({
  hasActiveTrial = false,
  trialDaysRemaining = 7,
  trialExpiresAt,
  showCountdown = true
}: TrialMessagingProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);

  // Calculate time remaining if trial expires soon
  useEffect(() => {
    if (hasActiveTrial && trialExpiresAt && showCountdown) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const expiry = new Date(trialExpiresAt).getTime();
        const difference = expiry - now;

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

          setTimeRemaining({ days, hours, minutes });
        } else {
          setTimeRemaining(null);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [hasActiveTrial, trialExpiresAt, showCountdown]);

  const isTrialExpiringSoon = timeRemaining && timeRemaining.days <= 2;

  return (
    <div className="space-y-6">
      {/* Main Trial Messaging */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 backdrop-blur-xl ring-1 ring-amber-200/50 dark:ring-amber-800/50 border-0">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                  <Heart className="mr-1 h-3 w-3" />
                  Free Trial
                </Badge>
              </div>
              
              <h3 className="text-2xl font-bold text-foreground">
                {hasActiveTrial ? "Enjoying your trial?" : "Start your cozy crossword journey"}
              </h3>
              
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {hasActiveTrial 
                  ? "You're experiencing the full premium crossword experience. No interruptions, just pure solving joy."
                  : "Experience premium crosswords, multiplayer rooms, and unlimited hints with our 1-week free trial."
                }
              </p>

              <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>1-week free trial</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>

              {!hasActiveTrial && (
                <div className="pt-4">
                  <Button 
                    asChild 
                    size="lg"
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Link href="/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trial Countdown */}
      <AnimatePresence>
        {hasActiveTrial && timeRemaining && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`backdrop-blur-xl ring-1 ${
              isTrialExpiringSoon 
                ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 ring-red-200/50 dark:ring-red-800/50' 
                : 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 ring-blue-200/50 dark:ring-blue-800/50'
            }`}>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className={`h-5 w-5 ${isTrialExpiringSoon ? 'text-red-500' : 'text-blue-500'}`} />
                    <h4 className={`font-semibold ${isTrialExpiringSoon ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                      {isTrialExpiringSoon ? 'Trial ending soon!' : 'Trial time remaining'}
                    </h4>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-6">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${isTrialExpiringSoon ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {timeRemaining.days}
                      </div>
                      <div className="text-xs text-muted-foreground">days</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${isTrialExpiringSoon ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {timeRemaining.hours}
                      </div>
                      <div className="text-xs text-muted-foreground">hours</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${isTrialExpiringSoon ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {timeRemaining.minutes}
                      </div>
                      <div className="text-xs text-muted-foreground">minutes</div>
                    </div>
                  </div>

                  {isTrialExpiringSoon && (
                    <div className="pt-2">
                      <Button 
                        asChild 
                        size="sm"
                        className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                      >
                        <Link href="/upgrade">
                          Continue Premium
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Trial Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Coffee className="h-5 w-5 text-amber-500" />,
              title: "Cozy Experience",
              description: "Ad-free solving with warm, inviting design"
            },
            {
              icon: <Users className="h-5 w-5 text-blue-500" />,
              title: "Social Solving",
              description: "Create rooms and solve with friends"
            },
            {
              icon: <Sparkles className="h-5 w-5 text-purple-500" />,
              title: "Unlimited Hints",
              description: "Get help when you need it most"
            }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              className="flex items-center space-x-3 p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            >
              {benefit.icon}
              <div>
                <div className="font-medium text-foreground text-sm">{benefit.title}</div>
                <div className="text-xs text-muted-foreground">{benefit.description}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer Trial Note */}
      <motion.div
        className="text-center py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <p className="text-sm text-muted-foreground">
          1-week free trial • Cancel anytime • No credit card required
        </p>
      </motion.div>
    </div>
  );
}
