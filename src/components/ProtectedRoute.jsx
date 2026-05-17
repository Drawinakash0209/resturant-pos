import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps a route, redirecting to /login if not authenticated.
 * If `allowedRole` is given, also checks the user's role.
 */
export default function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRole && role !== allowedRole && role !== 'admin') {
    return <Navigate to="/cashier" replace />
  }

  return children
}
