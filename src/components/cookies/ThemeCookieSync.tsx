'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { canUsePreferences, setCookie } from '@/lib/cookies/siteCookies';

export function ThemeCookieSync() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!canUsePreferences()) return;
    const v = (theme || 'system').toString();
    if (v !== 'light' && v !== 'dark' && v !== 'system') return;
    setCookie('cw_theme', v, { maxAgeSeconds: 60 * 60 * 24 * 365, sameSite: 'Lax' });
  }, [theme]);

  return null;
}

