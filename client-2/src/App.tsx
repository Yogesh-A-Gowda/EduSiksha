import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient'; // Ensure you have this file
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { SocketProvider } from './context/SocketContext';
// Pages - Auth
import Login from './pages/Login';
import RegisterParent from './pages/parent/auth/RegisterParent';

// Pages - Parent
import AddKidOnboarding from './pages/parent/AddKidOnboarding';
import Dashboard from './pages/parent/Dashboard';
import StudentReport from './pages/parent/StudentReport';

// Pages - Student
import Chat from './pages/student/Chat';

// --- PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#131314]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  // 1. If not authenticated or user data missing, force login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Identify role - match your DB lowercase name
  const isParent = user.isAdmin === true;

  // 3. Parent trying to access Chat
  if (!adminOnly && isParent) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Student trying to access Parent Dashboard
  if (adminOnly && !isParent) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
};

// --- AUTH REDIRECT (Root Path) ---
const AuthRedirect = () => {
  const useRole = () => {
  const { user } = useAuth();
  const isParent = user?.isAdmin === true || user?.is_admin === true;
  return { isParent };
};
  const { user, isAuthenticated, loading } = useAuth();
  const { isParent } = useRole();
  
  // IMPORTANT: Do nothing while loading to prevent "accidental" redirects
  if (loading) return (
    <div className="h-screen bg-[#131314] flex items-center justify-center">
       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
    </div>
  );

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  
  // If we have a user, send them to their specific home
  return isParent ? <Navigate to="/dashboard" replace /> : <Navigate to="/chat" replace />;
};

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* CRITICAL: SocketProvider must be INSIDE AuthProvider to access the Token */}
        <SocketProvider>
          <ModalProvider>
            <Router>
              <Routes>
                {/* --- Public Routes --- */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<RegisterParent />} />

                {/* --- Parent Routes (Protected: adminOnly=true) --- */}
                <Route path="/dashboard" element={
                  <ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>
                } />
                <Route path="/onboarding/add-kid" element={
                  <ProtectedRoute adminOnly><AddKidOnboarding /></ProtectedRoute>
                } />
                <Route path="/report/:id" element={
                  <ProtectedRoute adminOnly><StudentReport /></ProtectedRoute>
                } />

                {/* --- Student Routes (Protected: adminOnly=false) --- */}
                <Route path="/chat" element={
                  <ProtectedRoute><Chat /></ProtectedRoute>
                } />

                {/* --- Redirects --- */}
                <Route path="/" element={<AuthRedirect />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </ModalProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;