import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Components
import Sidebar from './components/Sidebar'

// Pages
import Dashboard from './pages/Dashboard'
import MarketScout from './pages/MarketScout'
import Competitors from './pages/Competitors'
import Reports from './pages/Reports'
import History from './pages/History'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'

// Layout wrapper
const Layout = ({ children }) => {
  const { logout } = useAuth();
  return (
    <div className="flex bg-slate-50 h-screen w-full overflow-hidden relative font-sans text-slate-800 antialiased">
      <Sidebar onLogout={logout} />
      <main className="flex-1 overflow-auto p-4 md:p-8 relative z-0">
        <div className="mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/scout" element={<MarketScout />} />
                  <Route path="/competitors" element={<Competitors />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
