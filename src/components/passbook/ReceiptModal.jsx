import { Download, Printer, Scale } from 'lucide-react';
import Modal from '../ui/Modal';
import { downloadReceipt, printReceipt } from '../../utils/receipt';
import { formatDateTime, formatINR, formatKg } from '../../utils/format';
import { PAYMENT_MODE_LABEL } from '../../utils/constants';

export default function ReceiptModal({ order, onClose }) {
  return (
    <Modal open={!!order} onClose={onClose} title="Digital weight slip" wide>
      {order && (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-gullak pb-3">
            <div>
              <p className="font-display text-lg font-extrabold text-trust">#{order.orderNumber}</p>
              <p className="text-sm text-slate-500">{formatDateTime(order.paidAt || order.createdAt)}</p>
            </div>
            <span className="badge bg-gullak-soft text-gullak-dark"><Scale className="h-3.5 w-3.5" /> Certified digital scale</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-slate-500">Weighed by</dt><dd className="font-semibold text-trust">{order.assignedAgent?.fullName || 'ScrapGullak agent'}</dd></div>
            <div><dt className="text-slate-500">Paid via</dt><dd className="font-semibold text-trust">{PAYMENT_MODE_LABEL[order.paymentMode] || '—'}{order.upiTransactionRef && <span className="block text-xs font-normal text-slate-500">Ref {order.upiTransactionRef}</span>}</dd></div>
          </dl>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-2 font-medium">Grade</th><th className="py-2 text-right font-medium">Net kg</th><th className="py-2 text-right font-medium">Rate</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
              <tbody>
                {(order.items || []).map((i) => (
                  <tr key={i.id ?? i.scrapCategory?.id} className="border-b border-slate-100">
                    <td className="py-2 text-trust">{i.scrapCategory?.name}</td>
                    <td className="py-2 text-right tabular">{formatKg(i.netWeightKg)}</td>
                    <td className="py-2 text-right tabular">{formatINR(i.appliedBuyingRateInr, true)}</td>
                    <td className="py-2 text-right font-semibold tabular">{formatINR(i.subTotalInr, true)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td className="pt-3 font-semibold">Total</td><td className="pt-3 text-right font-semibold tabular">{formatKg(order.finalTotalWeightKg)}</td><td /><td className="pt-3 text-right font-display text-lg font-extrabold text-gullak-dark tabular">{formatINR(order.finalPayoutInr, true)}</td></tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => downloadReceipt(order)}><Download className="h-4 w-4" /> Download receipt</button>
            <button type="button" className="btn-outline" onClick={() => printReceipt(order)}><Printer className="h-4 w-4" /> Print</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
