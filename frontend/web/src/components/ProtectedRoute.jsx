import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Generic protected route - requires authentication
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
  }

  return children;
}

// Citizen only route
export function CitizenRoute({ children }) {
  const { isAuthenticated, isCitizen, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location, showLogin: true, loginType: 'citizen' }} replace />;
  }

  if (!isCitizen) {
    return <Navigate to="/gov/dashboard" replace />;
  }

  return children;
}

// Government only route
export function GovernmentRoute({ children }) {
  const { isAuthenticated, isGovernment, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location, showLogin: true, loginType: 'government' }} replace />;
  }

  if (!isGovernment) {
    return <Navigate to="/citizen/dashboard" replace />;
  }

  return children;
}

// Admin only route
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location, showLogin: true, loginType: 'government' }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/gov/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
