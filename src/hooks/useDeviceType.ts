'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to detect device type based on window width using Tailwind breakpoints.
 * - mobile: < 768px
 * - tablet: >= 768px and < 1024px
 * - desktop: >= 1024px
 * 
 * @returns Current device type
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getDeviceType(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    
    // Set initial value after mount
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceType;
}

/**
 * Utility function to determine device type from window width.
 * @param width - Window inner width in pixels
 * @returns Device type
 */
function getDeviceType(width: number): DeviceType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
