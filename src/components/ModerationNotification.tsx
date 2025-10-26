/**
 * Moderation notification components for displaying moderation actions to users
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Ban, 
  UserCheck, 
  MessageSquare, 
  Clock, 
  X,
  CheckCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModerationNotification {
  id: string;
  type: 'warning' | 'mute' | 'unmute' | 'ban' | 'unban' | 'message_deleted' | 'message_edited';
  userId: string;
  userName: string;
  reason?: string;
  duration?: number; // in milliseconds
  timestamp: Date;
  dismissed?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface ModerationNotificationProps {
  notification: ModerationNotification;
  onDismiss: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  className?: string;
}

export function ModerationNotification({
  notification,
  onDismiss,
  onAcknowledge,
  className
}: ModerationNotificationProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'mute':
        return <Ban className="h-4 w-4 text-orange-500" />;
      case 'unmute':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'ban':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'unban':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'message_deleted':
        return <MessageSquare className="h-4 w-4 text-red-500" />;
      case 'message_edited':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (notification.severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getTitle = () => {
    switch (notification.type) {
      case 'warning':
        return 'Warning Issued';
      case 'mute':
        return 'You have been muted';
      case 'unmute':
        return 'You have been unmuted';
      case 'ban':
        return 'You have been banned';
      case 'unban':
        return 'You have been unbanned';
      case 'message_deleted':
        return 'Your message was deleted';
      case 'message_edited':
        return 'Your message was edited';
      default:
        return 'Moderation Action';
    }
  };

  const getDescription = () => {
    const baseDescription = `You have been ${notification.type.replace('_', ' ')}`;
    
    if (notification.reason) {
      return `${baseDescription}: ${notification.reason}`;
    }
    
    return baseDescription;
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'Less than a minute';
    }
  };

  if (notification.dismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={className}
    >
      <Alert className={`${getSeverityColor()} border-l-4`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{getTitle()}</h4>
                {notification.severity && (
                  <Badge variant="outline" className="text-xs">
                    {notification.severity}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(notification.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <AlertDescription className="mt-1">
              {getDescription()}
            </AlertDescription>
            {notification.duration && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Duration: {formatDuration(notification.duration)}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {notification.timestamp.toLocaleString()}
              </span>
              {onAcknowledge && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAcknowledge(notification.id)}
                  className="h-6 text-xs"
                >
                  Acknowledge
                </Button>
              )}
            </div>
          </div>
        </div>
      </Alert>
    </motion.div>
  );
}

interface ModerationNotificationListProps {
  notifications: ModerationNotification[];
  onDismiss: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onClearAll?: () => void;
  maxHeight?: string;
  className?: string;
}

export function ModerationNotificationList({
  notifications,
  onDismiss,
  onAcknowledge,
  onClearAll,
  maxHeight = '400px',
  className
}: ModerationNotificationListProps) {
  const activeNotifications = notifications.filter(n => !n.dismissed);
  const dismissedCount = notifications.length - activeNotifications.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Moderation Notifications</CardTitle>
          <div className="flex items-center gap-2">
            {dismissedCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {dismissedCount} dismissed
              </span>
            )}
            {onClearAll && activeNotifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-8"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div 
          className="space-y-3 overflow-y-auto"
          style={{ maxHeight }}
        >
          <AnimatePresence>
            {activeNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No moderation notifications</p>
              </div>
            ) : (
              activeNotifications.map((notification) => (
                <ModerationNotification
                  key={notification.id}
                  notification={notification}
                  onDismiss={onDismiss}
                  onAcknowledge={onAcknowledge}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModerationNotificationToastProps {
  notification: ModerationNotification;
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export function ModerationNotificationToast({
  notification,
  onDismiss,
  position = 'top-right',
  className
}: ModerationNotificationToastProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: position.includes('right') ? 100 : -100 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: position.includes('right') ? 100 : -100 }}
      className={`fixed ${getPositionClasses()} z-50 max-w-sm ${className}`}
    >
      <ModerationNotification
        notification={notification}
        onDismiss={onDismiss}
      />
    </motion.div>
  );
}
