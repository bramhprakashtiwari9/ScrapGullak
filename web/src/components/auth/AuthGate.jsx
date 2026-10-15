import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function AuthGate({ roles }) {
  const { session } = useApp();
  const location = useLocation();

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(session.role)) {
    const home = session.role === 'ADMIN' ? '/admin' : session.role === 'AGENT' ? '/agent' : '/';
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}
