import React from 'react';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthState } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import NewGoalPage from './pages/NewGoalPage';
import GoalDetailPage from './pages/GoalDetailPage';
import CheckInPage from './pages/CheckInPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AppShell from './components/layout/AppShell';

function App() {
  const authState = useAuthState();

  if (authState.loading) {
    return <LoadingScreen />;
  }

  // Wrap protected page: redirect to /onboarding if not complete
  function Protected({ children }: { children: React.ReactNode }) {
    if (!authState.user) return <Navigate to="/auth" replace />;
    if (!authState.onboardingComplete) return <Navigate to="/onboarding" replace />;
    return <AppShell>{children}</AppShell>;
  }

  return (
    <AuthContext.Provider value={authState}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={
            authState.user
              ? <Navigate to={authState.onboardingComplete ? '/dashboard' : '/onboarding'} replace />
              : <AuthPage />
          } />

          {/* Onboarding — full-screen, no sidebar */}
          <Route path="/onboarding" element={
            authState.user ? <OnboardingPage /> : <Navigate to="/auth" replace />
          } />

          {/* Protected — all require auth + completed onboarding */}
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/goals" element={<Protected><GoalsPage /></Protected>} />
          <Route path="/goals/new" element={<Protected><NewGoalPage /></Protected>} />
          <Route path="/goals/:goalId" element={<Protected><GoalDetailPage /></Protected>} />
          <Route path="/checkin" element={<Protected><CheckInPage /></Protected>} />
          <Route path="/analytics" element={<Protected><AnalyticsPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: '48px', height: '48px',
        border: '2px solid rgba(79,142,247,0.2)',
        borderTopColor: '#4f8ef7',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading Aegis AI…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}


export default App;
