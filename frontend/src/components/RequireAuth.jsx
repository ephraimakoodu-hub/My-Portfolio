import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }) {
  const { admin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="container section">Loading…</div>;
  if (!admin) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return children;
}
