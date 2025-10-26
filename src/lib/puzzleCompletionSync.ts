/**
 * Puzzle completion status synchronization for real-time multiplayer
 */

export interface PuzzleCompletionStatus {
  puzzleId: string;
  roomId: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'abandoned';
  progress: {
    completedCells: number;
    totalCells: number;
    completionPercentage: number;
    currentSection?: string;
    lastCellCompleted?: {
      row: number;
      col: number;
      value: string;
      timestamp: number;
    };
  };
  timing: {
    startedAt: number;
    lastActivityAt: number;
    totalTimeSpent: number;
    estimatedTimeRemaining?: number;
  };
  performance: {
    accuracy: number;
    hintsUsed: number;
    mistakes: number;
    streak: number;
    bestStreak: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: number;
    category: 'speed' | 'accuracy' | 'streak' | 'completion' | 'social';
  }>;
  metadata: {
    deviceInfo?: string;
    browserInfo?: string;
    connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
    lastSyncAt: number;
  };
}

export interface CompletionSyncEvent {
  type: 'status_change' | 'progress_update' | 'achievement_unlocked' | 'completion' | 'sync';
  userId: string;
  puzzleId: string;
  roomId: string;
  timestamp: number;
  data: any;
}

export interface RoomCompletionSummary {
  roomId: string;
  puzzleId: string;
  totalParticipants: number;
  completedParticipants: number;
  averageProgress: number;
  averageTimeSpent: number;
  leaderboard: Array<{
    userId: string;
    userName: string;
    completionPercentage: number;
    timeSpent: number;
    rank: number;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    unlockedBy: string[];
    unlockedAt: number;
  }>;
  lastUpdated: number;
}

export class PuzzleCompletionSync {
  private statuses: Map<string, PuzzleCompletionStatus> = new Map();
  private syncEvents: CompletionSyncEvent[] = [];
  private listeners: Map<string, (event: CompletionSyncEvent) => void> = new Map();

  /**
   * Update puzzle completion status for a user
   */
  updateStatus(
    userId: string,
    puzzleId: string,
    roomId: string,
    updates: Partial<PuzzleCompletionStatus>
  ): PuzzleCompletionStatus {
    const key = `${userId}_${puzzleId}`;
    const existing = this.statuses.get(key);
    
    const updated: PuzzleCompletionStatus = {
      puzzleId,
      roomId,
      userId,
      status: updates.status || existing?.status || 'not_started',
      progress: {
        ...existing?.progress,
        ...updates.progress,
        completionPercentage: this.calculateCompletionPercentage(
          updates.progress?.completedCells || existing?.progress.completedCells || 0,
          updates.progress?.totalCells || existing?.progress.totalCells || 1
        )
      },
      timing: {
        ...existing?.timing,
        ...updates.timing,
        lastActivityAt: Date.now()
      },
      performance: {
        ...existing?.performance,
        ...updates.performance
      },
      achievements: updates.achievements || existing?.achievements || [],
      metadata: {
        ...existing?.metadata,
        ...updates.metadata,
        lastSyncAt: Date.now()
      }
    };

    this.statuses.set(key, updated);

    // Emit sync event
    this.emitSyncEvent({
      type: 'status_change',
      userId,
      puzzleId,
      roomId,
      timestamp: Date.now(),
      data: updated
    });

    return updated;
  }

  /**
   * Get completion status for a user
   */
  getStatus(userId: string, puzzleId: string): PuzzleCompletionStatus | undefined {
    const key = `${userId}_${puzzleId}`;
    return this.statuses.get(key);
  }

  /**
   * Get all statuses for a room
   */
  getRoomStatuses(roomId: string): PuzzleCompletionStatus[] {
    return Array.from(this.statuses.values())
      .filter(status => status.roomId === roomId);
  }

  /**
   * Get room completion summary
   */
  getRoomSummary(roomId: string, puzzleId: string): RoomCompletionSummary {
    const statuses = this.getRoomStatuses(roomId);
    const puzzleStatuses = statuses.filter(s => s.puzzleId === puzzleId);

    const totalParticipants = puzzleStatuses.length;
    const completedParticipants = puzzleStatuses.filter(s => s.status === 'completed').length;
    const averageProgress = puzzleStatuses.reduce((sum, s) => sum + s.progress.completionPercentage, 0) / totalParticipants;
    const averageTimeSpent = puzzleStatuses.reduce((sum, s) => sum + s.timing.totalTimeSpent, 0) / totalParticipants;

    // Create leaderboard
    const leaderboard = puzzleStatuses
      .map(status => ({
        userId: status.userId,
        userName: `User ${status.userId}`, // In real implementation, get from user service
        completionPercentage: status.progress.completionPercentage,
        timeSpent: status.timing.totalTimeSpent,
        rank: 0 // Will be calculated below
      }))
      .sort((a, b) => {
        // Sort by completion percentage first, then by time spent
        if (a.completionPercentage !== b.completionPercentage) {
          return b.completionPercentage - a.completionPercentage;
        }
        return a.timeSpent - b.timeSpent;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // Collect achievements
    const achievements = puzzleStatuses
      .flatMap(status => status.achievements)
      .reduce((acc, achievement) => {
        const existing = acc.find(a => a.id === achievement.id);
        if (existing) {
          existing.unlockedBy.push(achievement.unlockedAt.toString());
        } else {
          acc.push({
            id: achievement.id,
            name: achievement.name,
            unlockedBy: [achievement.unlockedAt.toString()],
            unlockedAt: achievement.unlockedAt
          });
        }
        return acc;
      }, [] as any[]);

    return {
      roomId,
      puzzleId,
      totalParticipants,
      completedParticipants,
      averageProgress,
      averageTimeSpent,
      leaderboard,
      achievements,
      lastUpdated: Date.now()
    };
  }

  /**
   * Handle cell completion
   */
  handleCellCompletion(
    userId: string,
    puzzleId: string,
    roomId: string,
    cell: { row: number; col: number; value: string }
  ): PuzzleCompletionStatus {
    const status = this.getStatus(userId, puzzleId);
    if (!status) {
      throw new Error('Puzzle status not found');
    }

    const updatedProgress = {
      ...status.progress,
      completedCells: status.progress.completedCells + 1,
      lastCellCompleted: {
        row: cell.row,
        col: cell.col,
        value: cell.value,
        timestamp: Date.now()
      }
    };

    // Check for completion
    const isCompleted = updatedProgress.completedCells >= updatedProgress.totalCells;
    const newStatus = isCompleted ? 'completed' : 'in_progress';

    // Update performance metrics
    const updatedPerformance = {
      ...status.performance,
      streak: status.performance.streak + 1,
      bestStreak: Math.max(status.performance.bestStreak, status.performance.streak + 1)
    };

    const updated = this.updateStatus(userId, puzzleId, roomId, {
      status: newStatus,
      progress: updatedProgress,
      performance: updatedPerformance
    });

    // Emit progress update event
    this.emitSyncEvent({
      type: 'progress_update',
      userId,
      puzzleId,
      roomId,
      timestamp: Date.now(),
      data: { cell, progress: updatedProgress }
    });

    // Check for completion
    if (isCompleted) {
      this.emitSyncEvent({
        type: 'completion',
        userId,
        puzzleId,
        roomId,
        timestamp: Date.now(),
        data: { completionTime: status.timing.totalTimeSpent }
      });
    }

    return updated;
  }

  /**
   * Handle achievement unlock
   */
  handleAchievementUnlock(
    userId: string,
    puzzleId: string,
    roomId: string,
    achievement: {
      id: string;
      name: string;
      description: string;
      category: 'speed' | 'accuracy' | 'streak' | 'completion' | 'social';
    }
  ): PuzzleCompletionStatus {
    const status = this.getStatus(userId, puzzleId);
    if (!status) {
      throw new Error('Puzzle status not found');
    }

    const newAchievement = {
      ...achievement,
      unlockedAt: Date.now()
    };

    const updatedAchievements = [...status.achievements, newAchievement];
    
    const updated = this.updateStatus(userId, puzzleId, roomId, {
      achievements: updatedAchievements
    });

    // Emit achievement event
    this.emitSyncEvent({
      type: 'achievement_unlocked',
      userId,
      puzzleId,
      roomId,
      timestamp: Date.now(),
      data: newAchievement
    });

    return updated;
  }

  /**
   * Start puzzle for a user
   */
  startPuzzle(userId: string, puzzleId: string, roomId: string, totalCells: number): PuzzleCompletionStatus {
    const status: PuzzleCompletionStatus = {
      puzzleId,
      roomId,
      userId,
      status: 'in_progress',
      progress: {
        completedCells: 0,
        totalCells,
        completionPercentage: 0
      },
      timing: {
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        totalTimeSpent: 0
      },
      performance: {
        accuracy: 100,
        hintsUsed: 0,
        mistakes: 0,
        streak: 0,
        bestStreak: 0
      },
      achievements: [],
      metadata: {
        lastSyncAt: Date.now()
      }
    };

    this.statuses.set(`${userId}_${puzzleId}`, status);

    this.emitSyncEvent({
      type: 'status_change',
      userId,
      puzzleId,
      roomId,
      timestamp: Date.now(),
      data: status
    });

    return status;
  }

  /**
   * Pause puzzle for a user
   */
  pausePuzzle(userId: string, puzzleId: string, roomId: string): PuzzleCompletionStatus {
    const status = this.getStatus(userId, puzzleId);
    if (!status) {
      throw new Error('Puzzle status not found');
    }

    const updated = this.updateStatus(userId, puzzleId, roomId, {
      status: 'paused',
      timing: {
        ...status.timing,
        totalTimeSpent: status.timing.totalTimeSpent + (Date.now() - status.timing.lastActivityAt)
      }
    });

    return updated;
  }

  /**
   * Resume puzzle for a user
   */
  resumePuzzle(userId: string, puzzleId: string, roomId: string): PuzzleCompletionStatus {
    const status = this.getStatus(userId, puzzleId);
    if (!status) {
      throw new Error('Puzzle status not found');
    }

    const updated = this.updateStatus(userId, puzzleId, roomId, {
      status: 'in_progress',
      timing: {
        ...status.timing,
        lastActivityAt: Date.now()
      }
    });

    return updated;
  }

  /**
   * Calculate completion percentage
   */
  private calculateCompletionPercentage(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  }

  /**
   * Emit sync event
   */
  private emitSyncEvent(event: CompletionSyncEvent): void {
    this.syncEvents.push(event);
    
    // Keep only last 1000 events
    if (this.syncEvents.length > 1000) {
      this.syncEvents = this.syncEvents.slice(-1000);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync event listener:', error);
      }
    });
  }

  /**
   * Add sync event listener
   */
  addListener(id: string, listener: (event: CompletionSyncEvent) => void): void {
    this.listeners.set(id, listener);
  }

  /**
   * Remove sync event listener
   */
  removeListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Get sync events for a room
   */
  getSyncEvents(roomId: string, since?: number): CompletionSyncEvent[] {
    return this.syncEvents.filter(event => 
      event.roomId === roomId && 
      (!since || event.timestamp >= since)
    );
  }

  /**
   * Clear old sync events
   */
  clearOldEvents(olderThan: number): void {
    this.syncEvents = this.syncEvents.filter(event => event.timestamp >= olderThan);
  }

  /**
   * Get completion statistics
   */
  getCompletionStats(roomId: string, puzzleId: string): {
    totalUsers: number;
    completedUsers: number;
    averageProgress: number;
    averageTimeSpent: number;
    completionRate: number;
  } {
    const statuses = this.getRoomStatuses(roomId).filter(s => s.puzzleId === puzzleId);
    
    const totalUsers = statuses.length;
    const completedUsers = statuses.filter(s => s.status === 'completed').length;
    const averageProgress = statuses.reduce((sum, s) => sum + s.progress.completionPercentage, 0) / totalUsers;
    const averageTimeSpent = statuses.reduce((sum, s) => sum + s.timing.totalTimeSpent, 0) / totalUsers;
    const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;

    return {
      totalUsers,
      completedUsers,
      averageProgress,
      averageTimeSpent,
      completionRate
    };
  }
}
