import { useEffect, useRef, useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type SaveContext = {
  // When true, caller explicitly requested a save (e.g. "Save Now").
  // Auto-save paths should pass false/undefined.
  force?: boolean;
};

interface UseAutoSaveOptions {
  saveFunction: (context?: SaveContext) => Promise<void>;
  debounceDelay?: number; // milliseconds for debounce (default: 150ms)
  timeBasedInterval?: number; // milliseconds for periodic save (default: 30000ms)
  isDirty?: boolean; // whether there are unsaved changes
  maxRetries?: number; // maximum retry attempts (default: 3)
  enableOfflineQueue?: boolean; // queue saves when offline (default: true)
  onSaveSuccess?: (context?: SaveContext) => void;
  onSaveError?: (error: Error, context?: SaveContext) => void;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  forceSave: () => Promise<void>;
  isOnline: boolean;
  queuedSaves: number;
}

export function useAutoSave({
  saveFunction,
  debounceDelay = 150,
  timeBasedInterval = 30000,
  isDirty = false,
  maxRetries = 3,
  enableOfflineQueue = true,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queuedSaves, setQueuedSaves] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const saveQueueRef = useRef<Array<(context?: SaveContext) => Promise<void>>>([]);

  // Perform save with retry mechanism
  const performSave = useCallback(async (context?: SaveContext) => {
    if (!isMountedRef.current) return;
    
    // Check if offline and queue is enabled
    if (!isOnline && enableOfflineQueue) {
      saveQueueRef.current.push(saveFunction);
      setQueuedSaves(saveQueueRef.current.length);
      return;
    }
    
    setSaveStatus('saving');
    setError(null);
    
    try {
      await saveFunction(context);
      if (isMountedRef.current) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        retryCountRef.current = 0; // Reset retry count on success
        onSaveSuccess?.(context);
        
        // Auto-hide "saved" status after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 3000);
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Save failed');
      
      if (isMountedRef.current) {
        // Retry logic with exponential backoff
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
          
          setTimeout(() => {
            if (isMountedRef.current) {
              performSave(context);
            }
          }, backoffDelay);
        } else {
          // Max retries reached
          setSaveStatus('error');
          setError(errorObj.message);
          retryCountRef.current = 0;
          onSaveError?.(errorObj, context);
        }
      }
    }
  }, [saveFunction, isOnline, enableOfflineQueue, maxRetries, onSaveSuccess, onSaveError]);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    () => {
      performSave({ force: false });
    },
    debounceDelay
  );

  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    debouncedSave.cancel(); // Cancel any pending debounced saves
    await performSave({ force: true });
  }, [performSave, debouncedSave]);

  // Process queued saves when coming back online
  const processQueue = useCallback(async () => {
    if (saveQueueRef.current.length === 0) return;
    
    const queue = [...saveQueueRef.current];
    saveQueueRef.current = [];
    setQueuedSaves(0);
    
    // Process most recent save (last in queue)
    const lastSave = queue[queue.length - 1];
    if (lastSave) {
      try {
        await lastSave({ force: false });
      } catch (err) {
        console.error('Failed to process queued save:', err);
      }
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  // Debounced auto-save when dirty
  useEffect(() => {
    if (isDirty && isOnline) {
      debouncedSave();
    }
    
    return () => {
      debouncedSave.cancel();
    };
  }, [isDirty, isOnline, debouncedSave]);

  // Periodic time-based save
  useEffect(() => {
    if (timeBasedInterval > 0) {
      periodicTimerRef.current = setInterval(() => {
        if (isDirty && isOnline) {
          performSave({ force: false });
        }
      }, timeBasedInterval);
    }
    
    return () => {
      if (periodicTimerRef.current) {
        clearInterval(periodicTimerRef.current);
      }
    };
  }, [isDirty, isOnline, timeBasedInterval, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    saveStatus,
    lastSaved,
    error,
    forceSave,
    isOnline,
    queuedSaves,
  };
}
