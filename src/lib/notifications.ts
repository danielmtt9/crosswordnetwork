import { prisma } from '@/lib/prisma';

export type NotificationType = 
  | 'ACHIEVEMENT_UNLOCKED'
  | 'FRIEND_REQUEST'
  | 'ROOM_INVITE'
  | 'JOIN_REQUEST'
  | 'STREAK_MILESTONE'
  | 'RANK_CHANGE'
  | 'DAILY_REMINDER'
  | 'WEEKLY_SUMMARY';

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Create a new notification
export async function createNotification(data: CreateNotificationData): Promise<NotificationData> {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      metadata: data.metadata || {},
    },
  });

  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type as NotificationType,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl || undefined,
    metadata: notification.metadata as Record<string, any> || {},
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}

// Get notifications for a user
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationData[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return notifications.map(notification => ({
    id: notification.id,
    userId: notification.userId,
    type: notification.type as NotificationType,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl || undefined,
    metadata: notification.metadata as Record<string, any> || {},
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  }));
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<void> {
  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

// Delete old notifications (cleanup)
export async function deleteOldNotifications(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      isRead: true,
    },
  });

  return result.count;
}

// Achievement notification helpers
export async function createAchievementNotification(
  userId: string,
  achievement: {
    name: string;
    description: string | null;
    tier: string;
    points: number;
  }
): Promise<NotificationData> {
  return createNotification({
    userId,
    type: 'ACHIEVEMENT_UNLOCKED',
    title: 'Achievement Unlocked!',
    message: `You earned the "${achievement.name}" achievement (+${achievement.points} points)`,
    actionUrl: '/achievements',
    metadata: {
      achievementName: achievement.name,
      achievementTier: achievement.tier,
      points: achievement.points,
    },
  });
}

// Streak milestone notification
export async function createStreakMilestoneNotification(
  userId: string,
  streakDays: number
): Promise<NotificationData> {
  return createNotification({
    userId,
    type: 'STREAK_MILESTONE',
    title: 'Streak Milestone!',
    message: `Amazing! You've maintained a ${streakDays}-day solving streak!`,
    actionUrl: '/dashboard',
    metadata: {
      streakDays,
    },
  });
}

// Rank change notification
export async function createRankChangeNotification(
  userId: string,
  oldRank: number | null,
  newRank: number
): Promise<NotificationData> {
  const improved = !oldRank || newRank < oldRank;
  const title = improved ? 'Rank Improved!' : 'Rank Update';
  const message = improved 
    ? `Congratulations! You moved up to rank #${newRank}`
    : `Your current rank is #${newRank}`;

  return createNotification({
    userId,
    type: 'RANK_CHANGE',
    title,
    message,
    actionUrl: '/leaderboards',
    metadata: {
      oldRank,
      newRank,
      improved,
    },
  });
}

// Daily reminder notification
export async function createDailyReminderNotification(
  userId: string,
  streakDays: number
): Promise<NotificationData> {
  return createNotification({
    userId,
    type: 'DAILY_REMINDER',
    title: 'Keep Your Streak Going!',
    message: `Don't break your ${streakDays}-day streak! Solve a puzzle today.`,
    actionUrl: '/puzzles',
    metadata: {
      streakDays,
    },
  });
}

// Weekly summary notification
export async function createWeeklySummaryNotification(
  userId: string,
  summary: {
    puzzlesCompleted: number;
    totalScore: number;
    achievementsEarned: number;
    rankChange: number;
  }
): Promise<NotificationData> {
  return createNotification({
    userId,
    type: 'WEEKLY_SUMMARY',
    title: 'Weekly Summary',
    message: `This week: ${summary.puzzlesCompleted} puzzles completed, ${summary.achievementsEarned} achievements earned!`,
    actionUrl: '/dashboard',
    metadata: summary,
  });
}