import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute: Checks if user session exists.
 * If true -> Renders the requested component.
 * If false -> Redirects directly to the Landing/Login page.
 */
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('chat-user');

  if (!user) {
    // If no session found, kick to login page
    return <Navigate to="/" replace />;
  }

  // If session exists, allow access
  return children;
};

export default ProtectedRoute;
