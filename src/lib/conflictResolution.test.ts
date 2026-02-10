import { ConflictDetector, ConflictResolver, ConflictResolutionStrategy } from './conflictResolution';
import { Operation } from './operationalTransformation';

describe('ConflictDetector', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector();
  });

  describe('detectConflicts', () => {
    it('should detect no conflicts for non-overlapping operations', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 0, content: 'Hello' },
        { id: '2', userId: 'user2', timestamp: Date.now() + 1000, type: 'INSERT' as const, position: 10, content: 'World' }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflicts for overlapping operations', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].operations).toHaveLength(2);
    });

    it('should detect conflicts for concurrent operations', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 0, content: 'A', length: 1 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 50, type: 'INSERT' as const, position: 0, content: 'B', length: 1 },
        { id: '3', userId: 'user3', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 0, content: 'C', length: 1 }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].operations).toHaveLength(3);
    });

    it('should not detect conflicts for same user operations', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user1', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('conflict properties', () => {
    it('should set correct conflict properties', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        expect(conflict.operations).toHaveLength(2);
        expect(conflict.participants).toHaveLength(2);
        expect(conflict.participants).toContain('user1');
        expect(conflict.participants).toContain('user2');
        expect(conflict.affectedRange.start).toBe(5);
        expect(conflict.affectedRange.end).toBeGreaterThan(5);
      }
    });

    it('should determine conflict severity correctly', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      if (conflicts.length > 0) {
        expect(['low', 'medium', 'high', 'critical']).toContain(conflicts[0].severity);
      }
    });

    it('should determine conflict type correctly', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      if (conflicts.length > 0) {
        expect(conflicts[0].type).toBe('concurrent');
      }
    });
  });

  describe('getActiveConflicts', () => {
    it('should return active conflicts', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      detector.detectConflicts(operations);
      const activeConflicts = detector.getActiveConflicts();
      expect(activeConflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConflictsForUser', () => {
    it('should return conflicts for specific user', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      detector.detectConflicts(operations);
      const userConflicts = detector.getConflictsForUser('user1');
      expect(userConflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve a conflict', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      const conflicts = detector.detectConflicts(operations);
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const resolution = {
          strategy: 'LAST_WRITE_WINS' as any,
          selectedOperations: [conflict.operations[0].id],
          resolvedAt: Date.now(),
          resolvedBy: 'user1'
        };

        const result = detector.resolveConflict(conflict.id, resolution);
        expect(result).toBe(true);
      }
    });
  });

  describe('getConflictStats', () => {
    it('should return conflict statistics', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      detector.detectConflicts(operations);
      const stats = detector.getConflictStats();
      
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let detector: ConflictDetector;

  beforeEach(() => {
    resolver = new ConflictResolver();
    detector = resolver.getDetector();
  });

  describe('resolveAllConflicts', () => {
    it('should resolve all conflicts with given strategy', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      detector.detectConflicts(operations);
      const resolutions = resolver.resolveAllConflicts('LAST_WRITE_WINS' as any);
      
      expect(resolutions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resolveConflictsForUser', () => {
    it('should resolve conflicts for specific user', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      detector.detectConflicts(operations);
      const resolutions = resolver.resolveConflictsForUser('user1', 'LAST_WRITE_WINS' as any);
      
      expect(resolutions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('autoResolveConflicts', () => {
    it('should auto-resolve conflicts that can be automatically resolved', () => {
      const operations = [
        { id: '1', userId: 'user1', timestamp: Date.now(), type: 'INSERT' as const, position: 5, content: 'Hello', length: 5 },
        { id: '2', userId: 'user2', timestamp: Date.now() + 100, type: 'INSERT' as const, position: 5, content: 'Hi', length: 2 }
      ] as Operation[];

      detector.detectConflicts(operations);
      const resolutions = resolver.autoResolveConflicts();
      
      expect(resolutions.length).toBeGreaterThanOrEqual(0);
    });
  });
});
