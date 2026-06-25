/* Sign-in. Pre-filled for the demo — just tap Sign in (auth is mocked in
   services/auth.ts). Badge SSO is wired to the same seam. */

import { Fingerprint, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PrivacyNote } from '../components/PrivacyNote';
import { useAuth } from '../store/AuthContext';

export function LoginScreen() {
  const { session, ready, signIn, signInWithSSO } = useAuth();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState('Cedar Valley Medical Center');
  const [password, setPassword] = useState('demo-pass');
  const [busy, setBusy] = useState<null | 'creds' | 'sso'>(null);

  // Already signed in → skip straight to the floor.
  if (ready && session) return <Navigate to="/shift" replace />;

  const go = async (how: 'creds' | 'sso') => {
    if (busy) return;
    setBusy(how);
    try {
      if (how === 'sso') await signInWithSSO();
      else await signIn(hospital, password);
      navigate('/shift', { replace: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="screen login animate-fade">
      <div className="login-hero">
        <Logo size={64} variant="card" />
        <h1 className="login-word">
          Vitali<span className="t-dim"> Health AI</span>
        </h1>
        <p className="t-dim login-tag">Shared patient context, in real time, for the whole team.</p>
      </div>

      <form
        className="login-card card card-pad"
        onSubmit={(e) => {
          e.preventDefault();
          void go('creds');
        }}
      >
        <div className="field">
          <label className="label" htmlFor="hospital">Hospital</label>
          <input
            id="hospital"
            className="input"
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            autoComplete="organization"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <div className="input-icon">
            <Lock size={17} className="t-dim" />
            <input
              id="password"
              className="input has-icon"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy !== null}>
          {busy === 'creds' ? <Loader2 size={18} className="spin" /> : null}
          {busy === 'creds' ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => void go('sso')}
          disabled={busy !== null}
        >
          {busy === 'sso' ? <Loader2 size={18} className="spin" /> : <Fingerprint size={18} />}
          Badge sign-in (SSO)
        </button>
      </form>

      <div className="login-foot">
        <PrivacyNote>Demo build — no real credentials. Patient data is invented.</PrivacyNote>
      </div>
    </div>
  );
}
