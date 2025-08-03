import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './Components/Auth';
import Live from './Components/Live';
import Viewer from './Components/Viewer';
import FirebaseSetupWarning from './Components/FirebaseSetupWarning';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading, isFirebaseConfigured } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return <FirebaseSetupWarning />;
  }
  
  return currentUser ? children : <Navigate to="/auth" replace />;
};

// Public Route Component (redirect to home if already authenticated)
const PublicRoute = ({ children }) => {
  const { currentUser, loading, isFirebaseConfigured } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return <FirebaseSetupWarning />;
  }
  
  return currentUser ? <Navigate to="/" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route 
        path="/auth" 
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Viewer />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/viewer" 
        element={
          <ProtectedRoute>
            <Viewer />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/live" 
        element={
          <ProtectedRoute>
            <Live />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/stream" 
        element={
          <ProtectedRoute>
            <Live />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
