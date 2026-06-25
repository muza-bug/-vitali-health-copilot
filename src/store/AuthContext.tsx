/* =============================================================================
   Vitali Health AI — Auth store
   Reactive wrapper over services/auth.ts (the SSO seam). Gates the app behind
   the login screen and exposes sign-in / sign-out to the UI.
   ============================================================================= */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getSession,
  signIn as svcSignIn,
  signInWithSSO as svcSSO,
  signOut as svcSignOut,
  type Session,
} from '../services/auth';

interface AuthValue {
  session: Session | null;
  ready: boolean; // finished checking for an existing session
  signIn: (hospitalId: string, password: string) => Promise<void>;
  signInWithSSO: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a persisted session on load.
  useEffect(() => {
    setSession(getSession());
    setReady(true);
  }, []);

  const value: AuthValue = {
    session,
    ready,
    signIn: async (hospitalId, password) => {
      setSession(await svcSignIn(hospitalId, password));
    },
    signInWithSSO: async () => {
      setSession(await svcSSO());
    },
    signOut: () => {
      svcSignOut();
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
