import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  UserX, 
  Crown, 
  Shield, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  X,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface RoleChangeNotificationProps {
  notification: {
    id: string;
    type: 'ROLE_CHANGED' | 'USER_PROMOTED' | 'USER_DEMOTED' | 'HOST_TRANSFERRED' | 'PARTICIPANT_REMOVED';
    userId: string;
    userName: string;
    userAvatar?: string;
    oldRole?: string;
    newRole?: string;
    reason?: string;
    timestamp: Date;
    isRead: boolean;
    isActionable: boolean;
  };
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  className?: string;
}

const roleIcons = {
  HOST: Crown,
  MODERATOR: Shield,
  PLAYER: UserCheck,
  SPECTATOR: Eye
};

const roleColors = {
  HOST: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  MODERATOR: 'bg-purple-100 text-purple-800 border-purple-200',
  PLAYER: 'bg-green-100 text-green-800 border-green-200',
  SPECTATOR: 'bg-gray-100 text-gray-800 border-gray-200'
};

const notificationTypes = {
  ROLE_CHANGED: {
    icon: UserCheck,
    color: 'text-blue-600',
    title: 'Role Changed'
  },
  USER_PROMOTED: {
    icon: UserCheck,
    color: 'text-green-600',
    title: 'User Promoted'
  },
  USER_DEMOTED: {
    icon: UserX,
    color: 'text-orange-600',
    title: 'User Demoted'
  },
  HOST_TRANSFERRED: {
    icon: Crown,
    color: 'text-yellow-600',
    title: 'Host Transferred'
  },
  PARTICIPANT_REMOVED: {
    icon: UserX,
    color: 'text-red-600',
    title: 'Participant Removed'
  }
};

export function RoleChangeNotification({
  notification,
  onDismiss,
  onMarkAsRead,
  onAction,
  className
}: RoleChangeNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const notificationConfig = notificationTypes[notification.type];
  const IconComponent = notificationConfig.icon;
  const OldRoleIcon = notification.oldRole ? roleIcons[notification.oldRole as keyof typeof roleIcons] : null;
  const NewRoleIcon = notification.newRole ? roleIcons[notification.newRole as keyof typeof roleIcons] : null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id);
  };

  const handleAction = (action: string) => {
    onAction?.(notification.id, action);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn('w-full', className)}
      >
        <Card className={cn(
          'border-l-4 transition-all duration-200 hover:shadow-md',
          notification.isRead ? 'opacity-75' : 'opacity-100',
          notification.type === 'USER_PROMOTED' && 'border-l-green-500',
          notification.type === 'USER_DEMOTED' && 'border-l-orange-500',
          notification.type === 'HOST_TRANSFERRED' && 'border-l-yellow-500',
          notification.type === 'PARTICIPANT_REMOVED' && 'border-l-red-500',
          notification.type === 'ROLE_CHANGED' && 'border-l-blue-500'
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={notification.userAvatar} />
                <AvatarFallback>
                  {notification.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className={cn('h-4 w-4', notificationConfig.color)} />
                  <span className="font-medium text-sm">
                    {notificationConfig.title}
                  </span>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">{notification.userName}</span>
                  {notification.oldRole && notification.newRole && (
                    <span className="mx-1">
                      was changed from{' '}
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs', roleColors[notification.oldRole as keyof typeof roleColors])}
                      >
                        {notification.oldRole}
                      </Badge>
                      {' '}to{' '}
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs', roleColors[notification.newRole as keyof typeof roleColors])}
                      >
                        {notification.newRole}
                      </Badge>
                    </span>
                  )}
                  {notification.type === 'HOST_TRANSFERRED' && (
                    <span> is now the host</span>
                  )}
                  {notification.type === 'PARTICIPANT_REMOVED' && (
                    <span> was removed from the room</span>
                  )}
                </div>

                {/* Reason */}
                {notification.reason && (
                  <div className="text-xs text-gray-500 mb-2">
                    <strong>Reason:</strong> {notification.reason}
                  </div>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(notification.timestamp)}
                </div>

                {/* Expandable details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-gray-100"
                  >
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500">
                        <strong>User ID:</strong> {notification.userId}
                      </div>
                      <div className="text-xs text-gray-500">
                        <strong>Timestamp:</strong> {notification.timestamp.toLocaleString()}
                      </div>
                      {notification.isActionable && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction('approve')}
                            className="h-6 px-2 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction('reject')}
                            className="h-6 px-2 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {!notification.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleMarkAsRead}
                    className="h-6 w-6 p-0"
                    title="Mark as read"
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <X className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  title="Dismiss"
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

// Notification list component
interface RoleChangeNotificationListProps {
  notifications: RoleChangeNotificationProps['notification'][];
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  className?: string;
}

export function RoleChangeNotificationList({
  notifications,
  onDismiss,
  onMarkAsRead,
  onAction,
  onMarkAllAsRead,
  onClearAll,
  className
}: RoleChangeNotificationListProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">Role Changes</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onMarkAllAsRead && unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkAllAsRead}
              className="h-6 px-2 text-xs"
            >
              Mark all read
            </Button>
          )}
          {onClearAll && notifications.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClearAll}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No role change notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <RoleChangeNotification
              key={notification.id}
              notification={notification}
              onDismiss={onDismiss}
              onMarkAsRead={onMarkAsRead}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
