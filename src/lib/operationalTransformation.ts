/**
 * Operational Transformation (OT) library for real-time collaborative puzzle editing
 * Implements the core algorithms for handling simultaneous edits by multiple users
 */

export interface Operation {
  id: string;
  userId: string;
  timestamp: number;
  type: 'INSERT' | 'DELETE' | 'REPLACE' | 'MOVE';
  position: number;
  content?: string;
  length?: number;
  metadata?: Record<string, any>;
}

export interface TransformationResult {
  operation: Operation;
  transformed: boolean;
  conflicts: Operation[];
}

export interface OTState {
  operations: Operation[];
  lastApplied: number;
  version: number;
}

export class OperationalTransformer {
  private state: OTState;
  private pendingOperations: Map<string, Operation> = new Map();

  constructor(initialState?: OTState) {
    this.state = initialState || {
      operations: [],
      lastApplied: 0,
      version: 0
    };
  }

  /**
   * Apply an operation to the current state
   */
  applyOperation(operation: Operation): TransformationResult {
    const conflicts: Operation[] = [];
    let transformed = false;

    // Check for conflicts with pending operations
    for (const [id, pendingOp] of this.pendingOperations) {
      if (this.hasConflict(operation, pendingOp)) {
        conflicts.push(pendingOp);
      }
    }

    // Transform the operation against all previous operations
    let transformedOperation = operation;
    for (const existingOp of this.state.operations) {
      if (this.shouldTransform(operation, existingOp)) {
        transformedOperation = this.transform(transformedOperation, existingOp);
        transformed = true;
      }
    }

    // Apply the transformed operation
    this.state.operations.push(transformedOperation);
    this.state.version++;
    this.state.lastApplied = Date.now();

    return {
      operation: transformedOperation,
      transformed,
      conflicts
    };
  }

  /**
   * Transform an operation against another operation
   */
  private transform(op1: Operation, op2: Operation): Operation {
    switch (op1.type) {
      case 'INSERT':
        return this.transformInsert(op1, op2);
      case 'DELETE':
        return this.transformDelete(op1, op2);
      case 'REPLACE':
        return this.transformReplace(op1, op2);
      case 'MOVE':
        return this.transformMove(op1, op2);
      default:
        return op1;
    }
  }

  /**
   * Transform an INSERT operation
   */
  private transformInsert(insertOp: Operation, againstOp: Operation): Operation {
    if (againstOp.type === 'INSERT') {
      if (againstOp.position <= insertOp.position) {
        return {
          ...insertOp,
          position: insertOp.position + (againstOp.content?.length || 0)
        };
      }
    } else if (againstOp.type === 'DELETE') {
      if (againstOp.position < insertOp.position) {
        return {
          ...insertOp,
          position: insertOp.position - (againstOp.length || 0)
        };
      } else if (againstOp.position === insertOp.position) {
        // Insert at the same position - move after the delete
        return {
          ...insertOp,
          position: insertOp.position + (againstOp.length || 0)
        };
      }
    } else if (againstOp.type === 'REPLACE') {
      if (againstOp.position < insertOp.position) {
        const lengthDiff = (againstOp.content?.length || 0) - (againstOp.length || 0);
        return {
          ...insertOp,
          position: insertOp.position + lengthDiff
        };
      }
    }

    return insertOp;
  }

  /**
   * Transform a DELETE operation
   */
  private transformDelete(deleteOp: Operation, againstOp: Operation): Operation {
    if (againstOp.type === 'INSERT') {
      if (againstOp.position <= deleteOp.position) {
        return {
          ...deleteOp,
          position: deleteOp.position + (againstOp.content?.length || 0)
        };
      } else if (againstOp.position < deleteOp.position + (deleteOp.length || 0)) {
        // Insert within the delete range - adjust the delete
        const overlap = againstOp.position - deleteOp.position;
        return {
          ...deleteOp,
          position: deleteOp.position,
          length: (deleteOp.length || 0) - overlap
        };
      }
    } else if (againstOp.type === 'DELETE') {
      if (againstOp.position < deleteOp.position) {
        return {
          ...deleteOp,
          position: deleteOp.position - (againstOp.length || 0)
        };
      } else if (againstOp.position === deleteOp.position) {
        // Same position - no change needed
        return deleteOp;
      } else if (againstOp.position < deleteOp.position + (deleteOp.length || 0)) {
        // Overlapping deletes - adjust the range
        const overlap = Math.min(
          againstOp.length || 0,
          deleteOp.position + (deleteOp.length || 0) - againstOp.position
        );
        return {
          ...deleteOp,
          length: (deleteOp.length || 0) - overlap
        };
      }
    } else if (againstOp.type === 'REPLACE') {
      if (againstOp.position < deleteOp.position) {
        const lengthDiff = (againstOp.content?.length || 0) - (againstOp.length || 0);
        return {
          ...deleteOp,
          position: deleteOp.position + lengthDiff
        };
      } else if (againstOp.position < deleteOp.position + (deleteOp.length || 0)) {
        // Replace overlaps with delete - adjust the delete
        const overlap = Math.min(
          (againstOp.content?.length || 0),
          deleteOp.position + (deleteOp.length || 0) - againstOp.position
        );
        return {
          ...deleteOp,
          length: (deleteOp.length || 0) - overlap
        };
      }
    }

    return deleteOp;
  }

  /**
   * Transform a REPLACE operation
   */
  private transformReplace(replaceOp: Operation, againstOp: Operation): Operation {
    if (againstOp.type === 'INSERT') {
      if (againstOp.position <= replaceOp.position) {
        return {
          ...replaceOp,
          position: replaceOp.position + (againstOp.content?.length || 0)
        };
      } else if (againstOp.position < replaceOp.position + (replaceOp.length || 0)) {
        // Insert within replace range - adjust the replace
        const overlap = againstOp.position - replaceOp.position;
        return {
          ...replaceOp,
          position: replaceOp.position,
          length: (replaceOp.length || 0) - overlap
        };
      }
    } else if (againstOp.type === 'DELETE') {
      if (againstOp.position < replaceOp.position) {
        return {
          ...replaceOp,
          position: replaceOp.position - (againstOp.length || 0)
        };
      } else if (againstOp.position < replaceOp.position + (replaceOp.length || 0)) {
        // Delete overlaps with replace - adjust the replace
        const overlap = Math.min(
          againstOp.length || 0,
          replaceOp.position + (replaceOp.length || 0) - againstOp.position
        );
        return {
          ...replaceOp,
          length: (replaceOp.length || 0) - overlap
        };
      }
    } else if (againstOp.type === 'REPLACE') {
      if (againstOp.position < replaceOp.position) {
        const lengthDiff = (againstOp.content?.length || 0) - (againstOp.length || 0);
        return {
          ...replaceOp,
          position: replaceOp.position + lengthDiff
        };
      } else if (againstOp.position < replaceOp.position + (replaceOp.length || 0)) {
        // Replace overlaps with replace - adjust the replace
        const overlap = Math.min(
          (againstOp.content?.length || 0),
          replaceOp.position + (replaceOp.length || 0) - againstOp.position
        );
        return {
          ...replaceOp,
          length: (replaceOp.length || 0) - overlap
        };
      }
    }

    return replaceOp;
  }

  /**
   * Transform a MOVE operation
   */
  private transformMove(moveOp: Operation, againstOp: Operation): Operation {
    // Move operations are more complex and depend on the specific implementation
    // For now, we'll handle basic cases
    if (againstOp.type === 'INSERT') {
      if (againstOp.position <= moveOp.position) {
        return {
          ...moveOp,
          position: moveOp.position + (againstOp.content?.length || 0)
        };
      }
    } else if (againstOp.type === 'DELETE') {
      if (againstOp.position < moveOp.position) {
        return {
          ...moveOp,
          position: moveOp.position - (againstOp.length || 0)
        };
      }
    }

    return moveOp;
  }

  /**
   * Check if two operations have a conflict
   */
  private hasConflict(op1: Operation, op2: Operation): boolean {
    // Operations conflict if they affect overlapping ranges
    const op1End = op1.position + (op1.length || 0);
    const op2End = op2.position + (op2.length || 0);

    return !(
      op1End <= op2.position ||
      op2End <= op1.position
    );
  }

  /**
   * Check if an operation should be transformed against another
   */
  private shouldTransform(op1: Operation, op2: Operation): boolean {
    // Transform if operations are concurrent and affect overlapping ranges
    return (
      Math.abs(op1.timestamp - op2.timestamp) < 1000 && // Within 1 second
      this.hasConflict(op1, op2)
    );
  }

  /**
   * Get the current state
   */
  getState(): OTState {
    return { ...this.state };
  }

  /**
   * Get operations since a specific version
   */
  getOperationsSince(version: number): Operation[] {
    return this.state.operations.slice(version);
  }

  /**
   * Add a pending operation
   */
  addPendingOperation(operation: Operation): void {
    this.pendingOperations.set(operation.id, operation);
  }

  /**
   * Remove a pending operation
   */
  removePendingOperation(operationId: string): void {
    this.pendingOperations.delete(operationId);
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): Operation[] {
    return Array.from(this.pendingOperations.values());
  }

  /**
   * Clear all pending operations
   */
  clearPendingOperations(): void {
    this.pendingOperations.clear();
  }

  /**
   * Merge operations to reduce conflicts
   */
  mergeOperations(operations: Operation[]): Operation[] {
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
   * Create a new operation
   */
  static createOperation(
    type: Operation['type'],
    position: number,
    content?: string,
    length?: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Operation {
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || 'anonymous',
      timestamp: Date.now(),
      type,
      position,
      content,
      length,
      metadata
    };
  }

  /**
   * Validate an operation
   */
  static validateOperation(operation: Operation): boolean {
    return (
      !!operation.id &&
      !!operation.userId &&
      typeof operation.timestamp === 'number' &&
      ['INSERT', 'DELETE', 'REPLACE', 'MOVE'].includes(operation.type) &&
      typeof operation.position === 'number' &&
      operation.position >= 0
    );
  }
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  FIRST_WRITE_WINS = 'first_write_wins',
  MANUAL_RESOLUTION = 'manual_resolution',
  AUTOMATIC_MERGE = 'automatic_merge'
}

/**
 * Conflict resolver
 */
export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;

  constructor(strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.LAST_WRITE_WINS) {
    this.strategy = strategy;
  }

  /**
   * Resolve conflicts between operations
   */
  resolveConflicts(operations: Operation[]): Operation[] {
    switch (this.strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(operations);
      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        return this.resolveFirstWriteWins(operations);
      case ConflictResolutionStrategy.AUTOMATIC_MERGE:
        return this.resolveAutomaticMerge(operations);
      default:
        return operations;
    }
  }

  private resolveLastWriteWins(operations: Operation[]): Operation[] {
    return operations.sort((a, b) => b.timestamp - a.timestamp);
  }

  private resolveFirstWriteWins(operations: Operation[]): Operation[] {
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  private resolveAutomaticMerge(operations: Operation[]): Operation[] {
    // Implement automatic merging logic
    const merged: Operation[] = [];
    const sorted = operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of sorted) {
      const conflict = merged.find(op => this.hasConflict(op, operation));
      if (conflict) {
        // Merge conflicting operations
        const mergedOp = this.mergeOperations(conflict, operation);
        const index = merged.indexOf(conflict);
        merged[index] = mergedOp;
      } else {
        merged.push(operation);
      }
    }

    return merged;
  }

  private hasConflict(op1: Operation, op2: Operation): boolean {
    const op1End = op1.position + (op1.length || 0);
    const op2End = op2.position + (op2.length || 0);
    return !(op1End <= op2.position || op2End <= op1.position);
  }

  private mergeOperations(op1: Operation, op2: Operation): Operation {
    // Simple merge strategy - combine content
    if (op1.type === 'INSERT' && op2.type === 'INSERT') {
      return {
        ...op1,
        content: (op1.content || '') + (op2.content || ''),
        length: (op1.length || 0) + (op2.length || 0)
      };
    }

    return op1;
  }
}
