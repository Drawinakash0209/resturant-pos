import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, PackagePlus, AlertCircle } from 'lucide-react'

export default function RestockModal({ item, onClose, onRestocked }) {
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleRestock(e) {
    e.preventDefault()
    setError('')

    const amount = parseInt(qty, 10)
    if (!qty || isNaN(amount) || amount <= 0)
      return setError('Enter a valid quantity greater than 0.')

    setSaving(true)
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock: item.stock + amount })
        .eq('id', item.id)

      if (error) throw error
      onRestocked()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to restock. Try again.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-green-400" />
            Restock Item
          </h2>
          <button
            id="restock-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleRestock} className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">{item.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">Current stock: <span className="text-slate-900 font-semibold">{item.stock} units</span></p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="restock-qty" className="block text-sm font-medium text-slate-700 mb-1.5">
              Add Quantity
            </label>
            <input
              id="restock-qty"
              type="number"
              min="1"
              step="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g., 50"
              autoFocus
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
            />
            {qty && !isNaN(parseInt(qty)) && parseInt(qty) > 0 && (
              <p className="text-xs text-slate-500 mt-1.5">
                New stock will be: <span className="text-emerald-400 font-semibold">{item.stock + parseInt(qty)} units</span>
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-500 hover:text-slate-900 hover:border-zinc-600 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              id="confirm-restock-btn"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-900 font-semibold text-sm shadow-lg shadow-emerald-700/30 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  Restock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
