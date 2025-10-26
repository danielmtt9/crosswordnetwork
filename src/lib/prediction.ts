/**
 * Client-side prediction system for multiplayer grid updates
 * Provides immediate visual feedback while waiting for server confirmation
 */

export interface PredictedUpdate {
  cellId: string;
  value: string;
  timestamp: number;
  clientId: string;
  confirmed: boolean;
  rollbackValue?: string;
}

export interface PredictionState {
  predictedUpdates: Map<string, PredictedUpdate>;
  rollbackQueue: PredictedUpdate[];
}

export class ClientPrediction {
  private state: PredictionState = {
    predictedUpdates: new Map(),
    rollbackQueue: []
  };

  private maxRollbackHistory = 50;
  private predictionTimeout = 5000; // 5 seconds

  /**
   * Predict a cell update - apply immediately and queue for server confirmation
   */
  predictUpdate(
    cellId: string, 
    value: string, 
    clientId: string,
    currentValue?: string
  ): PredictedUpdate {
    const now = Date.now();
    
    // Store previous value for potential rollback
    const previousValue = currentValue || '';
    
    const prediction: PredictedUpdate = {
      cellId,
      value,
      timestamp: now,
      clientId,
      confirmed: false,
      rollbackValue: previousValue
    };

    // Add to predictions
    this.state.predictedUpdates.set(cellId, prediction);

    // Set timeout for auto-rollback if not confirmed
    setTimeout(() => {
      if (!prediction.confirmed) {
        this.rollbackPrediction(cellId);
      }
    }, this.predictionTimeout);

    return prediction;
  }

  /**
   * Confirm a prediction when server response is received
   */
  confirmPrediction(cellId: string, serverValue: string, serverTimestamp: number): boolean {
    const prediction = this.state.predictedUpdates.get(cellId);
    
    if (!prediction) {
      return false; // No prediction to confirm
    }

    // Check if server value matches our prediction
    if (prediction.value === serverValue) {
      // Prediction was correct
      prediction.confirmed = true;
      this.state.predictedUpdates.delete(cellId);
      return true;
    } else {
      // Prediction was wrong - rollback
      this.rollbackPrediction(cellId);
      return false;
    }
  }

  /**
   * Rollback a prediction due to conflict or timeout
   */
  rollbackPrediction(cellId: string): PredictedUpdate | null {
    const prediction = this.state.predictedUpdates.get(cellId);
    
    if (!prediction) {
      return null;
    }

    // Add to rollback queue for UI feedback
    this.state.rollbackQueue.push(prediction);
    
    // Limit rollback queue size
    if (this.state.rollbackQueue.length > this.maxRollbackHistory) {
      this.state.rollbackQueue = this.state.rollbackQueue.slice(-this.maxRollbackHistory);
    }

    // Remove from predictions
    this.state.predictedUpdates.delete(cellId);

    return prediction;
  }

  /**
   * Get all current predictions
   */
  getPredictions(): Map<string, PredictedUpdate> {
    return new Map(this.state.predictedUpdates);
  }

  /**
   * Get rollback queue for UI feedback
   */
  getRollbacks(): PredictedUpdate[] {
    return [...this.state.rollbackQueue];
  }

  /**
   * Clear old rollbacks
   */
  clearOldRollbacks(maxAge: number = 10000): void {
    const now = Date.now();
    this.state.rollbackQueue = this.state.rollbackQueue.filter(
      rollback => now - rollback.timestamp < maxAge
    );
  }

  /**
   * Check if a cell has a pending prediction
   */
  hasPrediction(cellId: string): boolean {
    return this.state.predictedUpdates.has(cellId);
  }

  /**
   * Get prediction for a specific cell
   */
  getPrediction(cellId: string): PredictedUpdate | null {
    return this.state.predictedUpdates.get(cellId) || null;
  }

  /**
   * Clear all predictions (useful for disconnection)
   */
  clearAllPredictions(): void {
    this.state.predictedUpdates.clear();
  }

  /**
   * Get prediction statistics
   */
  getStats(): {
    activePredictions: number;
    totalRollbacks: number;
    averagePredictionTime: number;
  } {
    const activePredictions = this.state.predictedUpdates.size;
    const totalRollbacks = this.state.rollbackQueue.length;
    
    // Calculate average prediction time for confirmed predictions
    const confirmedPredictions = this.state.rollbackQueue.filter(r => r.confirmed);
    const averagePredictionTime = confirmedPredictions.length > 0 
      ? confirmedPredictions.reduce((sum, p) => sum + (Date.now() - p.timestamp), 0) / confirmedPredictions.length
      : 0;

    return {
      activePredictions,
      totalRollbacks,
      averagePredictionTime
    };
  }
}

// Global prediction instance
export const clientPrediction = new ClientPrediction();

// Utility functions for React components
export function useClientPrediction() {
  const [predictions, setPredictions] = React.useState<Map<string, PredictedUpdate>>(new Map());
  const [rollbacks, setRollbacks] = React.useState<PredictedUpdate[]>([]);

  React.useEffect(() => {
    const updatePredictions = () => {
      setPredictions(clientPrediction.getPredictions());
      setRollbacks(clientPrediction.getRollbacks());
    };

    // Update every 100ms for smooth UI
    const interval = setInterval(updatePredictions, 100);
    
    // Initial update
    updatePredictions();

    return () => clearInterval(interval);
  }, []);

  const predictUpdate = React.useCallback((
    cellId: string, 
    value: string, 
    clientId: string,
    currentValue?: string
  ) => {
    return clientPrediction.predictUpdate(cellId, value, clientId, currentValue);
  }, []);

  const confirmPrediction = React.useCallback((cellId: string, serverValue: string, serverTimestamp: number) => {
    return clientPrediction.confirmPrediction(cellId, serverValue, serverTimestamp);
  }, []);

  const rollbackPrediction = React.useCallback((cellId: string) => {
    return clientPrediction.rollbackPrediction(cellId);
  }, []);

  const clearOldRollbacks = React.useCallback((maxAge?: number) => {
    clientPrediction.clearOldRollbacks(maxAge);
  }, []);

  return {
    predictions,
    rollbacks,
    predictUpdate,
    confirmPrediction,
    rollbackPrediction,
    clearOldRollbacks,
    stats: clientPrediction.getStats()
  };
}

// Import React for the hook
import React from 'react';
