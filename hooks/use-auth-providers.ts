'use client';

import { useEffect, useState } from 'react';

export interface AuthProviders {
  /** Google sign-in works (credentials are configured on the server). */
  google: boolean;
  /** Google may also create new accounts, not just sign existing ones in. */
  googleSignup: boolean;
  /** Email + password sign-up works on the web. */
  emailSignup: boolean;
  /** The server has answered; until then everything above is false and the UI should stay neutral. */
  ready: boolean;
}

const NONE: AuthProviders = { google: false, googleSignup: false, emailSignup: false, ready: false };
// A failed lookup resolves to "nothing offered" rather than leaving the page loading forever.
const UNAVAILABLE: AuthProviders = { ...NONE, ready: true };

let cached: Promise<AuthProviders> | null = null;

function load(): Promise<AuthProviders> {
  cached ??= fetch('/api/auth/providers', { cache: 'no-store' })
    .then(async (res) => (res.ok ? { ...UNAVAILABLE, ...(await res.json()), ready: true } : UNAVAILABLE))
    .catch(() => UNAVAILABLE);
  return cached;
}

/**
 * Which optional sign-in / sign-up methods this deployment offers. Everything starts hidden and is
 * revealed once the server confirms it, so a button never appears for a method that cannot work.
 */
export function useAuthProviders(): AuthProviders {
  const [providers, setProviders] = useState<AuthProviders>(NONE);
  useEffect(() => {
    let live = true;
    void load().then((p) => live && setProviders(p));
    return () => {
      live = false;
    };
  }, []);
  return providers;
}
