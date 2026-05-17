import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Save, AlertCircle } from 'lucide-react'

const CATEGORIES = ['Snacks', 'Drinks', 'Mains', 'Desserts', 'Sides', 'Other']

export default function MenuItemModal({ item, onClose, onSaved }) {
  const isNew = !item.id

  const [form, setForm] = useState({
    name: item.name || '',
    category: item.category || '',
    price: item.price || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Name is required.')
    if (!form.price || isNaN(form.price) || Number(form.price) < 0)
      return setError('Enter a valid price.')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        price: parseFloat(form.price),
      }

      let error
      if (isNew) {
        ;({ error } = await supabase.from('menu_items').insert([payload]))
      } else {
        ;({ error } = await supabase.from('menu_items').update(payload).eq('id', item.id))
      }

      if (error) throw error
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save. Try again.')
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">
            {isNew ? 'Add Menu Item' : 'Edit Menu Item'}
          </h2>
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Field label="Item Name *" htmlFor="item-name">
            <input
              id="item-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Samosa, Chai, Biryani"
              className={inputClass}
            />
          </Field>

          <Field label="Category" htmlFor="item-category">
            <select
              id="item-category"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={inputClass}
            >
              <option value="">Select category…</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Price (₹) *" htmlFor="item-price">
            <input
              id="item-price"
              type="number"
              required
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-500 hover:text-slate-900 hover:border-zinc-600 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              id="save-item-btn"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isNew ? 'Add Item' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all'
