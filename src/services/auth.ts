/* =============================================================================
   Vitali Health AI — Auth service (STUB)
   -----------------------------------------------------------------------------
   Mock hospital sign-in. The whole app talks to auth through this module, so
   wiring a real identity provider (hospital SSO / SAML / OIDC) later means
   editing only this file.

   >>> TODO: connect real identity provider / hospital SSO here. <<<
   ============================================================================= */

import { CURRENT_NURSE_ID } from '../data/mockData';

export interface Session {
  nurseId: string;
  hospital: string;
  /** Opaque token a real backend would issue. Mock value only. */
  token: string;
  issuedAt: string;
}

const STORAGE_KEY = 'vitali.session';

/** Read the persisted session (survives reload), if any. */
export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/**
 * Mock credential sign-in. Accepts anything non-empty and returns a session for
 * the demo nurse. No real validation, no real credentials — by design.
 *
 * TODO: replace with a real auth call, e.g.
 *   const res = await fetch('/auth/login', { method: 'POST', body: ... })
 */
export async function signIn(
  hospitalId: string,
  _password: string,
): Promise<Session> {
  await new Promise((r) => setTimeout(r, 700)); // feel of a network round-trip
  const session: Session = {
    nurseId: CURRENT_NURSE_ID,
    hospital: hospitalId || 'Cedar Valley Medical Center',
    token: 'mock-token-' + Math.random().toString(36).slice(2),
    issuedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/**
 * Single-sign-on entry point (e.g. hospital badge / SAML).
 * TODO: redirect to the identity provider and complete the OIDC/SAML handshake.
 */
export async function signInWithSSO(): Promise<Session> {
  // For the prototype this behaves like a fast, pre-authorized badge tap.
  return signIn('Cedar Valley Medical Center', 'sso');
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY);
  // TODO: also revoke the token / end the IdP session.
}
