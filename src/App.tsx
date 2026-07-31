/* =============================================================================
   App shell — the unified Vitali demo.
   One persistent top navigation (DemoShell) across four surfaces:
     •  /            landing / front door (marketing)
     •  /shift …     the live app demo, presented in phone chrome (PhoneShell)
     •  /training …  the Training surfaces (home, session review, scale)
     •  /impact      Insights — the hospital-administrator view
     •  /about       the technology, stated plainly
   The guided tour (TourProvider) can drive the viewer through all of it.

   The demo needs no login: entering the app surface signs in the demo nurse
   automatically. /login remains reachable (sign out from Profile).
   // TODO: real authentication / hospital SSO replaces the demo auto-login.
   ============================================================================= */

import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Splash } from './components/Splash';
import { AboutPage } from './demo/AboutPage';
import { DemoShell } from './demo/DemoShell';
import { ImpactPage } from './demo/ImpactPage';
import { LandingPage } from './demo/LandingPage';
import { PhoneShell } from './demo/PhoneShell';
import { ScalePage } from './demo/ScalePage';
import { SessionReview } from './demo/SessionReview';
import { TourProvider } from './demo/Tour';
import { TrainingHome } from './demo/TrainingHome';
import { CircleDetailScreen } from './screens/CircleDetailScreen';
import { CreateCircleScreen } from './screens/CreateCircleScreen';
import { HandoffScreen } from './screens/HandoffScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TeamDirectoryScreen } from './screens/TeamDirectoryScreen';
import { TrainingCaseScreen } from './screens/TrainingCaseScreen';
import { TrainingScreen } from './screens/TrainingScreen';
import { WalkieTalkieScreen } from './screens/WalkieTalkieScreen';
import { AppProvider, useApp } from './store/AppContext';
import { useAuth } from './store/AuthContext';

/** Waits for the app data to hydrate before showing the authed UI. */
function AppGate() {
  const { status } = useApp();
  if (status === 'loading') return <Splash />;
  return <Outlet />;
}

/**
 * Demo auth gate: if no session exists, sign the demo nurse in automatically so
 * reviewers land straight in the product. Sign-out (Profile) still works and
 * shows the real login screen.
 */
function RequireAuth() {
  const { session, ready, signIn } = useAuth();
  useEffect(() => {
    if (ready && !session) {
      void signIn('Cedar Valley Medical Center', 'demo-pass');
    }
  }, [ready, session, signIn]);
  if (!ready || !session) return <Splash label="Starting the live demo…" />;
  return (
    <AppProvider>
      <AppGate />
    </AppProvider>
  );
}

/** Tabbed area with the persistent bottom navigation. */
function TabsLayout() {
  return (
    <>
      <div className="tab-scroll">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app-bg" />
      <TourProvider>
        <Routes>
          <Route element={<DemoShell />}>
            {/* Surface 1 — landing / front door */}
            <Route path="/" element={<LandingPage />} />

            {/* Surface 3 — Training (full-width web view) */}
            <Route path="/training" element={<TrainingHome />} />
            <Route path="/training/session/:cid" element={<SessionReview />} />
            <Route path="/training/scale" element={<ScalePage />} />

            {/* Surface 4 — Insights (hospital admin) */}
            <Route path="/impact" element={<ImpactPage />} />

            {/* About / the technology */}
            <Route path="/about" element={<AboutPage />} />

            {/* Surface 2 — the live app demo, in phone chrome */}
            <Route element={<PhoneShell />}>
              <Route path="/login" element={<LoginScreen />} />
              <Route element={<RequireAuth />}>
                <Route element={<TabsLayout />}>
                  <Route path="/shift" element={<HomeScreen />} />
                  <Route path="/insights" element={<InsightsScreen />} />
                  <Route path="/learn" element={<TrainingScreen />} />
                  <Route path="/profile" element={<ProfileScreen />} />
                </Route>
                <Route path="/create" element={<CreateCircleScreen />} />
                <Route path="/team" element={<TeamDirectoryScreen />} />
                <Route path="/learn/:id" element={<TrainingCaseScreen />} />
                <Route path="/circle/:id" element={<CircleDetailScreen />} />
                <Route path="/circle/:id/talk" element={<WalkieTalkieScreen />} />
                <Route path="/circle/:id/handoff" element={<HandoffScreen />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </TourProvider>
    </BrowserRouter>
  );
}
