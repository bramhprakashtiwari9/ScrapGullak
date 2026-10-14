import { formatINR, formatKg, formatDateTime } from './format';
import { PAYMENT_MODE_LABEL } from './constants';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Standalone, printable digital weight slip. */
export function buildReceiptHTML(order) {
  const items = order.items || [];
  const rows = items.map((i) => `
    <tr><td>${esc(i.scrapCategory?.name)}</td><td class="r">${formatKg(i.netWeightKg)}</td>
    <td class="r">${formatINR(i.appliedBuyingRateInr, true)}</td><td class="r">${formatINR(i.subTotalInr, true)}</td></tr>`).join('');
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>ScrapGullak receipt ${esc(order.orderNumber)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0F172A;max-width:640px;margin:24px auto;padding:0 16px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #10B981;padding-bottom:12px}
  h1{margin:0;font-size:22px} .muted{color:#64748B;font-size:13px} table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
  th,td{padding:8px 6px;border-bottom:1px solid #E2E8F0;text-align:left} .r{text-align:right;font-variant-numeric:tabular-nums}
  tfoot td{font-weight:700;border-bottom:none} .total{background:#ECFDF5;font-size:18px} .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;font-size:14px}
  .note{margin-top:20px;font-size:12px;color:#64748B;border-top:1px dashed #CBD5E1;padding-top:10px}
</style></head><body>
<div class="head"><div><h1>ScrapGullak</h1><div class="muted">Digital weight slip and payout receipt</div></div>
<div style="text-align:right"><strong>${esc(order.orderNumber)}</strong><div class="muted">${esc(formatDateTime(order.paidAt || order.createdAt))}</div></div></div>
<div class="meta">
  <div><div class="muted">Customer</div>${esc(order.customer?.fullName)}<br>${esc(order.customer?.phone)}</div>
  <div><div class="muted">Pickup address</div>${esc(order.fullAddress)}<br>${esc(order.noidaSector)}</div>
  <div><div class="muted">Weighed by</div>${esc(order.assignedAgent?.fullName || 'ScrapGullak agent')}</div>
  <div><div class="muted">Payment</div>${esc(PAYMENT_MODE_LABEL[order.paymentMode] || order.paymentMode || '—')}${order.upiTransactionRef ? `<br>Ref ${esc(order.upiTransactionRef)}` : ''}</div>
</div>
<table><thead><tr><th>Scrap grade</th><th class="r">Net weight</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
<tbody>${rows || '<tr><td colspan="4">No line items recorded.</td></tr>'}</tbody>
<tfoot><tr><td>Total</td><td class="r">${formatKg(order.finalTotalWeightKg)}</td><td></td><td class="r"></td></tr>
<tr class="total"><td colspan="3">Paid to you</td><td class="r">${formatINR(order.finalPayoutInr, true)}</td></tr></tfoot></table>
<p class="note">Weighed at your doorstep on a certified digital scale. Rates are the ScrapGullak Noida buying rates applicable on the day of pickup. Keep this slip for your records.</p>
</body></html>`;
}

export function downloadReceipt(order) {
  const blob = new Blob([buildReceiptHTML(order)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ScrapGullak-Receipt-${order.orderNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function printReceipt(order) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return false;
  w.document.write(buildReceiptHTML(order));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
