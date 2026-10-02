'use client';

import { useEffect, useState } from 'react';

export interface AuthProviders {
  /** Google credentials are configured on the server. */
  google: boolean;
  /** Anyone may create an account; otherwise accounts are created by an administrator. */
  publicSignup: boolean;
}

const NONE: AuthProviders = { google: false, publicSignup: false };

let cached: Promise<AuthProviders> | null = null;

function load(): Promise<AuthProviders> {
  cached ??= fetch('/api/auth/providers', { cache: 'no-store' })
    .then((res) => (res.ok ? (res.json() as Promise<AuthProviders>) : NONE))
    .catch(() => NONE);
  return cached;
}

/**
 * Which optional sign-in methods this deployment offers. Everything starts hidden and is revealed
 * once the server confirms it, so a button never appears for a method that cannot work.
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
