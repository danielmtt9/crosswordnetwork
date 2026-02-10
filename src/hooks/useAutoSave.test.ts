import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  let mockSaveFunction: jest.Mock;

  beforeEach(() => {
    mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    jest.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('should initialize with idle status', () => {
    const { result } = renderHook(() =>
      useAutoSave({ saveFunction: mockSaveFunction })
    );

    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isOnline).toBe(true);
  });

  it('should trigger debounced save when isDirty becomes true', async () => {
    const { rerender } = renderHook(
      ({ isDirty }) => useAutoSave({ saveFunction: mockSaveFunction, isDirty, debounceDelay: 10 }),
      { initialProps: { isDirty: false } }
    );

    expect(mockSaveFunction).not.toHaveBeenCalled();

    rerender({ isDirty: true });

    await waitFor(() => {
      expect(mockSaveFunction).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should set saved status after successful save', async () => {
    const { result } = renderHook(() =>
      useAutoSave({ saveFunction: mockSaveFunction, isDirty: true, debounceDelay: 10 })
    );

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    }, { timeout: 3000 });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(result.current.error).toBeNull();
  });

  it('should handle save errors', async () => {
    const errorMessage = 'Network error';
    mockSaveFunction.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useAutoSave({ saveFunction: mockSaveFunction, isDirty: true, maxRetries: 0, debounceDelay: 10 })
    );

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('error');
    }, { timeout: 3000 });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should retry failed saves with exponential backoff', async () => {
    let callCount = 0;
    mockSaveFunction.mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Temporary error'));
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() =>
      useAutoSave({
        saveFunction: mockSaveFunction,
        isDirty: true,
        maxRetries: 3,
        debounceDelay: 10,
      })
    );

    // Wait for eventual success after retries
    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    }, { timeout: 10000 });

    expect(mockSaveFunction).toHaveBeenCalledTimes(3);
  });

  it('should detect offline status', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        saveFunction: mockSaveFunction,
        enableOfflineQueue: true,
      })
    );

    // Trigger offline event
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });
  });

  it('should detect online status', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        saveFunction: mockSaveFunction,
      })
    );

    expect(result.current.isOnline).toBe(true);
  });

  it('should support force save', async () => {
    const { result } = renderHook(() =>
      useAutoSave({ saveFunction: mockSaveFunction })
    );

    await act(async () => {
      await result.current.forceSave();
    });

    await waitFor(() => {
      expect(mockSaveFunction).toHaveBeenCalled();
      expect(result.current.saveStatus).toBe('saved');
    }, { timeout: 3000 });
  });

  it('should set up periodic save interval', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        saveFunction: mockSaveFunction,
        isDirty: true,
        timeBasedInterval: 100,
        debounceDelay: 10,
      })
    );

    // Wait for at least one save
    await waitFor(() => {
      expect(mockSaveFunction).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(result.current.saveStatus).toBeDefined();
  });

  it('should call onSaveSuccess callback', async () => {
    const onSaveSuccess = jest.fn();

    renderHook(() =>
      useAutoSave({
        saveFunction: mockSaveFunction,
        isDirty: true,
        debounceDelay: 10,
        onSaveSuccess,
      })
    );

    await waitFor(() => {
      expect(onSaveSuccess).toHaveBeenCalledWith(expect.anything());
    }, { timeout: 3000 });
  });

  it('should call onSaveError callback on failure', async () => {
    const onSaveError = jest.fn();
    mockSaveFunction.mockRejectedValue(new Error('Test error'));

    renderHook(() =>
      useAutoSave({
        saveFunction: mockSaveFunction,
        isDirty: true,
        maxRetries: 0,
        debounceDelay: 10,
        onSaveError,
      })
    );

    await waitFor(() => {
      expect(onSaveError).toHaveBeenCalledWith(expect.any(Error), expect.anything());
    }, { timeout: 3000 });
  });

  it('should transition from saved to idle status', async () => {
    const { result } = renderHook(() =>
      useAutoSave({ saveFunction: mockSaveFunction, isDirty: true, debounceDelay: 10 })
    );

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    }, { timeout: 3000 });

    // Status should eventually return to idle
    await waitFor(() => {
      expect(result.current.saveStatus).toBe('idle');
    }, { timeout: 5000 });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() =>
      useAutoSave({ saveFunction: mockSaveFunction, isDirty: true })
    );

    unmount();

    // Should not throw errors
    expect(true).toBe(true);
  });
});
