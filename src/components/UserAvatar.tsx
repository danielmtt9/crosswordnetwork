import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleIndicator, RoleIndicatorCompact, UserRole, SubscriptionStatus, UserStatus } from './RoleIndicator';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  role: UserRole;
  subscriptionStatus?: SubscriptionStatus;
  isOnline?: boolean;
  userStatus?: UserStatus;
  isPremium?: boolean;
  isHost?: boolean;
  isModerator?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRole?: boolean;
  showStatus?: boolean;
  showSubscription?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeConfig = {
  sm: {
    avatar: 'h-6 w-6',
    text: 'text-xs',
    roleSize: 'sm' as const
  },
  md: {
    avatar: 'h-8 w-8',
    text: 'text-sm',
    roleSize: 'sm' as const
  },
  lg: {
    avatar: 'h-10 w-10',
    text: 'text-base',
    roleSize: 'md' as const
  },
  xl: {
    avatar: 'h-12 w-12',
    text: 'text-lg',
    roleSize: 'md' as const
  }
};

export function UserAvatar({
  userId,
  userName,
  userEmail,
  avatarUrl,
  role,
  subscriptionStatus,
  isOnline = true,
  userStatus = 'online',
  isPremium = false,
  isHost = false,
  isModerator = false,
  size = 'md',
  showRole = true,
  showStatus = true,
  showSubscription = true,
  className,
  onClick
}: UserAvatarProps) {
  const sizeInfo = sizeConfig[size];
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = () => {
    switch (userStatus) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center gap-2', className)}
      onClick={onClick}
    >
      {/* Avatar with Status Indicator */}
      <div className="relative">
        <Avatar className={cn(sizeInfo.avatar, onClick && 'cursor-pointer hover:scale-105 transition-transform')}>
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className={cn(sizeInfo.text, 'font-medium')}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Online Status Indicator */}
        {showStatus && (
          <div className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900',
            getStatusColor()
          )} />
        )}
      </div>

      {/* User Info */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium truncate', sizeInfo.text)}>
            {userName}
          </span>
          {isHost && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              (Host)
            </span>
          )}
        </div>
        
        {/* Role and Subscription Indicators */}
        {showRole && (
          <div className="flex items-center gap-1">
            {size === 'sm' || size === 'md' ? (
              <RoleIndicatorCompact
                role={role}
                subscriptionStatus={subscriptionStatus}
                isOnline={isOnline}
                userStatus={userStatus}
                isPremium={isPremium}
                isHost={isHost}
                isModerator={isModerator}
              />
            ) : (
              <RoleIndicator
                role={role}
                subscriptionStatus={subscriptionStatus}
                isOnline={isOnline}
                userStatus={userStatus}
                isPremium={isPremium}
                isHost={isHost}
                isModerator={isModerator}
                showStatus={showStatus}
                showSubscription={showSubscription}
                size={sizeInfo.roleSize}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Compact version for lists
export function UserAvatarCompact({
  userId,
  userName,
  avatarUrl,
  role,
  subscriptionStatus,
  isOnline = true,
  userStatus = 'online',
  isPremium = false,
  isHost = false,
  isModerator = false,
  className,
  onClick
}: Omit<UserAvatarProps, 'size' | 'showRole' | 'showStatus' | 'showSubscription'>) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = () => {
    switch (userStatus) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center gap-2', className)}
      onClick={onClick}
    >
      {/* Avatar with Status Indicator */}
      <div className="relative">
        <Avatar className={cn('h-6 w-6', onClick && 'cursor-pointer hover:scale-105 transition-transform')}>
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className="text-xs font-medium">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Online Status Indicator */}
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-gray-900',
          getStatusColor()
        )} />
      </div>

      {/* User Name */}
      <span className="text-sm font-medium truncate">
        {userName}
      </span>

      {/* Role Indicator */}
      <RoleIndicatorCompact
        role={role}
        subscriptionStatus={subscriptionStatus}
        isOnline={isOnline}
        userStatus={userStatus}
        isPremium={isPremium}
        isHost={isHost}
        isModerator={isModerator}
      />
    </motion.div>
  );
}

// List item version
export function UserAvatarListItem({
  userId,
  userName,
  userEmail,
  avatarUrl,
  role,
  subscriptionStatus,
  isOnline = true,
  userStatus = 'online',
  isPremium = false,
  isHost = false,
  isModerator = false,
  className,
  onClick
}: Omit<UserAvatarProps, 'size' | 'showRole' | 'showStatus' | 'showSubscription'>) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = () => {
    switch (userStatus) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Avatar with Status Indicator */}
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className="text-sm font-medium">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Online Status Indicator */}
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900',
          getStatusColor()
        )} />
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {userName}
          </span>
          {isHost && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              (Host)
            </span>
          )}
        </div>
        {userEmail && (
          <p className="text-sm text-muted-foreground truncate">
            {userEmail}
          </p>
        )}
      </div>

      {/* Role Indicator */}
      <RoleIndicatorCompact
        role={role}
        subscriptionStatus={subscriptionStatus}
        isOnline={isOnline}
        userStatus={userStatus}
        isPremium={isPremium}
        isHost={isHost}
        isModerator={isModerator}
      />
    </motion.div>
  );
}
