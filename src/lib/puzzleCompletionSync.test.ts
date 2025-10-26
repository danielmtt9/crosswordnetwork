import { PuzzleCompletionSync, PuzzleCompletionStatus, CompletionSyncEvent } from './puzzleCompletionSync';

describe('PuzzleCompletionSync', () => {
  let sync: PuzzleCompletionSync;

  beforeEach(() => {
    sync = new PuzzleCompletionSync();
  });

  describe('updateStatus', () => {
    it('should update puzzle completion status', () => {
      const status = sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: {
          completedCells: 5,
          totalCells: 10,
          completionPercentage: 50
        }
      });

      expect(status.userId).toBe('user1');
      expect(status.puzzleId).toBe('puzzle1');
      expect(status.roomId).toBe('room1');
      expect(status.status).toBe('in_progress');
      expect(status.progress.completedCells).toBe(5);
      expect(status.progress.totalCells).toBe(10);
      expect(status.progress.completionPercentage).toBe(50);
    });

    it('should calculate completion percentage correctly', () => {
      const status = sync.updateStatus('user1', 'puzzle1', 'room1', {
        progress: {
          completedCells: 3,
          totalCells: 10
        }
      });

      expect(status.progress.completionPercentage).toBe(30);
    });

    it('should update existing status', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });

      const updated = sync.updateStatus('user1', 'puzzle1', 'room1', {
        progress: { completedCells: 8, totalCells: 10, completionPercentage: 80 }
      });

      expect(updated.progress.completedCells).toBe(8);
      expect(updated.progress.completionPercentage).toBe(80);
    });
  });

  describe('getStatus', () => {
    it('should return status for user and puzzle', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });

      const status = sync.getStatus('user1', 'puzzle1');
      expect(status).toBeDefined();
      expect(status!.userId).toBe('user1');
      expect(status!.puzzleId).toBe('puzzle1');
    });

    it('should return undefined for non-existent status', () => {
      const status = sync.getStatus('user1', 'puzzle2');
      expect(status).toBeUndefined();
    });
  });

  describe('getRoomStatuses', () => {
    it('should return all statuses for a room', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });
      sync.updateStatus('user2', 'puzzle1', 'room1', {
        status: 'completed',
        progress: { completedCells: 10, totalCells: 10, completionPercentage: 100 }
      });
      sync.updateStatus('user3', 'puzzle1', 'room2', {
        status: 'in_progress',
        progress: { completedCells: 3, totalCells: 10, completionPercentage: 30 }
      });

      const roomStatuses = sync.getRoomStatuses('room1');
      expect(roomStatuses).toHaveLength(2);
      expect(roomStatuses.every(s => s.roomId === 'room1')).toBe(true);
    });
  });

  describe('getRoomSummary', () => {
    it('should return room completion summary', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });
      sync.updateStatus('user2', 'puzzle1', 'room1', {
        status: 'completed',
        progress: { completedCells: 10, totalCells: 10, completionPercentage: 100 }
      });

      const summary = sync.getRoomSummary('room1', 'puzzle1');
      expect(summary.roomId).toBe('room1');
      expect(summary.puzzleId).toBe('puzzle1');
      expect(summary.totalParticipants).toBe(2);
      expect(summary.completedParticipants).toBe(1);
      expect(summary.averageProgress).toBe(75);
    });
  });

  describe('handleCellCompletion', () => {
    it('should handle cell completion', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });

      const updated = sync.handleCellCompletion('user1', 'puzzle1', 'room1', {
        row: 1,
        col: 2,
        value: 'A'
      });

      expect(updated.progress.completedCells).toBe(6);
      expect(updated.progress.lastCellCompleted).toEqual({
        row: 1,
        col: 2,
        value: 'A',
        timestamp: expect.any(Number)
      });
    });

    it('should mark puzzle as completed when all cells are done', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 9, totalCells: 10, completionPercentage: 90 }
      });

      const updated = sync.handleCellCompletion('user1', 'puzzle1', 'room1', {
        row: 1,
        col: 2,
        value: 'A'
      });

      expect(updated.status).toBe('completed');
      expect(updated.progress.completedCells).toBe(10);
      expect(updated.progress.completionPercentage).toBe(100);
    });
  });

  describe('handleAchievementUnlock', () => {
    it('should handle achievement unlock', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 },
        achievements: []
      });

      const updated = sync.handleAchievementUnlock('user1', 'puzzle1', 'room1', {
        id: 'achievement1',
        name: 'First Cell',
        description: 'Complete your first cell',
        category: 'completion'
      });

      expect(updated.achievements).toHaveLength(1);
      expect(updated.achievements[0].id).toBe('achievement1');
      expect(updated.achievements[0].name).toBe('First Cell');
    });
  });

  describe('startPuzzle', () => {
    it('should start puzzle for user', () => {
      const status = sync.startPuzzle('user1', 'puzzle1', 'room1', 20);

      expect(status.userId).toBe('user1');
      expect(status.puzzleId).toBe('puzzle1');
      expect(status.roomId).toBe('room1');
      expect(status.status).toBe('in_progress');
      expect(status.progress.completedCells).toBe(0);
      expect(status.progress.totalCells).toBe(20);
      expect(status.progress.completionPercentage).toBe(0);
    });
  });

  describe('pausePuzzle', () => {
    it('should pause puzzle for user', () => {
      sync.startPuzzle('user1', 'puzzle1', 'room1', 20);
      const paused = sync.pausePuzzle('user1', 'puzzle1', 'room1');

      expect(paused.status).toBe('paused');
    });
  });

  describe('resumePuzzle', () => {
    it('should resume puzzle for user', () => {
      sync.startPuzzle('user1', 'puzzle1', 'room1', 20);
      sync.pausePuzzle('user1', 'puzzle1', 'room1');
      const resumed = sync.resumePuzzle('user1', 'puzzle1', 'room1');

      expect(resumed.status).toBe('in_progress');
    });
  });

  describe('event listeners', () => {
    it('should add and remove listeners', () => {
      const listener = jest.fn();
      
      sync.addListener('test', listener);
      sync.removeListener('test');
      
      // Listener should not be called after removal
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify listeners of events', () => {
      const listener = jest.fn();
      sync.addListener('test', listener);

      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_change',
          userId: 'user1',
          puzzleId: 'puzzle1',
          roomId: 'room1'
        })
      );
    });
  });

  describe('getSyncEvents', () => {
    it('should return sync events for room', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });

      const events = sync.getSyncEvents('room1');
      expect(events).toHaveLength(1);
      expect(events[0].roomId).toBe('room1');
    });

    it('should filter events by timestamp', () => {
      const now = Date.now();
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });

      const events = sync.getSyncEvents('room1', now + 1000);
      expect(events).toHaveLength(0);
    });
  });

  describe('getCompletionStats', () => {
    it('should return completion statistics', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 },
        timing: { startedAt: Date.now(), lastActivityAt: Date.now(), totalTimeSpent: 1000 }
      });
      sync.updateStatus('user2', 'puzzle1', 'room1', {
        status: 'completed',
        progress: { completedCells: 10, totalCells: 10, completionPercentage: 100 },
        timing: { startedAt: Date.now(), lastActivityAt: Date.now(), totalTimeSpent: 2000 }
      });

      const stats = sync.getCompletionStats('room1', 'puzzle1');
      expect(stats.totalUsers).toBe(2);
      expect(stats.completedUsers).toBe(1);
      expect(stats.averageProgress).toBe(75);
      expect(stats.averageTimeSpent).toBe(1500);
      expect(stats.completionRate).toBe(50);
    });
  });

  describe('clearOldEvents', () => {
    it('should clear old events', () => {
      sync.updateStatus('user1', 'puzzle1', 'room1', {
        status: 'in_progress',
        progress: { completedCells: 5, totalCells: 10, completionPercentage: 50 }
      });

      const beforeClear = sync.getSyncEvents('room1');
      expect(beforeClear).toHaveLength(1);

      sync.clearOldEvents(Date.now() + 1000);
      const afterClear = sync.getSyncEvents('room1');
      expect(afterClear).toHaveLength(0);
    });
  });
});
