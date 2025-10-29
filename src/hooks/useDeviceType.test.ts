import { renderHook, act } from '@testing-library/react';
import { useDeviceType, DeviceType } from './useDeviceType';

describe('useDeviceType', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Reset window.innerWidth before each test
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    // Restore original innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('should return "mobile" for width < 768px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    });

    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('mobile');
  });

  it('should return "tablet" for width >= 768px and < 1024px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('tablet');

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1023,
    });

    const { result: result2 } = renderHook(() => useDeviceType());
    expect(result2.current).toBe('tablet');
  });

  it('should return "desktop" for width >= 1024px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('desktop');

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const { result: result2 } = renderHook(() => useDeviceType());
    expect(result2.current).toBe('desktop');
  });

  it('should update device type on window resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('desktop');

    // Resize to tablet
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('tablet');

    // Resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('mobile');
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useDeviceType());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('should handle exact breakpoint boundaries correctly', () => {
    // Test mobile/tablet boundary (768px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result: resultTablet } = renderHook(() => useDeviceType());
    expect(resultTablet.current).toBe('tablet');

    // Test tablet/desktop boundary (1024px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result: resultDesktop } = renderHook(() => useDeviceType());
    expect(resultDesktop.current).toBe('desktop');
  });
});
