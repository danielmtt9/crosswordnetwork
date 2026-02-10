'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { getConsent, setConsent, type CookieConsent } from '@/lib/cookies/siteCookies';

type PrefsState = {
  preferences: boolean;
};

export function CookieBanner() {
  const [consent, setConsentState] = useState<CookieConsent | null>(null);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [prefs, setPrefs] = useState<PrefsState>({ preferences: false });

  useEffect(() => {
    const c = getConsent();
    setConsentState(c);
    setOpen(!c);
    setPrefs({ preferences: !!c?.preferencesAccepted });
  }, []);

  const copy = useMemo(() => {
    return {
      title: 'Cookies on crossword.network',
      body:
        'We use necessary cookies to keep you signed in and protect your session. With your permission, we also use preference cookies to remember theme and solver settings.',
    };
  }, []);

  if (!open) return null;

  const acceptAll = () => {
    const c = setConsent(true);
    setConsentState(c);
    setOpen(false);
    setManageOpen(false);
  };

  const rejectPrefs = () => {
    const c = setConsent(false);
    setConsentState(c);
    setOpen(false);
    setManageOpen(false);
  };

  const saveManage = () => {
    const c = setConsent(!!prefs.preferences);
    setConsentState(c);
    setOpen(false);
    setManageOpen(false);
  };

  return (
    <>
      <div
        data-testid="cookie-banner"
        className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-card/90 backdrop-blur-xl"
      >
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold">{copy.title}</div>
              <p className="text-sm text-muted-foreground">
                {copy.body}{' '}
                <Link className="underline underline-offset-4 hover:text-foreground" href="/cookies">
                  Read our Cookie Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={rejectPrefs} data-testid="cookie-reject">
                Reject preferences
              </Button>
              <Button variant="outline" onClick={() => setManageOpen(true)} data-testid="cookie-manage">
                Manage
              </Button>
              <Button onClick={acceptAll} data-testid="cookie-accept">
                Accept all
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Necessary cookies are always on. Turn preference cookies on if you want us to remember theme and solver
              settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Necessary</div>
                <div className="text-sm text-muted-foreground">
                  Required for sign-in, security, and basic site operation.
                </div>
              </div>
              <Switch checked disabled />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Preferences</div>
                <div className="text-sm text-muted-foreground">
                  Remembers theme (light/dark/system) and solver preferences like ECW classic/premium mode.
                </div>
              </div>
              <Switch
                checked={prefs.preferences}
                onCheckedChange={(checked) => setPrefs({ preferences: checked })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManageOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveManage} data-testid="cookie-save">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

