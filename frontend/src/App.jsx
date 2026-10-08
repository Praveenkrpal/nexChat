import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";

import { AuthProvider, useAuth } from "./context/AuthContext";

import { SocketProvider } from "./context/SocketContext";

// ==========================================
// PROTECTED ROUTE
// ==========================================

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ==========================================
// PUBLIC ROUTE
// ==========================================

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

// ==========================================
// APP ROUTES
// ==========================================

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ========================================
          HOME
      ======================================== */}

      <Route
        path="/"
        element={<Navigate to={user ? "/chat" : "/login"} replace />}
      />

      {/* ========================================
          LOGIN
      ======================================== */}

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* ========================================
          REGISTER
      ======================================== */}

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* ========================================
          FORGOT PASSWORD
      ======================================== */}

      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />

      {/* ========================================
          CHAT
      ======================================== */}

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat user={user} />
          </ProtectedRoute>
        }
      />

      {/* ========================================
          PROFILE
      ======================================== */}

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* ========================================
          404
      ======================================== */}

      <Route
        path="*"
        element={<Navigate to={user ? "/chat" : "/login"} replace />}
      />
    </Routes>
  );
};

// ==========================================
// APP
// ==========================================

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
