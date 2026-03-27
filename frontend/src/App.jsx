import React, { useState, useCallback, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ForceChangePassword from './components/ForceChangePassword';

// Eager-loaded pages (login flow - immediate visibility)
import Login from './pages/Login';
import FindUsername from './pages/FindUsername';
import ResetPassword from './pages/ResetPassword';

// Lazy-loaded pages (code splitting)
const Signup = lazy(() => import('./pages/Signup'));
const InviteSignup = lazy(() => import('./pages/InviteSignup'));
const EmployeeMatchRequest = lazy(() => import('./pages/EmployeeMatchRequest'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const UsageGuide = lazy(() => import('./pages/UsageGuide'));
const QrAttendance = lazy(() => import('./pages/QrAttendance'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const SystemGuide = lazy(() => import('./pages/SystemGuide'));

// Loading spinner for Suspense fallback
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #e0e0e0', borderTop: '4px solid #4A90D9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Main App Router
const AppRouter = () => {
  const { user } = useAuth();
  const [forceChanged, setForceChanged] = useState(false);

  const handleForcePasswordChanged = useCallback(() => {
    setForceChanged(true);
  }, []);

  // Show force password change modal if user must change password
  if (user && user.must_change_password && !forceChanged) {
    return <ForceChangePassword onSuccess={handleForcePasswordChanged} />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
      <Route path="/login-v2" element={<Navigate to="/login" />} />
      <Route path="/signup-v2" element={<Navigate to="/signup" />} />
      <Route path="/find-username" element={user ? <Navigate to="/" /> : <FindUsername />} />
      <Route path="/reset-password" element={user ? <Navigate to="/" /> : <ResetPassword />} />
      <Route path="/invite/:token" element={<InviteSignup />} />
      <Route path="/guide" element={<UsageGuide />} />
      <Route path="/system-guide" element={<SystemGuide />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/qr" element={<QrAttendance />} />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/match-request"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeMatchRequest />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {(user?.role === 'admin' || user?.role === 'super_admin') && <AdminDashboard />}
            {user?.role === 'owner' && <OwnerDashboard />}
            {user?.role === 'employee' && <EmployeeDashboard />}
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={['owner']}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/*"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Router>
  );
}

export default App;
