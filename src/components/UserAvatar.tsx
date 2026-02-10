import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeConfig = {
  sm: {
    avatar: 'h-6 w-6',
    text: 'text-xs',
  },
  md: {
    avatar: 'h-8 w-8',
    text: 'text-sm',
  },
  lg: {
    avatar: 'h-10 w-10',
    text: 'text-base',
  },
  xl: {
    avatar: 'h-12 w-12',
    text: 'text-lg',
  }
};

export function UserAvatar({
  userId,
  userName,
  userEmail,
  avatarUrl,
  isOnline = true,
  size = 'md',
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

  const statusColor = isOnline ? 'bg-green-500' : 'bg-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center gap-2', className)}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className={cn(sizeInfo.avatar, onClick && 'cursor-pointer hover:scale-105 transition-transform')}>
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className={cn(sizeInfo.text, 'font-medium')}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900',
          statusColor
        )} />
      </div>

      <div className="flex flex-col min-w-0">
        <span className={cn('font-medium truncate', sizeInfo.text)}>
          {userName}
        </span>
        {userEmail && (
          <span className="text-xs text-muted-foreground truncate">
            {userEmail}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function UserAvatarCompact(props: UserAvatarProps) {
  return <UserAvatar {...props} size="sm" />;
}

export function UserAvatarListItem(props: UserAvatarProps) {
  return <UserAvatar {...props} size="md" />;
}
