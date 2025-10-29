import { renderHook } from '@testing-library/react';
import { useGameMode, GameMode } from './useGameMode';

describe('useGameMode', () => {
  it('should return "single" when no room code is provided', () => {
    const { result } = renderHook(() => useGameMode({ participantCount: 0, roomCode: null }));
    expect(result.current).toBe('single');
  });

  it('should return "single" when room code is undefined', () => {
    const { result } = renderHook(() => useGameMode({ participantCount: 0 }));
    expect(result.current).toBe('single');
  });

  it('should return "single" when participantCount is 0 with room code', () => {
    const { result } = renderHook(() => useGameMode({ participantCount: 0, roomCode: 'ABC123' }));
    expect(result.current).toBe('single');
  });

  it('should return "single" when participantCount is 1 with room code', () => {
    const { result } = renderHook(() => useGameMode({ participantCount: 1, roomCode: 'ABC123' }));
    expect(result.current).toBe('single');
  });

  it('should return "multiplayer" when participantCount is 2 with room code', () => {
    const { result } = renderHook(() => useGameMode({ participantCount: 2, roomCode: 'ABC123' }));
    expect(result.current).toBe('multiplayer');
  });

  it('should return "multiplayer" when participantCount is greater than 2 with room code', () => {
    const { result } = renderHook(() => useGameMode({ participantCount: 5, roomCode: 'ABC123' }));
    expect(result.current).toBe('multiplayer');
  });

  it('should update mode when participantCount changes', () => {
    const { result, rerender } = renderHook(
      ({ participantCount, roomCode }) => useGameMode({ participantCount, roomCode }),
      { initialProps: { participantCount: 1, roomCode: 'ABC123' } }
    );

    expect(result.current).toBe('single');

    // Add another participant
    rerender({ participantCount: 2, roomCode: 'ABC123' });
    expect(result.current).toBe('multiplayer');

    // Remove participant
    rerender({ participantCount: 1, roomCode: 'ABC123' });
    expect(result.current).toBe('single');
  });

  it('should update mode when roomCode changes', () => {
    const { result, rerender } = renderHook(
      ({ participantCount, roomCode }) => useGameMode({ participantCount, roomCode }),
      { initialProps: { participantCount: 2, roomCode: 'ABC123' } }
    );

    expect(result.current).toBe('multiplayer');

    // Remove room code
    rerender({ participantCount: 2, roomCode: null });
    expect(result.current).toBe('single');

    // Add room code back
    rerender({ participantCount: 2, roomCode: 'XYZ789' });
    expect(result.current).toBe('multiplayer');
  });

  it('should use default participantCount of 0 when not provided', () => {
    const { result } = renderHook(() => useGameMode({ roomCode: 'ABC123' }));
    expect(result.current).toBe('single');
  });

  it('should memoize result to avoid unnecessary recalculations', () => {
    const { result, rerender } = renderHook(
      ({ participantCount, roomCode }) => useGameMode({ participantCount, roomCode }),
      { initialProps: { participantCount: 2, roomCode: 'ABC123' } }
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({ participantCount: 2, roomCode: 'ABC123' });
    
    // Result should be the same reference (memoized)
    expect(result.current).toBe(firstResult);
  });
});
