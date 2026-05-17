import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, UtensilsCrossed, RefreshCw, Pencil } from 'lucide-react'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showClosed, setShowClosed] = useState(false)
  const [closing, setClosing] = useState(null) // order id being closed
  const navigate = useNavigate()

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .from('orders')
      .select(`
        id,
        token_number,
        status,
        total,
        created_at,
        order_items (
          menu_item_id,
          quantity,
          price_at_time,
          menu_items ( name )
        )
      `)
      .order('created_at', { ascending: false })

    if (!showClosed) {
      query.eq('status', 'pending')
    }

    const { data, error } = await query
    if (!error) setOrders(data || [])
    setLoading(false)
  }, [showClosed])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Real-time subscription for new/updated orders
  useEffect(() => {
    const channel = supabase
      .channel('orders-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchOrders])

  async function closeOrder(orderId) {
    setClosing(orderId)
    await supabase
      .from('orders')
      .update({ status: 'closed' })
      .eq('id', orderId)
    setClosing(null)
    fetchOrders()
  }

  const pending = orders.filter(o => o.status === 'pending')
  const closed = orders.filter(o => o.status === 'closed')

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Current Orders</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {pending.length} pending order{pending.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowClosed(v => !v)}
              className={`text-sm px-4 py-2 rounded-xl border transition-all ${
                showClosed
                  ? 'border-blue-500/50 bg-blue-100 text-blue-600'
                  : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:border-zinc-600'
              }`}
            >
              {showClosed ? 'Hide Closed' : 'Show Closed'}
            </button>
            <button
              onClick={fetchOrders}
              className="p-2 rounded-xl border border-slate-300 text-slate-500 hover:text-slate-900 hover:border-zinc-600 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <UtensilsCrossed className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No pending orders right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClose={() => closeOrder(order.id)}
                onEdit={() => navigate('/cashier', { state: { editOrder: order } })}
                isClosing={closing === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order, onClose, onEdit, isClosing }) {
  const isClosed = order.status === 'closed'
  const timeStr = new Date(order.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isClosed
        ? 'border-slate-200 bg-white/40 opacity-60'
        : 'border-slate-300 bg-white/80 shadow-lg shadow-black/30'
    }`}>
      {/* Token number header */}
      <div className={`px-5 py-4 flex items-center justify-between ${
        isClosed
          ? 'bg-slate-100/30'
          : 'bg-gradient-to-r from-blue-600/20 to-sky-500/10'
      }`}>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Token</p>
          <p className={`text-4xl font-black leading-none ${isClosed ? 'text-slate-500' : 'text-slate-900'}`}>
            {order.token_number}
          </p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
            isClosed
              ? 'bg-slate-200/50 text-slate-500'
              : 'bg-amber-500/15 text-amber-400'
          }`}>
            {isClosed
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Closed</>
              : <><Clock className="w-3.5 h-3.5" /> Pending</>
            }
          </div>
          <p className="text-xs text-slate-500 mt-1">{timeStr}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 py-3 space-y-1.5 border-t border-slate-200/60">
        {order.order_items.map((oi, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-slate-700">
              <span className="text-slate-500 mr-1.5">×{oi.quantity}</span>
              {oi.menu_items?.name ?? 'Item'}
            </span>
            <span className="text-slate-500">Rs {(oi.price_at_time * oi.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Total + action */}
      <div className="px-5 py-3 border-t border-slate-200/60 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-slate-900 font-bold">Rs {Number(order.total).toFixed(2)}</p>
        </div>
        {!isClosed && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-sm font-semibold transition-all"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={onClose}
              disabled={isClosing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-700 text-sm font-semibold transition-all disabled:opacity-50"
            >
              {isClosing ? (
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Close Order
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
