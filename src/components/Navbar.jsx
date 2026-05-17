import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  UtensilsCrossed,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  LogOut,
} from 'lucide-react'

export default function Navbar() {
  const { user, role, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const links = [
    ...(role === 'admin' ? [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { to: '/cashier', label: 'Cashier', icon: ShoppingCart },
    { to: '/orders', label: 'Orders', icon: ClipboardList },
  ]

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/30">
              <UtensilsCrossed className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-lg tracking-tight">Yalla Wrap Grill</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* User + signout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-slate-500">{user?.email}</span>
              <span className="text-xs font-semibold text-blue-600 capitalize">{role}</span>
            </div>
            <button
              id="signout-btn"
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
