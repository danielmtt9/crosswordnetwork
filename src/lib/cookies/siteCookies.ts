export type CookieConsent = {
  v: number;
  updatedAt: string; // ISO string
  preferencesAccepted: boolean;
};

type SetCookieOptions = {
  path?: string;
  maxAgeSeconds?: number;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
};

function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k !== name) continue;
    const v = part.slice(eq + 1);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

export function setCookie(name: string, value: string, options?: SetCookieOptions): void {
  if (!isBrowser()) return;
  const opts: Required<SetCookieOptions> = {
    path: options?.path ?? '/',
    maxAgeSeconds: options?.maxAgeSeconds ?? 60 * 60 * 24 * 180, // 180 days
    sameSite: options?.sameSite ?? 'Lax',
    secure:
      options?.secure ??
      (typeof window !== 'undefined' ? window.location.protocol === 'https:' : false),
  };

  const chunks = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAgeSeconds}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.secure) chunks.push('Secure');
  document.cookie = chunks.join('; ');
}

export function deleteCookie(name: string): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getConsent(): CookieConsent | null {
  const raw = getCookie('cw_cookie_consent');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.v === 'number' &&
      typeof parsed?.updatedAt === 'string' &&
      typeof parsed?.preferencesAccepted === 'boolean'
    ) {
      return parsed as CookieConsent;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setConsent(preferencesAccepted: boolean): CookieConsent {
  const consent: CookieConsent = {
    v: 1,
    updatedAt: new Date().toISOString(),
    preferencesAccepted,
  };
  setCookie('cw_cookie_consent', JSON.stringify(consent), {
    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'Lax',
  });
  return consent;
}

export function canUsePreferences(): boolean {
  const c = getConsent();
  return !!c?.preferencesAccepted;
}

