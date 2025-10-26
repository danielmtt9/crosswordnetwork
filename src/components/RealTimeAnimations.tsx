import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';
import { 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Clock, 
  Users, 
  Zap,
  TrendingUp,
  Target,
  Award,
  Star,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimationConfig {
  duration: number;
  delay: number;
  easing: string;
  scale: number;
  opacity: number;
}

interface RealTimeAnimationsProps {
  children: React.ReactNode;
  trigger: 'cell_completed' | 'achievement_unlocked' | 'conflict_resolved' | 'sync_complete' | 'user_joined' | 'user_left';
  config?: Partial<AnimationConfig>;
  className?: string;
}

const defaultConfigs: Record<string, AnimationConfig> = {
  cell_completed: {
    duration: 0.6,
    delay: 0,
    easing: 'easeOut',
    scale: 1.2,
    opacity: 1
  },
  achievement_unlocked: {
    duration: 1.0,
    delay: 0.1,
    easing: 'easeOut',
    scale: 1.3,
    opacity: 1
  },
  conflict_resolved: {
    duration: 0.8,
    delay: 0,
    easing: 'easeInOut',
    scale: 1.1,
    opacity: 0.9
  },
  sync_complete: {
    duration: 0.4,
    delay: 0,
    easing: 'easeOut',
    scale: 1.05,
    opacity: 0.8
  },
  user_joined: {
    duration: 0.7,
    delay: 0,
    easing: 'easeOut',
    scale: 1.15,
    opacity: 1
  },
  user_left: {
    duration: 0.5,
    delay: 0,
    easing: 'easeIn',
    scale: 0.9,
    opacity: 0.7
  }
};

export function RealTimeAnimations({
  children,
  trigger,
  config,
  className
}: RealTimeAnimationsProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false });

  const animationConfig = { ...defaultConfigs[trigger], ...config };

  useEffect(() => {
    if (isInView) {
      triggerAnimation();
    }
  }, [trigger, isInView]);

  const triggerAnimation = async () => {
    setIsAnimating(true);
    setAnimationKey(prev => prev + 1);

    await controls.start({
      scale: animationConfig.scale,
      opacity: animationConfig.opacity,
      transition: {
        duration: animationConfig.duration,
        delay: animationConfig.delay,
        ease: animationConfig.easing
      }
    });

    await controls.start({
      scale: 1,
      opacity: 1,
      transition: {
        duration: animationConfig.duration * 0.5,
        ease: 'easeOut'
      }
    });

    setIsAnimating(false);
  };

  const getAnimationVariants = () => {
    switch (trigger) {
      case 'cell_completed':
        return {
          initial: { scale: 1, opacity: 1 },
          animate: { 
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
            rotate: [0, 5, -5, 0]
          },
          exit: { scale: 0.8, opacity: 0 }
        };
      case 'achievement_unlocked':
        return {
          initial: { scale: 0, opacity: 0, rotate: -180 },
          animate: { 
            scale: [0, 1.3, 1],
            opacity: [0, 1, 1],
            rotate: [-180, 0, 10, -10, 0]
          },
          exit: { scale: 0, opacity: 0, rotate: 180 }
        };
      case 'conflict_resolved':
        return {
          initial: { scale: 1, opacity: 1 },
          animate: { 
            scale: [1, 1.1, 1],
            opacity: [1, 0.9, 1],
            backgroundColor: ['transparent', '#10b981', 'transparent']
          },
          exit: { scale: 0.9, opacity: 0 }
        };
      case 'sync_complete':
        return {
          initial: { scale: 1, opacity: 1 },
          animate: { 
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1]
          },
          exit: { scale: 0.95, opacity: 0.8 }
        };
      case 'user_joined':
        return {
          initial: { scale: 0, opacity: 0, y: 20 },
          animate: { 
            scale: [0, 1.15, 1],
            opacity: [0, 1, 1],
            y: [20, -5, 0]
          },
          exit: { scale: 0.8, opacity: 0, y: -20 }
        };
      case 'user_left':
        return {
          initial: { scale: 1, opacity: 1 },
          animate: { 
            scale: [1, 0.9, 0.8],
            opacity: [1, 0.7, 0],
            y: [0, 10, 20]
          },
          exit: { scale: 0.8, opacity: 0, y: 20 }
        };
      default:
        return {
          initial: { scale: 1, opacity: 1 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 1, opacity: 1 }
        };
    }
  };

  return (
    <motion.div
      ref={ref}
      key={animationKey}
      animate={controls}
      className={cn('relative', className)}
    >
      {children}
      
      {/* Animation overlay */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            variants={getAnimationVariants()}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              duration: animationConfig.duration,
              delay: animationConfig.delay,
              ease: animationConfig.easing
            }}
          >
            {getAnimationIcon(trigger)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function getAnimationIcon(trigger: string) {
  const iconProps = {
    className: 'w-6 h-6 text-white',
    style: { filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' }
  };

  switch (trigger) {
    case 'cell_completed':
      return <CheckCircle {...iconProps} />;
    case 'achievement_unlocked':
      return <Award {...iconProps} />;
    case 'conflict_resolved':
      return <AlertTriangle {...iconProps} />;
    case 'sync_complete':
      return <Zap {...iconProps} />;
    case 'user_joined':
      return <Users {...iconProps} />;
    case 'user_left':
      return <X {...iconProps} />;
    default:
      return <Star {...iconProps} />;
  }
}

// Specialized animation components
export function CellCompletionAnimation({ 
  isVisible, 
  onComplete 
}: { 
  isVisible: boolean; 
  onComplete?: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.5, 1],
            opacity: [0, 1, 0.8],
            rotate: [0, 360]
          }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            duration: 0.8,
            ease: 'easeOut'
          }}
          onAnimationComplete={onComplete}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 0.4,
              repeat: 2,
              ease: 'easeInOut'
            }}
            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-6 h-6 text-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AchievementUnlockAnimation({ 
  achievement, 
  isVisible, 
  onComplete 
}: { 
  achievement: { name: string; icon: string };
  isVisible: boolean;
  onComplete?: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ 
            scale: [0, 1.3, 1],
            opacity: [0, 1, 1],
            y: [50, -10, 0],
            rotate: [0, 10, -10, 0]
          }}
          exit={{ 
            scale: 0, 
            opacity: 0, 
            y: -50,
            rotate: 180
          }}
          transition={{ 
            duration: 1.2,
            ease: 'easeOut'
          }}
          onAnimationComplete={onComplete}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0 rgba(59, 130, 246, 0.4)',
                '0 0 0 20px rgba(59, 130, 246, 0)',
                '0 0 0 0 rgba(59, 130, 246, 0)'
              ]
            }}
            transition={{ 
              duration: 1.0,
              ease: 'easeOut'
            }}
            className="bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <Award className="w-6 h-6" />
            </motion.div>
            <div>
              <div className="font-semibold">Achievement Unlocked!</div>
              <div className="text-sm opacity-90">{achievement.name}</div>
            </div>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConflictResolutionAnimation({ 
  isVisible, 
  onComplete 
}: { 
  isVisible: boolean;
  onComplete?: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: [0, 1, 0.9],
            backgroundColor: ['transparent', '#10b981', 'transparent']
          }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            duration: 0.8,
            ease: 'easeOut'
          }}
          onAnimationComplete={onComplete}
          className="absolute inset-0 pointer-events-none z-20"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.9, 1, 0.9]
            }}
            transition={{ 
              duration: 0.4,
              repeat: 1,
              ease: 'easeInOut'
            }}
            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center"
          >
            <AlertTriangle className="w-6 h-6 text-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SyncStatusAnimation({ 
  isSyncing, 
  lastSyncAt 
}: { 
  isSyncing: boolean;
  lastSyncAt: number | null;
}) {
  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <motion.div
        animate={isSyncing ? { 
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8]
        } : {}}
        transition={{ 
          duration: 0.5,
          repeat: isSyncing ? Infinity : 0,
          ease: 'easeInOut'
        }}
        className="bg-white rounded-lg shadow-lg border p-3 flex items-center gap-2"
      >
        <motion.div
          animate={isSyncing ? { rotate: 360 } : {}}
          transition={{ 
            duration: 1,
            repeat: isSyncing ? Infinity : 0,
            ease: 'linear'
          }}
        >
          <Zap className="w-4 h-4 text-blue-500" />
        </motion.div>
        <div className="text-sm">
          {isSyncing ? 'Syncing...' : 'Synced'}
        </div>
        {lastSyncAt && (
          <div className="text-xs text-gray-500">
            {new Date(lastSyncAt).toLocaleTimeString()}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function ProgressBarAnimation({ 
  progress, 
  isAnimating 
}: { 
  progress: number;
  isAnimating: boolean;
}) {
  return (
    <motion.div
      className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
    >
      <motion.div
        className="h-full bg-blue-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ 
          duration: 0.5,
          ease: 'easeOut'
        }}
      >
        {isAnimating && (
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
            animate={{ 
              x: ['-100%', '100%'],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

export function UserJoinAnimation({ 
  userName, 
  isVisible, 
  onComplete 
}: { 
  userName: string;
  isVisible: boolean;
  onComplete?: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ 
            scale: [0, 1.15, 1],
            opacity: [0, 1, 1],
            y: [20, -5, 0]
          }}
          exit={{ 
            scale: 0.8, 
            opacity: 0, 
            y: -20
          }}
          transition={{ 
            duration: 0.7,
            ease: 'easeOut'
          }}
          onAnimationComplete={onComplete}
          className="fixed top-4 right-4 z-50 pointer-events-none"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 0 0 rgba(34, 197, 94, 0.4)',
                '0 0 0 10px rgba(34, 197, 94, 0)',
                '0 0 0 0 rgba(34, 197, 94, 0)'
              ]
            }}
            transition={{ 
              duration: 0.8,
              ease: 'easeOut'
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{userName} joined</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
