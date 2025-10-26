import { useEffect, useRef, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  saveFunction: () => Promise<void>;
  delay?: number; // milliseconds
  isDirty?: boolean; // whether there are unsaved changes
  source?: 'iframe' | 'direct'; // source of changes for different debounce times
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  forceSave: () => Promise<void>;
}

export function useAutoSave({
  saveFunction,
  delay,
  isDirty = false,
  source = 'direct',
}: UseAutoSaveOptions): UseAutoSaveReturn {
  // Use different delays based on source
  const effectiveDelay = delay || (source === 'iframe' ? 300 : 1000);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const performSave = async () => {
    if (!isMountedRef.current) return;
    
    setSaveStatus('saving');
    setError(null);
    
    try {
      await saveFunction();
      if (isMountedRef.current) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        
        // Auto-hide "saved" status after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 3000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSaveStatus('error');
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    }
  };

  const forceSave = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await performSave();
  };

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only set up auto-save if there are unsaved changes
    if (isDirty) {
      timeoutRef.current = setTimeout(() => {
        performSave();
      }, effectiveDelay);
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isMountedRef.current = false;
    };
  }, [isDirty, effectiveDelay, saveFunction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    saveStatus,
    lastSaved,
    error,
    forceSave,
  };
}
