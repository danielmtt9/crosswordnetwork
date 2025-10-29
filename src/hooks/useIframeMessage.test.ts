import { renderHook } from '@testing-library/react';
import { useIframeMessage } from './useIframeMessage';
import { createRef } from 'react';

describe('useIframeMessage', () => {
  it('should initialize with default values', () => {
    const iframeRef = createRef<HTMLIFrameElement>();
    const { result } = renderHook(() => useIframeMessage({ iframeRef }));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.lastMessageTime).toBeNull();
  });

  it('should provide command functions', () => {
    const iframeRef = createRef<HTMLIFrameElement>();
    const { result } = renderHook(() => useIframeMessage({ iframeRef }));

    expect(typeof result.current.getState).toBe('function');
    expect(typeof result.current.loadState).toBe('function');
    expect(typeof result.current.setPuzzleId).toBe('function');
    expect(typeof result.current.revealLetter).toBe('function');
    expect(typeof result.current.revealWord).toBe('function');
    expect(typeof result.current.checkPuzzle).toBe('function');
  });
});
