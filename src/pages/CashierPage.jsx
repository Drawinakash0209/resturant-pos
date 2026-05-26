import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Receipt from '../components/Receipt'
import { supabase } from '../lib/supabase'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  AlertTriangle,
  X,
  Tag,
  FileText,
  TrendingUp,
  Receipt as ReceiptIcon,
  Clock,
} from 'lucide-react'

const CURRENCY = 'Rs'

export default function CashierPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const editOrder = location.state?.editOrder

  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [showReceipt, setShowReceipt] = useState(false)
  const [tokenNumber, setTokenNumber] = useState(null)
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [showDayReport, setShowDayReport] = useState(false)

  // Discount state
  const [discountType, setDiscountType] = useState('flat') // 'flat' | 'percent'
  const [discountValue, setDiscountValue] = useState('')

  const fetchMenu = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('menu_items').select('*').order('name')
    setMenu(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  useEffect(() => {
    if (editOrder && menu.length > 0 && cart.length === 0 && !editingOrderId) {
      setEditingOrderId(editOrder.id)
      setTokenNumber(editOrder.token_number)
      const loadedCart = []
      editOrder.order_items.forEach(oi => {
        const menuItem = menu.find(m => m.id === oi.menu_item_id)
        if (menuItem) loadedCart.push({ item: menuItem, qty: oi.quantity })
      })
      setCart(loadedCart)
    }
  }, [editOrder, menu, cart.length, editingOrderId])

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item, qty: 1 }]
    })
  }

  function updateQty(itemId, delta) {
    setCart(prev =>
      prev.map(c => {
        if (c.item.id !== itemId) return c
        const newQty = c.qty + delta
        if (newQty <= 0) return null
        return { ...c, qty: newQty }
      }).filter(Boolean)
    )
  }

  function removeFromCart(itemId) {
    setCart(prev => prev.filter(c => c.item.id !== itemId))
  }

  function clearCart() {
    setCart([])
    setShowReceipt(false)
    setTokenNumber(null)
    setEditingOrderId(null)
    setDiscountValue('')
    setDiscountType('flat')
    navigate('/cashier', { replace: true, state: {} })
  }

  // Totals
  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)
  const discountAmount = (() => {
    const v = Number(discountValue) || 0
    if (v <= 0) return 0
    if (discountType === 'flat') return Math.min(v, subtotal)
    return subtotal * (Math.min(v, 100) / 100)
  })()
  const total = subtotal - discountAmount

  const filtered = menu.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(search.toLowerCase())
  )
  const cartItemIds = new Set(cart.map(c => c.item.id))

  async function handleCheckout() {
    setIsCheckingOut(true)
    setCheckoutError('')
    try {
      const itemsPayload = cart.map(c => ({ id: c.item.id, qty: c.qty, price: c.item.price }))
      let data, error

      if (editingOrderId) {
        const result = await supabase.rpc('update_order', {
          p_order_id: editingOrderId,
          p_subtotal: subtotal,
          p_tax: 0,
          p_total: total,
          p_items: itemsPayload,
        })
        data = result.data
        error = result.error
        data = { ...data, token_number: tokenNumber }
      } else {
        const result = await supabase.rpc('process_checkout', {
          p_subtotal: subtotal,
          p_tax: 0,
          p_total: total,
          p_items: itemsPayload,
        })
        data = result.data
        error = result.error
      }

      if (error) throw error
      if (!editingOrderId) setTokenNumber(data.token_number)
      setShowReceipt(true)
    } catch (err) {
      setCheckoutError(err.message || 'Checkout failed. Please try again.')
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* LEFT: Menu */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900">Menu</h1>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">{menu.length} items</span>
                <button
                  onClick={() => setShowDayReport(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400 text-xs font-medium transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Day Report
                </button>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="cashier-search"
                type="text"
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
                Loading menu…
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-500">No items found.</div>
                ) : (
                  filtered.map(item => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      inCart={cartItemIds.has(item.id)}
                      onAdd={() => addToCart(item)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Cart */}
          <div className="lg:sticky lg:top-[76px] lg:self-start">
            <div className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden">
              {/* Cart header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  Order
                  {cart.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full font-bold">
                      {cart.length}
                    </span>
                  )}
                </h2>
                {cart.length > 0 && (
                  <button
                    id="clear-cart-btn"
                    onClick={clearCart}
                    className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {checkoutError && (
                <div className="mx-4 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Cart items */}
              <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Tap items to add them</p>
                  </div>
                ) : (
                  cart.map(({ item, qty }) => (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{CURRENCY} {item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-slate-900 text-sm font-semibold w-6 text-center">{qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 w-20 text-right flex-shrink-0">
                        {CURRENCY} {(item.price * qty).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Discount + totals */}
              {cart.length > 0 && (
                <>
                  {/* Discount row */}
                  <div className="mx-4 mb-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">Discount</span>
                      {/* Type toggle */}
                      <div className="ml-auto flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                        <button
                          onClick={() => setDiscountType('flat')}
                          className={`px-2.5 py-1 transition-colors ${discountType === 'flat' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                        >
                          Rs
                        </button>
                        <button
                          onClick={() => setDiscountType('percent')}
                          className={`px-2.5 py-1 transition-colors ${discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? 100 : undefined}
                      placeholder={discountType === 'flat' ? '0.00' : '0'}
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                    {discountAmount > 0 && (
                      <p className="text-xs text-red-500 mt-1.5">
                        − {CURRENCY} {discountAmount.toFixed(2)} off
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-slate-200 px-5 py-4 text-sm space-y-1">
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>{CURRENCY} {subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-red-500 text-xs">
                        <span>Discount</span>
                        <span>− {CURRENCY} {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 font-bold text-base pt-1">
                      <span>Total</span>
                      <span>{CURRENCY} {total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <button
                      id="generate-bill-btn"
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                    >
                      {isCheckingOut ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          {editingOrderId ? 'Update & Print Bill' : 'Checkout & Print Bill'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <Receipt
          cart={cart}
          total={total}
          subtotal={subtotal}
          discountAmount={discountAmount}
          tokenNumber={tokenNumber}
          onClose={() => setShowReceipt(false)}
          onNewOrder={clearCart}
        />
      )}

      {/* Day Report Modal */}
      {showDayReport && <DayReportModal onClose={() => setShowDayReport(false)} />}
    </div>
  )
}

function MenuCard({ item, inCart, onAdd }) {
  return (
    <button
      id={`menu-card-${item.id}`}
      onClick={onAdd}
      className={`group text-left p-4 rounded-2xl border transition-all cursor-pointer ${
        inCart
          ? 'border-blue-500/50 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        {item.category && (
          <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded-md">
            {item.category}
          </span>
        )}
        {inCart && (
          <span className="text-xs text-blue-600 font-medium ml-auto">✓ Added</span>
        )}
      </div>
      <p className="font-semibold text-slate-900 text-sm leading-tight mb-1">{item.name}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-blue-600 font-bold text-base">{CURRENCY} {Number(item.price).toFixed(2)}</span>
      </div>
      <div className={`mt-3 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        inCart
          ? 'bg-blue-100 text-blue-600'
          : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
      }`}>
        <Plus className="w-3 h-3" />
        {inCart ? 'Add more' : 'Add to order'}
      </div>
    </button>
  )
}

function DayReportModal({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

      const [
        { data: orders },
        { data: orderItems },
      ] = await Promise.all([
        supabase.from('orders').select('total, created_at').gte('created_at', todayStart),
        supabase
          .from('order_items')
          .select('quantity, price_at_time, menu_items(name)')
          .gte('created_at', todayStart),
      ])

      const totalRevenue = (orders || []).reduce((s, o) => s + Number(o.total), 0)
      const orderCount = (orders || []).length
      const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0

      // Top items today
      const itemMap = {}
      for (const row of orderItems || []) {
        const name = row.menu_items?.name ?? 'Unknown'
        if (!itemMap[name]) itemMap[name] = { name, qty: 0 }
        itemMap[name].qty += row.quantity
      }
      const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

      // Hourly breakdown (group orders by hour)
      const hourMap = {}
      for (const o of orders || []) {
        const h = new Date(o.created_at).getHours()
        if (!hourMap[h]) hourMap[h] = { hour: h, count: 0, revenue: 0 }
        hourMap[h].count++
        hourMap[h].revenue += Number(o.total)
      }
      const peakHour = Object.values(hourMap).sort((a, b) => b.count - a.count)[0] ?? null

      setData({ totalRevenue, orderCount, avgOrder, topItems, peakHour })
      setLoading(false)
    }
    fetchReport()
  }, [])

  const fmt = (n) => `Rs ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const today = new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  function fmtHour(h) {
    const suffix = h >= 12 ? 'PM' : 'AM'
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display}:00 ${suffix}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Day Report
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-400 mb-4">{today}</p>

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          ) : data?.orderCount === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No orders today yet.</div>
          ) : (
            <div className="space-y-4">
              {/* Key stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-500 mb-0.5">Revenue</p>
                  <p className="font-bold text-slate-900 text-sm">{fmt(data.totalRevenue)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <ReceiptIcon className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-500 mb-0.5">Orders</p>
                  <p className="font-bold text-slate-900 text-sm">{data.orderCount}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <ShoppingCart className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-500 mb-0.5">Avg Order</p>
                  <p className="font-bold text-slate-900 text-sm">{fmt(data.avgOrder)}</p>
                </div>
              </div>

              {/* Peak hour */}
              {data.peakHour && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Busiest hour</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {fmtHour(data.peakHour.hour)}
                      <span className="text-slate-400 font-normal ml-1.5">— {data.peakHour.count} order{data.peakHour.count !== 1 ? 's' : ''}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Top items */}
              {data.topItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Top Items Today</p>
                  <div className="space-y-1.5">
                    {data.topItems.map((item, idx) => {
                      const maxQty = data.topItems[0].qty
                      const pct = Math.max(8, Math.round((item.qty / maxQty) * 100))
                      return (
                        <div key={item.name} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0">#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium text-slate-800 truncate">{item.name}</span>
                              <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{item.qty} sold</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${idx === 0 ? 'bg-amber-400' : 'bg-blue-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
