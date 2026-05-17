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
} from 'lucide-react'

const CURRENCY = 'Rs'

export default function CashierPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const editOrder = location.state?.editOrder

  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([]) // [{ item, qty }]
  const [showReceipt, setShowReceipt] = useState(false)
  const [tokenNumber, setTokenNumber] = useState(null)
  const [editingOrderId, setEditingOrderId] = useState(null)

  const fetchMenu = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('name')
    setMenu(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  // Load edit order if available
  useEffect(() => {
    if (editOrder && menu.length > 0 && cart.length === 0 && !editingOrderId) {
      setEditingOrderId(editOrder.id)
      setTokenNumber(editOrder.token_number)
      
      const loadedCart = []
      editOrder.order_items.forEach(oi => {
        const menuItem = menu.find(m => m.id === oi.menu_item_id)
        if (menuItem) {
          loadedCart.push({ item: menuItem, qty: oi.quantity })
        }
      })
      setCart(loadedCart)
    }
  }, [editOrder, menu, cart.length, editingOrderId])

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      }
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
    navigate('/cashier', { replace: true, state: {} }) // Clear state
  }

  const total = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)

  const filtered = menu.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const cartItemIds = new Set(cart.map(c => c.item.id))

  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  async function handleCheckout() {
    setIsCheckingOut(true)
    setCheckoutError('')

    try {
      const itemsPayload = cart.map(c => ({
        id: c.item.id,
        qty: c.qty,
        price: c.item.price
      }))

      let data, error
      if (editingOrderId) {
        // Update existing order
        const result = await supabase.rpc('update_order', {
          p_order_id: editingOrderId,
          p_subtotal: total,
          p_tax: 0,
          p_total: total,
          p_items: itemsPayload
        })
        data = result.data
        error = result.error
        // Preserve existing token number instead of relying on the RPC returning it
        data = { ...data, token_number: tokenNumber }
      } else {
        // Create new order
        const result = await supabase.rpc('process_checkout', {
          p_subtotal: total,
          p_tax: 0,
          p_total: total,
          p_items: itemsPayload
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

          {/* LEFT: Menu items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900">Menu</h1>
              <span className="text-slate-500 text-sm">{menu.length} items</span>
            </div>

            {/* Search */}
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
                  <div className="col-span-full text-center py-12 text-slate-500">
                    No items found.
                  </div>
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
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-slate-900 text-xs rounded-full">
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
              <div className="p-4 space-y-2 max-h-[340px] overflow-y-auto">
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
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-slate-900 text-sm font-semibold w-6 text-center">{qty}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors ml-1"
                        >
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

              {/* Totals */}
              {cart.length > 0 && (
                <>
                  <div className="border-t border-slate-200 px-5 py-4 text-sm">
                    <div className="flex justify-between text-slate-900 font-bold text-base">
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
          tokenNumber={tokenNumber}
          onClose={() => setShowReceipt(false)}
          onNewOrder={clearCart}
        />
      )}
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
