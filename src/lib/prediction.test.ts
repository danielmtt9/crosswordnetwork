import { ClientPrediction, PredictedUpdate } from './prediction';

describe('ClientPrediction', () => {
  let prediction: ClientPrediction;

  beforeEach(() => {
    prediction = new ClientPrediction();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('predictUpdate', () => {
    it('should create a prediction with correct data', () => {
      const result = prediction.predictUpdate('A1', 'X', 'client1', '');
      
      expect(result).toEqual({
        cellId: 'A1',
        value: 'X',
        timestamp: expect.any(Number),
        clientId: 'client1',
        confirmed: false,
        rollbackValue: ''
      });
    });

    it('should store prediction in active predictions', () => {
      prediction.predictUpdate('A1', 'X', 'client1', '');
      
      expect(prediction.hasPrediction('A1')).toBe(true);
      expect(prediction.getPredictions().size).toBe(1);
    });

    it('should auto-rollback after timeout', () => {
      const rollbackSpy = jest.spyOn(prediction, 'rollbackPrediction');
      
      prediction.predictUpdate('A1', 'X', 'client1', '');
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(5000);
      
      expect(rollbackSpy).toHaveBeenCalledWith('A1');
    });
  });

  describe('confirmPrediction', () => {
    it('should confirm correct prediction', () => {
      prediction.predictUpdate('A1', 'X', 'client1', '');
      
      const result = prediction.confirmPrediction('A1', 'X', Date.now());
      
      expect(result).toBe(true);
      expect(prediction.hasPrediction('A1')).toBe(false);
    });

    it('should rollback incorrect prediction', () => {
      const rollbackSpy = jest.spyOn(prediction, 'rollbackPrediction');
      
      prediction.predictUpdate('A1', 'X', 'client1', '');
      
      const result = prediction.confirmPrediction('A1', 'Y', Date.now());
      
      expect(result).toBe(false);
      expect(rollbackSpy).toHaveBeenCalledWith('A1');
    });

    it('should return false for non-existent prediction', () => {
      const result = prediction.confirmPrediction('A1', 'X', Date.now());
      
      expect(result).toBe(false);
    });
  });

  describe('rollbackPrediction', () => {
    it('should rollback prediction and add to rollback queue', () => {
      prediction.predictUpdate('A1', 'X', 'client1', 'O');
      
      const result = prediction.rollbackPrediction('A1');
      
      expect(result).toEqual({
        cellId: 'A1',
        value: 'X',
        timestamp: expect.any(Number),
        clientId: 'client1',
        confirmed: false,
        rollbackValue: 'O'
      });
      
      expect(prediction.hasPrediction('A1')).toBe(false);
      expect(prediction.getRollbacks()).toHaveLength(1);
    });

    it('should return null for non-existent prediction', () => {
      const result = prediction.rollbackPrediction('A1');
      
      expect(result).toBe(null);
    });

    it('should limit rollback queue size', () => {
      // Add more than max rollback history
      for (let i = 0; i < 60; i++) {
        prediction.predictUpdate(`A${i}`, 'X', 'client1', '');
        prediction.rollbackPrediction(`A${i}`);
      }
      
      expect(prediction.getRollbacks().length).toBeLessThanOrEqual(50);
    });
  });

  describe('clearOldRollbacks', () => {
    it('should remove old rollbacks', () => {
      // Add some rollbacks
      prediction.predictUpdate('A1', 'X', 'client1', '');
      prediction.rollbackPrediction('A1');
      
      // Fast-forward time
      jest.advanceTimersByTime(15000);
      
      prediction.clearOldRollbacks(10000);
      
      expect(prediction.getRollbacks()).toHaveLength(0);
    });

    it('should keep recent rollbacks', () => {
      // Add some rollbacks
      prediction.predictUpdate('A1', 'X', 'client1', '');
      prediction.rollbackPrediction('A1');
      
      // Fast-forward time by less than max age
      jest.advanceTimersByTime(5000);
      
      prediction.clearOldRollbacks(10000);
      
      expect(prediction.getRollbacks()).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      // Add some predictions and rollbacks
      prediction.predictUpdate('A1', 'X', 'client1', '');
      prediction.predictUpdate('A2', 'Y', 'client1', '');
      prediction.rollbackPrediction('A1');
      
      const stats = prediction.getStats();
      
      expect(stats).toEqual({
        activePredictions: 1, // A2 is still active
        totalRollbacks: 1,
        averagePredictionTime: expect.any(Number)
      });
    });
  });

  describe('clearAllPredictions', () => {
    it('should clear all active predictions', () => {
      prediction.predictUpdate('A1', 'X', 'client1', '');
      prediction.predictUpdate('A2', 'Y', 'client1', '');
      
      prediction.clearAllPredictions();
      
      expect(prediction.getPredictions().size).toBe(0);
      expect(prediction.hasPrediction('A1')).toBe(false);
      expect(prediction.hasPrediction('A2')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple predictions for same cell', () => {
      prediction.predictUpdate('A1', 'X', 'client1', '');
      prediction.predictUpdate('A1', 'Y', 'client1', 'X');
      
      // Should have only one prediction (latest)
      expect(prediction.getPredictions().size).toBe(1);
      expect(prediction.getPrediction('A1')?.value).toBe('Y');
    });

    it('should handle prediction confirmation after timeout', () => {
      prediction.predictUpdate('A1', 'X', 'client1', '');
      
      // Fast-forward to trigger timeout
      jest.advanceTimersByTime(5000);
      
      // Try to confirm after rollback
      const result = prediction.confirmPrediction('A1', 'X', Date.now());
      
      expect(result).toBe(false); // Should fail because prediction was rolled back
    });
  });
});
