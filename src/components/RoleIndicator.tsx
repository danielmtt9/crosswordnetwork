import React from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Eye, 
  Users, 
  Shield, 
  Star, 
  Zap, 
  Lock, 
  Unlock,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type UserRole = 'HOST' | 'PLAYER' | 'SPECTATOR' | 'MODERATOR';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

interface RoleIndicatorProps {
  role: UserRole;
  subscriptionStatus?: SubscriptionStatus;
  isOnline?: boolean;
  userStatus?: UserStatus;
  isPremium?: boolean;
  isHost?: boolean;
  isModerator?: boolean;
  showStatus?: boolean;
  showSubscription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tooltip?: string;
}

const roleConfig = {
  HOST: {
    icon: Crown,
    label: 'Host',
    color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
  },
  PLAYER: {
    icon: Users,
    label: 'Player',
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  SPECTATOR: {
    icon: Eye,
    label: 'Spectator',
    color: 'bg-gradient-to-r from-gray-500 to-slate-500',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20'
  },
  MODERATOR: {
    icon: Shield,
    label: 'Moderator',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  }
};

const subscriptionConfig = {
  ACTIVE: {
    icon: Star,
    label: 'Premium',
    color: 'bg-gradient-to-r from-amber-500 to-yellow-500',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20'
  },
  TRIAL: {
    icon: Clock,
    label: 'Trial',
    color: 'bg-gradient-to-r from-green-500 to-emerald-500',
    textColor: 'text-green-700 dark:text-green-300',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20'
  },
  CANCELLED: {
    icon: AlertCircle,
    label: 'Cancelled',
    color: 'bg-gradient-to-r from-red-500 to-rose-500',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20'
  },
  EXPIRED: {
    icon: Lock,
    label: 'Expired',
    color: 'bg-gradient-to-r from-gray-500 to-slate-500',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20'
  }
};

const statusConfig = {
  online: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    label: 'Online'
  },
  offline: {
    icon: AlertCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    label: 'Offline'
  },
  away: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    label: 'Away'
  },
  busy: {
    icon: Lock,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    label: 'Busy'
  }
};

const sizeConfig = {
  sm: {
    iconSize: 'h-3 w-3',
    textSize: 'text-xs',
    padding: 'px-2 py-0.5',
    gap: 'gap-1'
  },
  md: {
    iconSize: 'h-4 w-4',
    textSize: 'text-sm',
    padding: 'px-2.5 py-1',
    gap: 'gap-1.5'
  },
  lg: {
    iconSize: 'h-5 w-5',
    textSize: 'text-base',
    padding: 'px-3 py-1.5',
    gap: 'gap-2'
  }
};

export function RoleIndicator({
  role,
  subscriptionStatus,
  isOnline = true,
  userStatus = 'online',
  isPremium = false,
  isHost = false,
  isModerator = false,
  showStatus = true,
  showSubscription = true,
  size = 'md',
  className,
  tooltip
}: RoleIndicatorProps) {
  const roleInfo = roleConfig[role];
  const subscriptionInfo = subscriptionStatus ? subscriptionConfig[subscriptionStatus] : null;
  const statusInfo = statusConfig[userStatus];
  const sizeInfo = sizeConfig[size];
  
  const IconComponent = roleInfo.icon;
  const StatusIcon = statusInfo.icon;
  const SubscriptionIcon = subscriptionInfo?.icon;

  const getTooltipText = () => {
    if (tooltip) return tooltip;
    
    const parts = [roleInfo.label];
    if (subscriptionInfo) parts.push(subscriptionInfo.label);
    if (showStatus) parts.push(statusInfo.label);
    return parts.join(' • ');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center', className)}>
            {/* Role Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'inline-flex items-center rounded-full border font-medium transition-all duration-200 hover:scale-105',
                sizeInfo.padding,
                sizeInfo.gap,
                roleInfo.bgColor,
                roleInfo.borderColor,
                sizeInfo.textSize,
                roleInfo.textColor
              )}
            >
              <IconComponent className={sizeInfo.iconSize} />
              <span>{roleInfo.label}</span>
            </motion.div>

            {/* Subscription Badge */}
            {showSubscription && subscriptionInfo && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className={cn(
                  'ml-1 inline-flex items-center rounded-full border font-medium transition-all duration-200 hover:scale-105',
                  sizeInfo.padding,
                  sizeInfo.gap,
                  subscriptionInfo.bgColor,
                  subscriptionInfo.borderColor,
                  sizeInfo.textSize,
                  subscriptionInfo.textColor
                )}
              >
                <SubscriptionIcon className={sizeInfo.iconSize} />
                <span>{subscriptionInfo.label}</span>
              </motion.div>
            )}

            {/* Premium Badge */}
            {isPremium && !subscriptionInfo && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className={cn(
                  'ml-1 inline-flex items-center rounded-full border font-medium transition-all duration-200 hover:scale-105',
                  sizeInfo.padding,
                  sizeInfo.gap,
                  'bg-gradient-to-r from-amber-500 to-yellow-500',
                  'border-amber-500',
                  sizeInfo.textSize,
                  'text-amber-700 dark:text-amber-300'
                )}
              >
                <Star className={sizeInfo.iconSize} />
                <span>Premium</span>
              </motion.div>
            )}

            {/* Status Indicator */}
            {showStatus && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.2 }}
                className={cn(
                  'ml-1 inline-flex items-center rounded-full',
                  sizeInfo.padding,
                  sizeInfo.gap,
                  statusInfo.bgColor,
                  sizeInfo.textSize,
                  statusInfo.color
                )}
              >
                <StatusIcon className={sizeInfo.iconSize} />
                {size !== 'sm' && <span>{statusInfo.label}</span>}
              </motion.div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for lists
export function RoleIndicatorCompact({
  role,
  subscriptionStatus,
  isOnline = true,
  userStatus = 'online',
  isPremium = false,
  className
}: Omit<RoleIndicatorProps, 'showStatus' | 'showSubscription' | 'size'>) {
  const roleInfo = roleConfig[role];
  const subscriptionInfo = subscriptionStatus ? subscriptionConfig[subscriptionStatus] : null;
  const statusInfo = statusConfig[userStatus];
  
  const IconComponent = roleInfo.icon;
  const StatusIcon = statusInfo.icon;
  const SubscriptionIcon = subscriptionInfo?.icon;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Role Icon */}
      <div className={cn(
        'flex items-center justify-center rounded-full p-1',
        roleInfo.bgColor,
        roleInfo.borderColor,
        'border'
      )}>
        <IconComponent className="h-3 w-3" />
      </div>

      {/* Subscription Icon */}
      {subscriptionInfo && (
        <div className={cn(
          'flex items-center justify-center rounded-full p-1',
          subscriptionInfo.bgColor,
          subscriptionInfo.borderColor,
          'border'
        )}>
          <SubscriptionIcon className="h-3 w-3" />
        </div>
      )}

      {/* Premium Icon */}
      {isPremium && !subscriptionInfo && (
        <div className="flex items-center justify-center rounded-full p-1 bg-gradient-to-r from-amber-500 to-yellow-500 border border-amber-500">
          <Star className="h-3 w-3 text-amber-700 dark:text-amber-300" />
        </div>
      )}

      {/* Status Dot */}
      <div className={cn(
        'h-2 w-2 rounded-full',
        userStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'
      )} />
    </div>
  );
}

// Badge-only version for simple displays
export function RoleBadge({
  role,
  subscriptionStatus,
  isPremium = false,
  size = 'md',
  className
}: Pick<RoleIndicatorProps, 'role' | 'subscriptionStatus' | 'isPremium' | 'size' | 'className'>) {
  const roleInfo = roleConfig[role];
  const subscriptionInfo = subscriptionStatus ? subscriptionConfig[subscriptionStatus] : null;
  const sizeInfo = sizeConfig[size];
  
  const IconComponent = roleInfo.icon;
  const SubscriptionIcon = subscriptionInfo?.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5',
        sizeInfo.padding,
        sizeInfo.textSize,
        roleInfo.bgColor,
        roleInfo.borderColor,
        roleInfo.textColor,
        className
      )}
    >
      <IconComponent className={sizeInfo.iconSize} />
      <span>{roleInfo.label}</span>
      {subscriptionInfo && (
        <>
          <SubscriptionIcon className={sizeInfo.iconSize} />
          <span>{subscriptionInfo.label}</span>
        </>
      )}
      {isPremium && !subscriptionInfo && (
        <>
          <Star className={sizeInfo.iconSize} />
          <span>Premium</span>
        </>
      )}
    </Badge>
  );
}