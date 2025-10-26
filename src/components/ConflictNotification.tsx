'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConflictData {
  cellId: string;
  attemptedValue: string;
  actualValue: string;
  winnerUserName: string;
  message: string;
}

interface ConflictNotificationProps {
  conflict: ConflictData | null;
  onDismiss: () => void;
}

export function ConflictNotification({ conflict, onDismiss }: ConflictNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (conflict) {
      setIsVisible(true);
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation to complete
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [conflict, onDismiss]);

  if (!conflict || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Alert className="w-80 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="space-y-2">
            <p className="font-medium">Edit Conflict Resolved</p>
            <p className="text-sm">
              You tried to enter "{conflict.attemptedValue}" but {conflict.winnerUserName} 
              entered "{conflict.actualValue}" first.
            </p>
            <p className="text-xs text-orange-600">
              Cell: {conflict.cellId}
            </p>
          </div>
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </Alert>
    </div>
  );
}

// Hook for managing conflict notifications
export function useConflictNotification() {
  const [conflict, setConflict] = useState<ConflictData | null>(null);

  const showConflict = (conflictData: ConflictData) => {
    setConflict(conflictData);
  };

  const dismissConflict = () => {
    setConflict(null);
  };

  return {
    conflict,
    showConflict,
    dismissConflict
  };
}
