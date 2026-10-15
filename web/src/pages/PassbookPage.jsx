import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Leaf, PiggyBank, Receipt, Scale, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { customerApi } from '../services/api';
import GullakJar from '../components/passbook/GullakJar';
import StatusTracker from '../components/passbook/StatusTracker';
import ReceiptModal from '../components/passbook/ReceiptModal';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import { downloadReceipt } from '../utils/receipt';
import { PAYMENT_MODE_LABEL } from '../utils/constants';
import { formatDate, formatINR, formatKg } from '../utils/format';

export default function PassbookPage() {
  const { session, ensureSession, view, switchView } = useApp();
  const [passbook, setPassbook] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await ensureSession();
      const [pb, list] = await Promise.all([customerApi.passbook(), customerApi.myPickups()]);
      setPassbook(pb);
      setPickups(list);
    } catch (e) {
      setError(e.message || 'Could not load your passbook.');
    } finally {
      setLoading(false);
    }
  }, [ensureSession]);

  useEffect(() => { if (view !== 'admin') load(); }, [load, session?.user?.id, view]);

  if (view === 'admin') {
    return (
      <div className="container-page py-16">
        <EmptyState icon={PiggyBank} title="Passbooks belong to customer accounts"
          action={<button type="button" className="btn-primary" onClick={() => switchView('customer')}>Switch to Customer view</button>}>
          You are signed in as yard admin. Switch views to see a customer’s Gullak.
        </EmptyState>
      </div>
    );
  }

  const active = pickups.filter((p) => !['PAID', 'CANCELLED'].includes(p.status));
  const byNumber = Object.fromEntries(pickups.map((p) => [p.orderNumber, p]));
  const earnings = passbook?.gullakTotalEarnings || 0;
  const milestone = Math.max(5000, Math.ceil((earnings + 1) / 5000) * 5000);
  const user = session?.user;
  const isCorporate = user?.accountType === 'B2B_CORPORATE';

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{user?.companyName || user?.fullName}{user?.noidaSector ? `, ${user.noidaSector}` : ''}</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{isCorporate ? 'Lifts & receipts' : 'My ScrapGullak passbook'}</h1>
        </div>
        <Link to="/" state={{ scrollTo: 'book' }} className="btn-primary">Book another pickup</Link>
      </header>

      {loading && !passbook ? <Spinner label="Opening your Gullak…" /> : error ? (
        <div className="mt-8"><EmptyState icon={Receipt} title="Passbook did not load" action={<button type="button" className="btn-outline" onClick={load}>Try again</button>}>{error}</EmptyState></div>
      ) : (
        <>
          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
            <div className="card flex flex-col items-center bg-gradient-to-b from-white to-coin-soft/50 p-6 text-center">
              <GullakJar amount={earnings} milestone={milestone} />
              <p className="mt-4 text-sm text-slate-500">Total lifetime earnings</p>
              <p className="font-display text-4xl font-extrabold text-trust tabular">{formatINR(earnings)}</p>
              <p className="mt-2 text-sm text-coin-dark">{formatINR(milestone - earnings)} to your {formatINR(milestone)} milestone</p>
            </div>
            <div className="grid content-start gap-4 sm:grid-cols-3">
              <div className="card p-5">
                <Scale className="h-5 w-5 text-slate-500" aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-500">Waste recycled</p>
                <p className="font-display text-3xl font-extrabold tabular">{formatKg(passbook?.totalRecycledKg)}</p>
              </div>
              <div className="card p-5">
                <Leaf className="h-5 w-5 text-gullak" aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-500">CO₂ avoided (est.)</p>
                <p className="font-display text-3xl font-extrabold tabular">{formatKg(passbook?.co2SavedKg)}</p>
              </div>
              <div className="card p-5">
                <Truck className="h-5 w-5 text-slate-500" aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-500">Pickups completed</p>
                <p className="font-display text-3xl font-extrabold tabular">{passbook?.totalPickups ?? 0}</p>
              </div>
              <div className="sm:col-span-3">
                <h2 className="mb-3 text-xl font-bold">Live pickup status</h2>
                {active.length ? (
                  <div className="space-y-3">{active.map((p) => <StatusTracker key={p.id} order={p} />)}</div>
                ) : (
                  <EmptyState icon={Truck} title="No pickup on the way" action={<Link to="/" state={{ scrollTo: 'book' }} className="btn-primary">Book a pickup</Link>}>
                    Book one and you can follow it here, from agent assignment to UPI credit.
                  </EmptyState>
                )}
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-bold">Digital weight receipts</h2>
            {passbook?.transactions?.length ? (
              <div className="card mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-3 py-3 font-medium">Order</th>
                      <th className="px-3 py-3 text-right font-medium">Weight</th>
                      <th className="px-3 py-3 text-right font-medium">Credited</th>
                      <th className="px-3 py-3 font-medium">Paid via</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {passbook.transactions.map((t) => {
                      const order = byNumber[t.orderNumber];
                      return (
                        <tr key={t.orderNumber} className="border-b border-slate-100 last:border-0">
                          <td className="px-5 py-3 text-slate-600">{formatDate(t.date)}</td>
                          <td className="px-3 py-3 font-semibold text-trust">#{t.orderNumber}</td>
                          <td className="px-3 py-3 text-right tabular">{formatKg(t.weightKg)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-gullak-dark tabular">+{formatINR(t.amountInr, true)}</td>
                          <td className="px-3 py-3 text-slate-600">{PAYMENT_MODE_LABEL[t.paymentMode] || t.paymentMode}</td>
                          <td className="px-5 py-3">
                            {order && (
                              <div className="flex justify-end gap-1">
                                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setReceipt(order)}><Eye className="h-3.5 w-3.5" /> View slip</button>
                                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadReceipt(order)}><Download className="h-3.5 w-3.5" /> Download</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-3"><EmptyState icon={Receipt} title="No receipts yet">Your first weight slip appears here as soon as an agent weighs and pays for your scrap.</EmptyState></div>
            )}
          </section>
        </>
      )}
      <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
