import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Star, 
  Zap, 
  Users, 
  Shield, 
  Sparkles, 
  X, 
  CheckCircle, 
  ArrowRight,
  Gift,
  Lock,
  Unlock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PremiumUpgradePromptProps {
  trigger: 'role_limit' | 'feature_restriction' | 'hint_limit' | 'export_restriction' | 'share_restriction' | 'analytics_restriction';
  currentFeature?: string;
  isVisible: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
  onRemindLater: () => void;
  className?: string;
}

const triggerConfigs = {
  role_limit: {
    title: 'Unlock Premium Collaboration',
    description: 'Upgrade to premium to invite more players and collaborate with unlimited participants.',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    features: [
      'Invite up to 10 players per room',
      'Unlimited spectator access',
      'Advanced role management',
      'Priority support'
    ]
  },
  feature_restriction: {
    title: 'Premium Features Available',
    description: 'Access advanced puzzle features and collaboration tools with premium.',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    features: [
      'Advanced puzzle types',
      'Custom room settings',
      'Real-time collaboration',
      'Enhanced analytics'
    ]
  },
  hint_limit: {
    title: 'Unlimited Hints with Premium',
    description: 'Get unlimited hints and advanced puzzle assistance with premium.',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    features: [
      'Unlimited hints per puzzle',
      'Smart hint suggestions',
      'Advanced puzzle analysis',
      'Progress tracking'
    ]
  },
  export_restriction: {
    title: 'Export Puzzles with Premium',
    description: 'Save and share your favorite puzzles with premium export features.',
    icon: Sparkles,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    features: [
      'Export puzzles to PDF',
      'Share custom puzzles',
      'Print high-quality puzzles',
      'Create puzzle collections'
    ]
  },
  share_restriction: {
    title: 'Share Puzzles with Premium',
    description: 'Share your puzzles and achievements with premium sharing features.',
    icon: Gift,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    features: [
      'Share to social media',
      'Create puzzle challenges',
      'Public puzzle gallery',
      'Achievement sharing'
    ]
  },
  analytics_restriction: {
    title: 'Advanced Analytics with Premium',
    description: 'Get detailed insights into your puzzle-solving performance with premium analytics.',
    icon: Shield,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    features: [
      'Detailed performance metrics',
      'Progress tracking',
      'Skill analysis',
      'Personalized recommendations'
    ]
  }
};

const premiumFeatures = [
  {
    icon: Crown,
    title: 'Premium Collaboration',
    description: 'Invite up to 10 players per room with advanced role management'
  },
  {
    icon: Zap,
    title: 'Unlimited Hints',
    description: 'Get unlimited hints and smart suggestions for every puzzle'
  },
  {
    icon: Sparkles,
    title: 'Advanced Features',
    description: 'Access premium puzzle types and advanced collaboration tools'
  },
  {
    icon: Shield,
    title: 'Priority Support',
    description: 'Get priority customer support and early access to new features'
  }
];

export function PremiumUpgradePrompt({
  trigger,
  currentFeature,
  isVisible,
  onUpgrade,
  onDismiss,
  onRemindLater,
  className
}: PremiumUpgradePromptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const config = triggerConfigs[trigger];
  const IconComponent = config.icon;

  useEffect(() => {
    if (isVisible) {
      setDismissed(false);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  const handleRemindLater = () => {
    setDismissed(true);
    onRemindLater();
  };

  if (!isVisible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn('w-full', className)}
      >
        <Card className={cn(
          'border-2 shadow-lg',
          config.bgColor,
          config.borderColor
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-full',
                  config.bgColor,
                  config.color
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className={cn('text-lg', config.color)}>
                    {config.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {config.description}
                  </CardDescription>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Current Feature Restriction */}
            {currentFeature && (
              <div className="flex items-center gap-2 p-3 bg-white/50 rounded-lg border">
                <Lock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  <strong>{currentFeature}</strong> requires premium
                </span>
              </div>
            )}

            {/* Features List */}
            <div className="space-y-2">
              {config.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* Expandable Premium Features */}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full justify-between"
              >
                <span className="text-sm font-medium">
                  {isExpanded ? 'Hide' : 'Show'} all premium features
                </span>
                <ArrowRight className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-90'
                )} />
              </Button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-3"
                  >
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {premiumFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                          <feature.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-sm">{feature.title}</h4>
                            <p className="text-xs text-gray-600">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={onUpgrade}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
              
              <Button
                variant="outline"
                onClick={handleRemindLater}
                className="px-4"
              >
                Remind Later
              </Button>
            </div>

            {/* Pricing Info */}
            <div className="text-center pt-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>Starting at $9.99/month</span>
                <Badge variant="secondary" className="text-xs">
                  Cancel anytime
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for smaller spaces
export function PremiumUpgradePromptCompact({
  trigger,
  isVisible,
  onUpgrade,
  onDismiss,
  className
}: Pick<PremiumUpgradePromptProps, 'trigger' | 'isVisible' | 'onUpgrade' | 'onDismiss' | 'className'>) {
  const [dismissed, setDismissed] = useState(false);

  const config = triggerConfigs[trigger];
  const IconComponent = config.icon;

  useEffect(() => {
    if (isVisible) {
      setDismissed(false);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  if (!isVisible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className={cn('w-full', className)}
      >
        <Card className={cn(
          'border-l-4 shadow-md',
          config.bgColor,
          config.borderColor
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconComponent className={cn('h-4 w-4', config.color)} />
                <span className="text-sm font-medium">{config.title}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onUpgrade}
                  className="h-6 px-2 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Progress-based upgrade prompt
interface PremiumProgressPromptProps {
  currentProgress: number;
  maxProgress: number;
  feature: string;
  isVisible: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
  className?: string;
}

export function PremiumProgressPrompt({
  currentProgress,
  maxProgress,
  feature,
  isVisible,
  onUpgrade,
  onDismiss,
  className
}: PremiumProgressPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const progressPercentage = (currentProgress / maxProgress) * 100;

  useEffect(() => {
    if (isVisible) {
      setDismissed(false);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  if (!isVisible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn('w-full', className)}
      >
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Free limit reached</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{feature}</span>
                  <span>{currentProgress}/{maxProgress}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onUpgrade}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  <Unlock className="h-3 w-3 mr-1" />
                  Unlock with Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
