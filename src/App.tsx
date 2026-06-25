/* App shell: routing + the "phone frame" layout. Tab screens (Shift, Insights)
   share the bottom nav; pushed screens (create, circle, walkie, handoff) are
   full-screen with their own back navigation. Auth gates everything. */

import { useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { IntroOverlay } from './components/IntroOverlay';
import { Splash } from './components/Splash';
import { CircleDetailScreen } from './screens/CircleDetailScreen';
import { CreateCircleScreen } from './screens/CreateCircleScreen';
import { HandoffScreen } from './screens/HandoffScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TeamDirectoryScreen } from './screens/TeamDirectoryScreen';
import { WalkieTalkieScreen } from './screens/WalkieTalkieScreen';
import { AppProvider, useApp } from './store/AppContext';
import { useAuth } from './store/AuthContext';

/** Waits for the app data to hydrate before showing the authed UI. */
function AppGate() {
  const { status } = useApp();
  if (status === 'loading') return <Splash />;
  return <Outlet />;
}

/** Redirects to login when there's no session; otherwise mounts the data layer. */
function RequireAuth() {
  const { session, ready } = useAuth();
  if (!ready) return <Splash label="Starting Vitali…" />;
  if (!session) return <Navigate to="/login" replace />;
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

// Module-level so the intro shows once per app open (page load), not on every
// in-app navigation. A full reload — i.e. re-opening the app — resets it.
let introSeenThisLoad = false;

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !introSeenThisLoad);
  const dismissIntro = () => {
    introSeenThisLoad = true;
    setShowIntro(false);
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app-bg" />
      <div className="app-frame">
        {showIntro && <IntroOverlay onDone={dismissIntro} />}
        <Routes>
          <Route path="/login" element={<LoginScreen />} />

          <Route element={<RequireAuth />}>
            <Route element={<TabsLayout />}>
              <Route path="/shift" element={<HomeScreen />} />
              <Route path="/insights" element={<InsightsScreen />} />
            </Route>
            <Route path="/create" element={<CreateCircleScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/team" element={<TeamDirectoryScreen />} />
            <Route path="/circle/:id" element={<CircleDetailScreen />} />
            <Route path="/circle/:id/talk" element={<WalkieTalkieScreen />} />
            <Route path="/circle/:id/handoff" element={<HandoffScreen />} />
          </Route>

          <Route path="*" element={<Navigate to="/shift" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
