/**
 * Conflict detection and resolution logic for real-time collaborative editing
 */

import { Operation, ConflictResolutionStrategy } from './operationalTransformation';

export interface Conflict {
  id: string;
  operations: Operation[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'overlap' | 'concurrent' | 'dependency' | 'semantic';
  affectedRange: {
    start: number;
    end: number;
  };
  participants: string[];
  timestamp: number;
  autoResolvable: boolean;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  selectedOperations: string[];
  customResolution?: string;
  resolvedAt: number;
  resolvedBy: string;
}

export class ConflictDetector {
  private conflicts: Map<string, Conflict> = new Map();
  private resolutionHistory: ConflictResolution[] = [];

  /**
   * Detect conflicts in a set of operations
   */
  detectConflicts(operations: Operation[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < operations.length; i++) {
      const op1 = operations[i];
      if (processed.has(op1.id)) continue;

      const relatedOps: Operation[] = [op1];
      
      // Find operations that conflict with op1
      for (let j = i + 1; j < operations.length; j++) {
        const op2 = operations[j];
        if (processed.has(op2.id)) continue;

        if (this.hasConflict(op1, op2)) {
          relatedOps.push(op2);
          processed.add(op2.id);
        }
      }

      if (relatedOps.length > 1) {
        const conflict = this.createConflict(relatedOps);
        conflicts.push(conflict);
        this.conflicts.set(conflict.id, conflict);
      }

      processed.add(op1.id);
    }

    return conflicts;
  }

  /**
   * Check if two operations have a conflict
   */
  private hasConflict(op1: Operation, op2: Operation): boolean {
    // Same user operations don't conflict
    if (op1.userId === op2.userId) return false;

    // Check for temporal proximity (within 5 seconds)
    const timeDiff = Math.abs(op1.timestamp - op2.timestamp);
    if (timeDiff > 5000) return false;

    // Check for spatial overlap
    return this.hasSpatialOverlap(op1, op2);
  }

  /**
   * Check if two operations have spatial overlap
   */
  private hasSpatialOverlap(op1: Operation, op2: Operation): boolean {
    const op1Start = op1.position;
    const op1End = op1.position + (op1.length || 0);
    const op2Start = op2.position;
    const op2End = op2.position + (op2.length || 0);

    // Check for any overlap
    return !(op1End <= op2Start || op2End <= op1Start);
  }

  /**
   * Create a conflict object from related operations
   */
  private createConflict(operations: Operation[]): Conflict {
    const start = Math.min(...operations.map(op => op.position));
    const end = Math.max(...operations.map(op => op.position + (op.length || 0)));
    const participants = [...new Set(operations.map(op => op.userId))];
    const timestamp = Math.max(...operations.map(op => op.timestamp));

    // Determine conflict type and severity
    const type = this.determineConflictType(operations);
    const severity = this.determineConflictSeverity(operations, type);
    const autoResolvable = this.isAutoResolvable(operations, type);

    return {
      id: `conflict_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      operations,
      severity,
      type,
      affectedRange: { start, end },
      participants,
      timestamp,
      autoResolvable
    };
  }

  /**
   * Determine the type of conflict
   */
  private determineConflictType(operations: Operation[]): Conflict['type'] {
    const types = operations.map(op => op.type);
    const uniqueTypes = [...new Set(types)];

    if (uniqueTypes.length === 1) {
      return 'concurrent';
    } else if (this.hasOverlappingRanges(operations)) {
      return 'overlap';
    } else if (this.hasDependencyChain(operations)) {
      return 'dependency';
    } else {
      return 'semantic';
    }
  }

  /**
   * Check if operations have overlapping ranges
   */
  private hasOverlappingRanges(operations: Operation[]): boolean {
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        if (this.hasSpatialOverlap(operations[i], operations[j])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if operations form a dependency chain
   */
  private hasDependencyChain(operations: Operation[]): boolean {
    // Simple dependency check - operations that depend on each other
    const sorted = operations.sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      // Check if current operation depends on previous
      if (curr.position === prev.position + (prev.length || 0)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Determine conflict severity
   */
  private determineConflictSeverity(operations: Operation[], type: Conflict['type']): Conflict['severity'] {
    const participantCount = new Set(operations.map(op => op.userId)).size;
    const timeSpan = Math.max(...operations.map(op => op.timestamp)) - 
                    Math.min(...operations.map(op => op.timestamp));

    if (participantCount >= 4 || timeSpan > 10000) {
      return 'critical';
    } else if (participantCount >= 3 || timeSpan > 5000) {
      return 'high';
    } else if (participantCount >= 2 || timeSpan > 2000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check if a conflict can be automatically resolved
   */
  private isAutoResolvable(operations: Operation[], type: Conflict['type']): boolean {
    switch (type) {
      case 'concurrent':
        // Concurrent operations of the same type can often be merged
        return operations.every(op => op.type === operations[0].type);
      case 'overlap':
        // Overlapping operations usually need manual resolution
        return false;
      case 'dependency':
        // Dependency conflicts can often be resolved by reordering
        return true;
      case 'semantic':
        // Semantic conflicts usually need manual resolution
        return false;
      default:
        return false;
    }
  }

  /**
   * Get all active conflicts
   */
  getActiveConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflicts for a specific user
   */
  getConflictsForUser(userId: string): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.participants.includes(userId));
  }

  /**
   * Get conflicts by severity
   */
  getConflictsBySeverity(severity: Conflict['severity']): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.severity === severity);
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: ConflictResolution): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    // Apply resolution strategy
    const resolvedOperations = this.applyResolution(conflict, resolution);
    
    // Update conflict state
    this.conflicts.delete(conflictId);
    this.resolutionHistory.push(resolution);

    return true;
  }

  /**
   * Apply a resolution strategy to a conflict
   */
  private applyResolution(conflict: Conflict, resolution: ConflictResolution): Operation[] {
    switch (resolution.strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return conflict.operations.sort((a, b) => b.timestamp - a.timestamp);
      
      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        return conflict.operations.sort((a, b) => a.timestamp - b.timestamp);
      
      case ConflictResolutionStrategy.MANUAL_RESOLUTION:
        return conflict.operations.filter(op => 
          resolution.selectedOperations.includes(op.id)
        );
      
      case ConflictResolutionStrategy.AUTOMATIC_MERGE:
        return this.mergeOperations(conflict.operations);
      
      default:
        return conflict.operations;
    }
  }

  /**
   * Merge operations automatically
   */
  private mergeOperations(operations: Operation[]): Operation[] {
    const merged: Operation[] = [];
    const sorted = operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of sorted) {
      const lastMerged = merged[merged.length - 1];
      
      if (lastMerged && this.canMerge(lastMerged, operation)) {
        merged[merged.length - 1] = this.merge(lastMerged, operation);
      } else {
        merged.push(operation);
      }
    }

    return merged;
  }

  /**
   * Check if two operations can be merged
   */
  private canMerge(op1: Operation, op2: Operation): boolean {
    return (
      op1.userId === op2.userId &&
      op1.type === op2.type &&
      Math.abs(op1.timestamp - op2.timestamp) < 1000 &&
      this.areAdjacent(op1, op2)
    );
  }

  /**
   * Check if two operations are adjacent
   */
  private areAdjacent(op1: Operation, op2: Operation): boolean {
    const op1End = op1.position + (op1.length || 0);
    return op1End === op2.position || op2.position === op1.position;
  }

  /**
   * Merge two operations
   */
  private merge(op1: Operation, op2: Operation): Operation {
    if (op1.type === 'INSERT' && op2.type === 'INSERT') {
      return {
        ...op1,
        content: (op1.content || '') + (op2.content || ''),
        length: (op1.length || 0) + (op2.length || 0)
      };
    } else if (op1.type === 'DELETE' && op2.type === 'DELETE') {
      return {
        ...op1,
        length: (op1.length || 0) + (op2.length || 0)
      };
    } else if (op1.type === 'REPLACE' && op2.type === 'REPLACE') {
      return {
        ...op1,
        content: (op1.content || '') + (op2.content || ''),
        length: (op1.length || 0) + (op2.length || 0)
      };
    }

    return op1;
  }

  /**
   * Get resolution history
   */
  getResolutionHistory(): ConflictResolution[] {
    return [...this.resolutionHistory];
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): void {
    this.conflicts.clear();
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): {
    total: number;
    bySeverity: Record<Conflict['severity'], number>;
    byType: Record<Conflict['type'], number>;
    autoResolvable: number;
  } {
    const conflicts = Array.from(this.conflicts.values());
    
    return {
      total: conflicts.length,
      bySeverity: {
        low: conflicts.filter(c => c.severity === 'low').length,
        medium: conflicts.filter(c => c.severity === 'medium').length,
        high: conflicts.filter(c => c.severity === 'high').length,
        critical: conflicts.filter(c => c.severity === 'critical').length
      },
      byType: {
        overlap: conflicts.filter(c => c.type === 'overlap').length,
        concurrent: conflicts.filter(c => c.type === 'concurrent').length,
        dependency: conflicts.filter(c => c.type === 'dependency').length,
        semantic: conflicts.filter(c => c.type === 'semantic').length
      },
      autoResolvable: conflicts.filter(c => c.autoResolvable).length
    };
  }
}

/**
 * Conflict resolution strategies
 */
export class ConflictResolver {
  private detector: ConflictDetector;

  constructor() {
    this.detector = new ConflictDetector();
  }

  /**
   * Resolve all conflicts with a given strategy
   */
  resolveAllConflicts(strategy: ConflictResolutionStrategy): ConflictResolution[] {
    const conflicts = this.detector.getActiveConflicts();
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution: ConflictResolution = {
        strategy,
        selectedOperations: conflict.operations.map(op => op.id),
        resolvedAt: Date.now(),
        resolvedBy: 'system'
      };

      this.detector.resolveConflict(conflict.id, resolution);
      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Resolve conflicts for a specific user
   */
  resolveConflictsForUser(userId: string, strategy: ConflictResolutionStrategy): ConflictResolution[] {
    const conflicts = this.detector.getConflictsForUser(userId);
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution: ConflictResolution = {
        strategy,
        selectedOperations: conflict.operations
          .filter(op => op.userId === userId)
          .map(op => op.id),
        resolvedAt: Date.now(),
        resolvedBy: userId
      };

      this.detector.resolveConflict(conflict.id, resolution);
      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Auto-resolve conflicts that can be automatically resolved
   */
  autoResolveConflicts(): ConflictResolution[] {
    const conflicts = this.detector.getActiveConflicts()
      .filter(conflict => conflict.autoResolvable);
    
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution: ConflictResolution = {
        strategy: ConflictResolutionStrategy.AUTOMATIC_MERGE,
        selectedOperations: conflict.operations.map(op => op.id),
        resolvedAt: Date.now(),
        resolvedBy: 'system'
      };

      this.detector.resolveConflict(conflict.id, resolution);
      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Get the conflict detector
   */
  getDetector(): ConflictDetector {
    return this.detector;
  }
}
