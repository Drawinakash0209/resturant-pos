import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import MenuItemModal from '../components/MenuItemModal'
import { supabase } from '../lib/supabase'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Calendar,
  Star,
  RefreshCw,
} from 'lucide-react'

export default function AdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState({ field: 'name', dir: 'asc' })
  const [editItem, setEditItem] = useState(null)

  // Analytics state
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order(sortBy.field, { ascending: sortBy.dir === 'asc' })
    if (!error) setItems(data || [])
    setLoading(false)
  }, [sortBy])

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { data: todayOrders, error: e1 },
        { data: monthOrders, error: e2 },
        { data: monthItems, error: e3 },
      ] = await Promise.all([
        supabase.from('orders').select('total').gte('created_at', todayStart),
        supabase.from('orders').select('total').gte('created_at', monthStart),
        supabase.from('order_items').select('quantity, price_at_time, menu_items(name)').gte('created_at', monthStart),
      ])

      if (e1) console.error('todayOrders error:', e1)
      if (e2) console.error('monthOrders error:', e2)
      if (e3) console.error('monthItems error:', e3)

      const itemMap = {}
      for (const row of monthItems || []) {
        const name = row.menu_items?.name ?? 'Unknown'
        if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 }
        itemMap[name].qty += row.quantity
        itemMap[name].revenue += row.quantity * Number(row.price_at_time)
      }
      const topItems = Object.values(itemMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

      setAnalytics({
        todayRevenue: (todayOrders || []).reduce((s, o) => s + Number(o.total), 0),
        todayOrders: (todayOrders || []).length,
        monthRevenue: (monthOrders || []).reduce((s, o) => s + Number(o.total), 0),
        monthOrders: (monthOrders || []).length,
        topItems,
      })
    } catch (err) {
      console.error('fetchAnalytics failed:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  async function deleteItem(id) {
    if (!confirm('Delete this item? This action cannot be undone.')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (!error) setItems(prev => prev.filter(i => i.id !== id))
  }

  function toggleSort(field) {
    setSortBy(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    )
  }

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(search.toLowerCase())
  )

  function SortIcon({ field }) {
    if (sortBy.field !== field) return null
    return sortBy.dir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600 inline ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600 inline ml-1" />
  }

  const monthName = new Date().toLocaleString('en-LK', { month: 'long' })

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* ── Analytics Dashboard ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">Yalla Wrap Grill — sales overview</p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="p-2 rounded-xl border border-slate-300 text-slate-500 hover:text-slate-900 hover:border-zinc-600 transition-all"
              title="Refresh analytics"
            >
              <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Receipt}
              label="Today's Revenue"
              value={analyticsLoading ? '…' : `Rs ${(analytics?.todayRevenue ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub={`${analytics?.todayOrders ?? 0} orders today`}
              color="purple"
            />
            <StatCard
              icon={TrendingUp}
              label="Today's Orders"
              value={analyticsLoading ? '…' : (analytics?.todayOrders ?? 0)}
              sub="since midnight"
              color="fuchsia"
            />
            <StatCard
              icon={Calendar}
              label={`${monthName} Revenue`}
              value={analyticsLoading ? '…' : `Rs ${(analytics?.monthRevenue ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub={`${analytics?.monthOrders ?? 0} orders this month`}
              color="green"
            />
            <StatCard
              icon={ShoppingBag}
              label={`${monthName} Orders`}
              value={analyticsLoading ? '…' : (analytics?.monthOrders ?? 0)}
              sub="this month"
              color="blue"
            />
          </div>

          {/* Top items this month */}
          <div className="bg-white/70 border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-slate-900 text-sm">Top Selling Items — {monthName}</h2>
            </div>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                Loading…
              </div>
            ) : !analytics?.topItems?.length ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No sales data yet for {monthName}.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {analytics.topItems.map((item, idx) => {
                  const maxQty = analytics.topItems[0].qty
                  const pct = Math.round((item.qty / maxQty) * 100)
                  return (
                    <div key={item.name} className="flex items-center gap-4 px-5 py-3">
                      <span className={`text-xs font-bold w-5 text-center ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-900 text-sm font-medium truncate">{item.name}</span>
                          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                            <span className="text-slate-500 text-xs">{item.qty} sold</span>
                            <span className="text-emerald-400 text-sm font-semibold">
                              Rs {item.revenue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${idx === 0 ? 'bg-amber-400' : 'bg-blue-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Menu Management ── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Menu Items</h2>
              <p className="text-slate-500 text-sm mt-0.5">{items.length} items on the menu</p>
            </div>
            <button
              id="add-item-btn"
              onClick={() => setEditItem({})}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="search-items"
              type="text"
              placeholder="Search by name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
          </div>

          {/* Table */}
          <div className="bg-white/70 border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th
                      className="text-left px-5 py-3.5 font-medium cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => toggleSort('name')}
                    >
                      Item <SortIcon field="name" />
                    </th>
                    <th className="text-left px-5 py-3.5 font-medium">Category</th>
                    <th
                      className="text-right px-5 py-3.5 font-medium cursor-pointer hover:text-slate-900 transition-colors"
                      onClick={() => toggleSort('price')}
                    >
                      Price <SortIcon field="price" />
                    </th>
                    <th className="text-right px-5 py-3.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          Loading items…
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500">
                        {search ? 'No items match your search.' : 'No menu items yet. Add your first item!'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(item => (
                      <tr key={item.id} className="hover:bg-slate-100/30 transition-colors group">
                        <td className="px-5 py-4 font-medium text-slate-900">{item.name}</td>
                        <td className="px-5 py-4 text-slate-500">
                          {item.category
                            ? <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs">{item.category}</span>
                            : '—'}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-900 font-medium">
                          Rs {Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              id={`edit-${item.id}`}
                              onClick={() => setEditItem(item)}
                              title="Edit"
                              className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-${item.id}`}
                              onClick={() => deleteItem(item.id)}
                              title="Delete"
                              className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3">
            Showing {filtered.length} of {items.length} items
          </p>
        </div>
      </div>

      {editItem !== null && (
        <MenuItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={fetchItems}
        />
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  const styles = {
    purple: { card: 'from-blue-600/20 to-blue-600/5 border-blue-500/20', icon: 'text-blue-600', text: 'text-blue-600' },
    fuchsia: { card: 'from-sky-500/20 to-sky-500/5 border-sky-500/20', icon: 'text-sky-500', text: 'text-sky-600' },
    green: { card: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20', icon: 'text-emerald-500', text: 'text-emerald-600' },
    blue: { card: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20', icon: 'text-indigo-500', text: 'text-indigo-600' },
  }
  const s = styles[color]

  return (
    <div className={`bg-gradient-to-br ${s.card} border rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wider leading-tight">{label}</span>
        <Icon className={`w-4 h-4 flex-shrink-0 ${s.icon}`} />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}
