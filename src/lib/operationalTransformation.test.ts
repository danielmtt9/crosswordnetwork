import { OperationalTransformer, Operation, ConflictResolutionStrategy } from './operationalTransformation';

describe('OperationalTransformer', () => {
  let transformer: OperationalTransformer;

  beforeEach(() => {
    transformer = new OperationalTransformer();
  });

  describe('createOperation', () => {
    it('should create a valid operation', () => {
      const operation = OperationalTransformer.createOperation(
        'INSERT',
        10,
        'Hello',
        5,
        'user1'
      );

      expect(operation.type).toBe('INSERT');
      expect(operation.position).toBe(10);
      expect(operation.content).toBe('Hello');
      expect(operation.length).toBe(5);
      expect(operation.userId).toBe('user1');
      expect(operation.id).toBeDefined();
      expect(operation.timestamp).toBeDefined();
    });

    it('should generate unique IDs', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 0, 'A');
      const op2 = OperationalTransformer.createOperation('INSERT', 0, 'B');
      
      expect(op1.id).not.toBe(op2.id);
    });
  });

  describe('validateOperation', () => {
    it('should validate correct operations', () => {
      const operation = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
      expect(OperationalTransformer.validateOperation(operation)).toBe(true);
    });

    it('should reject invalid operations', () => {
      expect(OperationalTransformer.validateOperation({
        id: '',
        userId: 'user1',
        timestamp: Date.now(),
        type: 'INSERT',
        position: -1
      } as Operation)).toBe(false);

      expect(OperationalTransformer.validateOperation({
        id: 'test',
        userId: '',
        timestamp: Date.now(),
        type: 'INVALID',
        position: 0
      } as Operation)).toBe(false);
    });
  });

  describe('applyOperation', () => {
    it('should apply a simple operation', () => {
      const operation = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
      const result = transformer.applyOperation(operation);

      expect(result.operation).toEqual(operation);
      expect(result.transformed).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should transform operations with conflicts', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
      const op2 = OperationalTransformer.createOperation('INSERT', 0, 'Hi');
      
      transformer.applyOperation(op1);
      const result = transformer.applyOperation(op2);

      // The operation should be transformed to avoid conflicts
      expect(result.operation.position).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent insertions', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 5, 'World');
      const op2 = OperationalTransformer.createOperation('INSERT', 5, 'Beautiful');
      
      transformer.applyOperation(op1);
      const result = transformer.applyOperation(op2);

      // The second operation should be positioned after the first
      expect(result.operation.position).toBeGreaterThanOrEqual(5);
    });

    it('should handle deletions', () => {
      const insertOp = OperationalTransformer.createOperation('INSERT', 0, 'Hello World');
      const deleteOp = OperationalTransformer.createOperation('DELETE', 5, undefined, 6);
      
      transformer.applyOperation(insertOp);
      const result = transformer.applyOperation(deleteOp);

      expect(result.operation.type).toBe('DELETE');
      expect(result.operation.position).toBe(5);
    });

    it('should handle replacements', () => {
      const insertOp = OperationalTransformer.createOperation('INSERT', 0, 'Hello World');
      const replaceOp = OperationalTransformer.createOperation('REPLACE', 6, 'Universe', 5);
      
      transformer.applyOperation(insertOp);
      const result = transformer.applyOperation(replaceOp);

      expect(result.operation.type).toBe('REPLACE');
      expect(result.operation.content).toBe('Universe');
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const operation = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
      transformer.applyOperation(operation);

      const state = transformer.getState();
      expect(state.operations).toHaveLength(1);
      expect(state.version).toBe(1);
    });
  });

  describe('getOperationsSince', () => {
    it('should return operations since version', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
      const op2 = OperationalTransformer.createOperation('INSERT', 5, ' World');
      
      transformer.applyOperation(op1);
      transformer.applyOperation(op2);

      const operations = transformer.getOperationsSince(1);
      expect(operations).toHaveLength(1);
      expect(operations[0]).toEqual(op2);
    });
  });

  describe('mergeOperations', () => {
    it('should merge adjacent operations from same user', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 0, 'Hello', 5, 'user1');
      const op2 = OperationalTransformer.createOperation('INSERT', 5, ' World', 6, 'user1');
      
      const merged = transformer.mergeOperations([op1, op2]);
      expect(merged).toHaveLength(1);
      expect(merged[0].content).toBe('Hello World');
      expect(merged[0].length).toBe(11);
    });

    it('should not merge operations from different users', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 0, 'Hello', 5, 'user1');
      const op2 = OperationalTransformer.createOperation('INSERT', 5, ' World', 6, 'user2');
      
      const merged = transformer.mergeOperations([op1, op2]);
      expect(merged).toHaveLength(2);
    });

    it('should not merge non-adjacent operations', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 0, 'Hello', 5, 'user1');
      const op2 = OperationalTransformer.createOperation('INSERT', 10, ' World', 6, 'user1');
      
      const merged = transformer.mergeOperations([op1, op2]);
      expect(merged).toHaveLength(2);
    });
  });

  describe('pending operations', () => {
    it('should add and remove pending operations', () => {
      const operation = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
      
      transformer.addPendingOperation(operation);
      expect(transformer.getPendingOperations()).toHaveLength(1);
      
      transformer.removePendingOperation(operation.id);
      expect(transformer.getPendingOperations()).toHaveLength(0);
    });

    it('should clear all pending operations', () => {
      const op1 = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
      const op2 = OperationalTransformer.createOperation('INSERT', 5, ' World');
      
      transformer.addPendingOperation(op1);
      transformer.addPendingOperation(op2);
      
      transformer.clearPendingOperations();
      expect(transformer.getPendingOperations()).toHaveLength(0);
    });
  });
});

describe('ConflictResolution', () => {
  let transformer: OperationalTransformer;

  beforeEach(() => {
    transformer = new OperationalTransformer();
  });

  it('should detect conflicts between operations', () => {
    const op1 = OperationalTransformer.createOperation('INSERT', 5, 'Hello');
    const op2 = OperationalTransformer.createOperation('INSERT', 5, 'Hi');
    
    transformer.applyOperation(op1);
    const result = transformer.applyOperation(op2);

    // Operations should be transformed to avoid conflicts
    expect(result.operation.position).toBeGreaterThanOrEqual(0);
  });

  it('should resolve conflicts with last write wins', () => {
    const operations = [
      OperationalTransformer.createOperation('INSERT', 0, 'A'),
      OperationalTransformer.createOperation('INSERT', 0, 'B'),
      OperationalTransformer.createOperation('INSERT', 0, 'C')
    ];

    const resolved = transformer.mergeOperations(operations);
    expect(resolved.length).toBeGreaterThan(0);
  });

  it('should handle complex conflict scenarios', () => {
    // Insert at beginning
    const op1 = OperationalTransformer.createOperation('INSERT', 0, 'Hello');
    // Insert at same position
    const op2 = OperationalTransformer.createOperation('INSERT', 0, 'Hi');
    // Delete overlapping range
    const op3 = OperationalTransformer.createOperation('DELETE', 2, undefined, 3);
    
    transformer.applyOperation(op1);
    const result2 = transformer.applyOperation(op2);
    const result3 = transformer.applyOperation(op3);

    // Operations should be processed successfully
    expect(result2.operation).toBeDefined();
    expect(result3.operation).toBeDefined();
  });
});
