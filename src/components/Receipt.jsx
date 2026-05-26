import { useEffect } from 'react'
import { X, Printer, RotateCcw, UtensilsCrossed } from 'lucide-react'

const STALL_NAME = 'Yalla Wrap Grill'
const STALL_TAGLINE = 'Wraps • Grills • Good Vibes'
const CURRENCY = 'Rs'

export default function Receipt({
  cart,
  total,
  subtotal,
  discountAmount = 0,
  tokenNumber,
  onClose,
  onNewOrder,
  reprintMode = false,
  createdAt,
}) {
  const dateObj = createdAt ? new Date(createdAt) : new Date()
  const dateStr = dateObj.toLocaleDateString('en-LK', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = dateObj.toLocaleTimeString('en-LK', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  function handlePrint() { window.print() }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Screen view */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <div className="relative z-10 w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              {reprintMode ? 'Reprint Bill' : 'Bill'}
            </h2>
            <button
              id="receipt-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Token number banner */}
          {tokenNumber && (
            <div className="mx-5 mt-5 bg-gradient-to-r from-blue-600/30 to-sky-500/20 border border-blue-500/40 rounded-2xl px-5 py-4 text-center">
              <p className="text-xs text-blue-600 uppercase tracking-widest font-semibold mb-1">Token Number</p>
              <p className="text-6xl font-black text-slate-900 leading-none">{tokenNumber}</p>
              <p className="text-xs text-slate-500 mt-2">Show this to collect your order</p>
            </div>
          )}

          <div className="p-5 max-h-[55vh] overflow-y-auto">
            <BillBody
              cart={cart}
              total={total}
              subtotal={subtotal}
              discountAmount={discountAmount}
              tokenNumber={tokenNumber}
              dateStr={dateStr}
              timeStr={timeStr}
            />
          </div>

          <div className="flex gap-3 p-4 border-t border-slate-200">
            {reprintMode ? (
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-zinc-600 transition-all text-sm"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            ) : (
              <button
                id="new-order-btn"
                onClick={onNewOrder}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-zinc-600 transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                New Order
              </button>
            )}
            <button
              id="print-receipt-btn"
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Print-only version */}
      <div className="print-only fixed inset-0 bg-white text-black p-6 z-[100]">
        <BillBody
          cart={cart}
          total={total}
          subtotal={subtotal}
          discountAmount={discountAmount}
          tokenNumber={tokenNumber}
          dateStr={dateStr}
          timeStr={timeStr}
          printMode
        />
      </div>
    </>
  )
}

function BillBody({ cart, total, subtotal, discountAmount = 0, tokenNumber, dateStr, timeStr, printMode }) {
  const cls = printMode
    ? { text: 'text-black', muted: 'text-gray-500', border: 'border-gray-300', tokenBg: 'bg-gray-900', tokenText: 'text-slate-900' }
    : { text: 'text-slate-900', muted: 'text-slate-500', border: 'border-slate-300', tokenBg: 'bg-slate-100', tokenText: 'text-slate-900' }

  const showDiscount = discountAmount > 0
  const billSubtotal = subtotal ?? total

  return (
    <div className="font-mono text-sm" id="bill-content">
      {/* Header */}
      <div className="text-center mb-4">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${printMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-600 to-sky-500'} mb-2`}>
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        <h1 className={`text-lg font-bold ${cls.text} font-sans`}>{STALL_NAME.toUpperCase()}</h1>
        <p className={`text-xs ${cls.muted}`}>{STALL_TAGLINE}</p>
      </div>

      {/* Token */}
      {tokenNumber && (
        <>
          <div className={`border-t ${cls.border} my-3`} />
          <div className={`${cls.tokenBg} rounded-xl py-4 text-center`}>
            <p className={`text-xs ${cls.muted} uppercase tracking-widest font-semibold mb-1`}>Token Number</p>
            <p className={`text-5xl font-black ${cls.tokenText} leading-none`}>{tokenNumber}</p>
            <p className={`text-xs ${cls.muted} mt-2`}>Show this token to collect your order</p>
          </div>
        </>
      )}

      <div className={`border-t ${cls.border} my-3`} />

      {/* Date / time */}
      <div className="flex justify-between text-xs mb-3">
        <span className={cls.muted}>{dateStr}</span>
        <span className={cls.muted}>{timeStr}</span>
      </div>

      <div className={`border-t ${cls.border} my-3`} />

      {/* Items */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wide mb-2">
          <span className={cls.muted}>Item</span>
          <div className="flex gap-6">
            <span className={cls.muted}>Qty</span>
            <span className={cls.muted}>Amount</span>
          </div>
        </div>
        {cart.map(({ item, qty }) => (
          <div key={item.id} className="flex justify-between text-xs">
            <span className={`${cls.text} flex-1 pr-2`}>{item.name}</span>
            <div className="flex gap-6 flex-shrink-0">
              <span className={`${cls.muted} w-6 text-right`}>x{qty}</span>
              <span className={`${cls.text} w-20 text-right`}>{CURRENCY} {(item.price * qty).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`border-t ${cls.border} my-3`} />

      {/* Totals */}
      <div className="space-y-1.5">
        {showDiscount && (
          <>
            <div className="flex justify-between text-xs">
              <span className={cls.muted}>Subtotal</span>
              <span className={cls.text}>{CURRENCY} {billSubtotal.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between text-xs ${printMode ? 'text-gray-600' : 'text-red-500'}`}>
              <span>Discount</span>
              <span>− {CURRENCY} {discountAmount.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold text-base pt-0.5">
          <span className={cls.text}>TOTAL</span>
          <span className={printMode ? 'text-black' : 'text-blue-600'}>{CURRENCY} {total.toFixed(2)}</span>
        </div>
      </div>

      <div className={`border-t ${cls.border} my-4`} />

      <div className="text-center">
        <p className={`text-xs ${cls.muted}`}>Thank you! Please visit again.</p>
      </div>
    </div>
  )
}
