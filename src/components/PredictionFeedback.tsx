'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Zap, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { PredictedUpdate } from '@/lib/prediction';

interface PredictionFeedbackProps {
  predictions: Map<string, PredictedUpdate>;
  rollbacks: PredictedUpdate[];
  onDismissRollback: (rollback: PredictedUpdate) => void;
  className?: string;
}

export function PredictionFeedback({ 
  predictions, 
  rollbacks, 
  onDismissRollback,
  className = "" 
}: PredictionFeedbackProps) {
  const [visibleRollbacks, setVisibleRollbacks] = useState<PredictedUpdate[]>([]);

  // Show rollbacks with animation
  useEffect(() => {
    if (rollbacks.length > visibleRollbacks.length) {
      const newRollbacks = rollbacks.slice(visibleRollbacks.length);
      setVisibleRollbacks(prev => [...prev, ...newRollbacks]);
      
      // Auto-dismiss rollbacks after 3 seconds
      newRollbacks.forEach(rollback => {
        setTimeout(() => {
          setVisibleRollbacks(prev => prev.filter(r => r !== rollback));
          onDismissRollback(rollback);
        }, 3000);
      });
    }
  }, [rollbacks, visibleRollbacks.length, onDismissRollback]);

  const activePredictions = Array.from(predictions.values());
  const hasActivePredictions = activePredictions.length > 0;
  const hasVisibleRollbacks = visibleRollbacks.length > 0;

  if (!hasActivePredictions && !hasVisibleRollbacks) {
    return null;
  }

  return (
    <div className={`prediction-feedback ${className}`}>
      {/* Active Predictions Indicator */}
      {hasActivePredictions && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 animate-pulse" />
            <span>
              {activePredictions.length} prediction{activePredictions.length > 1 ? 's' : ''} pending confirmation
            </span>
            <Badge variant="outline" className="text-xs">
              {activePredictions.length}
            </Badge>
          </div>
        </div>
      )}

      {/* Rollback Notifications */}
      {hasVisibleRollbacks && (
        <div className="space-y-2">
          {visibleRollbacks.map((rollback, index) => (
            <div
              key={`${rollback.cellId}-${rollback.timestamp}`}
              className="animate-in slide-in-from-right duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Prediction Rolled Back</p>
                      <p className="text-xs">
                        Cell {rollback.cellId}: "{rollback.value}" → "{rollback.rollbackValue}"
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setVisibleRollbacks(prev => prev.filter(r => r !== rollback));
                        onDismissRollback(rollback);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact prediction status for status bars
export function PredictionStatus({ 
  predictions, 
  rollbacks,
  className = "" 
}: { 
  predictions: Map<string, PredictedUpdate>; 
  rollbacks: PredictedUpdate[];
  className?: string;
}) {
  const activeCount = predictions.size;
  const rollbackCount = rollbacks.length;

  if (activeCount === 0 && rollbackCount === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {activeCount > 0 && (
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3 text-blue-500 animate-pulse" />
          <span className="text-xs text-blue-600">
            {activeCount} pred
          </span>
        </div>
      )}
      
      {rollbackCount > 0 && (
        <div className="flex items-center space-x-1">
          <RotateCcw className="h-3 w-3 text-orange-500" />
          <span className="text-xs text-orange-600">
            {rollbackCount} rollback
          </span>
        </div>
      )}
    </div>
  );
}

// Prediction performance indicator
export function PredictionPerformance({ 
  stats,
  className = "" 
}: { 
  stats: { activePredictions: number; totalRollbacks: number; averagePredictionTime: number };
  className?: string;
}) {
  const { activePredictions, totalRollbacks, averagePredictionTime } = stats;
  
  if (activePredictions === 0 && totalRollbacks === 0) {
    return null;
  }

  const successRate = totalRollbacks > 0 
    ? Math.max(0, 100 - (totalRollbacks / (activePredictions + totalRollbacks)) * 100)
    : 100;

  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      <div className="flex items-center space-x-1">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span className="text-green-600">
          {successRate.toFixed(0)}% success
        </span>
      </div>
      
      {averagePredictionTime > 0 && (
        <div className="flex items-center space-x-1">
          <span className="text-muted-foreground">
            {averagePredictionTime.toFixed(0)}ms avg
          </span>
        </div>
      )}
    </div>
  );
}
