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
  Tag,
} from 'lucide-react'

const CAT_COLORS = [
  { bar: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700' },
  { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700' },
  { bar: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700' },
  { bar: 'bg-purple-500', text: 'text-purple-600', badge: 'bg-purple-50 text-purple-700' },
  { bar: 'bg-pink-500', text: 'text-pink-600', badge: 'bg-pink-50 text-pink-700' },
  { bar: 'bg-cyan-500', text: 'text-cyan-600', badge: 'bg-cyan-50 text-cyan-700' },
  { bar: 'bg-orange-500', text: 'text-orange-600', badge: 'bg-orange-50 text-orange-700' },
  { bar: 'bg-teal-500', text: 'text-teal-600', badge: 'bg-teal-50 text-teal-700' },
]

export default function AdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState({ field: 'name', dir: 'asc' })
  const [editItem, setEditItem] = useState(null)

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
        supabase
          .from('order_items')
          .select('quantity, price_at_time, menu_items(name, category)')
          .gte('created_at', monthStart),
      ])

      if (e1) console.error('todayOrders error:', e1)
      if (e2) console.error('monthOrders error:', e2)
      if (e3) console.error('monthItems error:', e3)

      // Top items
      const itemMap = {}
      for (const row of monthItems || []) {
        const name = row.menu_items?.name ?? 'Unknown'
        if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 }
        itemMap[name].qty += row.quantity
        itemMap[name].revenue += row.quantity * Number(row.price_at_time)
      }
      const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

      // Category breakdown
      const catMap = {}
      for (const row of monthItems || []) {
        const cat = row.menu_items?.category || 'Uncategorized'
        if (!catMap[cat]) catMap[cat] = { category: cat, revenue: 0, qty: 0 }
        catMap[cat].revenue += row.quantity * Number(row.price_at_time)
        catMap[cat].qty += row.quantity
      }
      const categoryData = Object.values(catMap).sort((a, b) => b.revenue - a.revenue)

      setAnalytics({
        todayRevenue: (todayOrders || []).reduce((s, o) => s + Number(o.total), 0),
        todayOrders: (todayOrders || []).length,
        monthRevenue: (monthOrders || []).reduce((s, o) => s + Number(o.total), 0),
        monthOrders: (monthOrders || []).length,
        topItems,
        categoryData,
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
    if (error) {
      if (error.code === '23503') {
        alert('Cannot delete this item because it has been used in past orders.')
      } else {
        alert('Error deleting item: ' + error.message)
      }
    } else {
      setItems(prev => prev.filter(i => i.id !== id))
    }
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
  const fmt = (n) => `Rs ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">Yalla Wrap Grill — {monthName} overview</p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-all text-sm"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Receipt}
            label="Today's Revenue"
            value={analyticsLoading ? '…' : fmt(analytics?.todayRevenue ?? 0)}
            sub={`${analytics?.todayOrders ?? 0} orders`}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Today's Orders"
            value={analyticsLoading ? '…' : (analytics?.todayOrders ?? 0)}
            sub="since midnight"
            color="sky"
          />
          <StatCard
            icon={Calendar}
            label={`${monthName} Revenue`}
            value={analyticsLoading ? '…' : fmt(analytics?.monthRevenue ?? 0)}
            sub={`${analytics?.monthOrders ?? 0} orders`}
            color="emerald"
          />
          <StatCard
            icon={ShoppingBag}
            label={`${monthName} Orders`}
            value={analyticsLoading ? '…' : (analytics?.monthOrders ?? 0)}
            sub="this month"
            color="indigo"
          />
        </div>

        {/* ── Category Chart + Top Items ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Category Analysis */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <Tag className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900 text-sm">Sales by Category — {monthName}</h2>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading…
              </div>
            ) : !analytics?.categoryData?.length ? (
              <div className="text-center py-12 text-slate-400 text-sm">No data for {monthName}</div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {analytics.categoryData.map((cat, idx) => {
                  const maxRev = analytics.categoryData[0].revenue
                  const pct = Math.max(4, Math.round((cat.revenue / maxRev) * 100))
                  const c = CAT_COLORS[idx % CAT_COLORS.length]
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${c.badge}`}>
                            {cat.category}
                          </span>
                          <span className="text-xs text-slate-400">{cat.qty} sold</span>
                        </div>
                        <span className={`text-sm font-semibold ${c.text}`}>
                          {fmt(cat.revenue)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                {/* Total row */}
                <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Total this month</span>
                  <span className="text-sm font-bold text-slate-900">
                    {fmt(analytics.categoryData.reduce((s, c) => s + c.revenue, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Top Selling Items */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-slate-900 text-sm">Top Selling Items — {monthName}</h2>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading…
              </div>
            ) : !analytics?.topItems?.length ? (
              <div className="text-center py-12 text-slate-400 text-sm">No data for {monthName}</div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {analytics.topItems.map((item, idx) => {
                  const maxQty = analytics.topItems[0].qty
                  const pct = Math.max(4, Math.round((item.qty / maxQty) * 100))
                  const isTop = idx === 0
                  return (
                    <div key={item.name}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${isTop ? 'text-amber-500' : 'text-slate-400'}`}>
                          #{idx + 1}
                        </span>
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            <span className="text-xs text-slate-400">{item.qty} sold</span>
                            <span className="text-sm font-semibold text-emerald-600">{fmt(item.revenue)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-8 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-amber-400' : 'bg-blue-400'}`}
                          style={{ width: `${pct}%` }}
                        />
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
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-blue-500/30 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-items"
              type="text"
              placeholder="Search by name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                    <th
                      className="text-left px-5 py-3.5 font-medium cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => toggleSort('name')}
                    >
                      Item <SortIcon field="name" />
                    </th>
                    <th className="text-left px-5 py-3.5 font-medium">Category</th>
                    <th
                      className="text-right px-5 py-3.5 font-medium cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => toggleSort('price')}
                    >
                      Price <SortIcon field="price" />
                    </th>
                    <th className="text-right px-5 py-3.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          Loading items…
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400">
                        {search ? 'No items match your search.' : 'No menu items yet. Add your first item!'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-5 py-4 font-medium text-slate-900">{item.name}</td>
                        <td className="px-5 py-4">
                          {item.category ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-900 font-medium">
                          Rs {Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              id={`edit-${item.id}`}
                              onClick={() => setEditItem(item)}
                              title="Edit"
                              className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-${item.id}`}
                              onClick={() => deleteItem(item.id)}
                              title="Delete"
                              className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
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
    blue:   { wrap: 'border-blue-100 bg-blue-50/60',   icon: 'text-blue-500',   val: 'text-blue-700' },
    sky:    { wrap: 'border-sky-100 bg-sky-50/60',     icon: 'text-sky-500',    val: 'text-sky-700' },
    emerald:{ wrap: 'border-emerald-100 bg-emerald-50/60', icon: 'text-emerald-500', val: 'text-emerald-700' },
    indigo: { wrap: 'border-indigo-100 bg-indigo-50/60', icon: 'text-indigo-500', val: 'text-indigo-700' },
  }
  const s = styles[color]
  return (
    <div className={`border rounded-2xl p-4 ${s.wrap}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shadow-sm">
          <Icon className={`w-4 h-4 ${s.icon}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${s.val}`}>{value}</div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
