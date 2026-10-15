import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IS_PUBLIC_DEMO } from '../services/api';

export default function RegisterPage() {
  const { session, register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '', noidaSector: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (IS_PUBLIC_DEMO) return <Navigate to="/login" replace />;
  if (session) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ ...form, accountType: 'B2C_HOUSEHOLD' });
      navigate('/passbook', { replace: true });
    } catch (e) {
      setError(e.message || 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <section className="card w-full max-w-xl p-6 sm:p-8">
        <p className="text-sm font-semibold text-gullak-dark">Customer account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-trust">Create your ScrapGullak account</h1>
        <p className="mt-2 text-sm text-slate-500">Use your account to book pickups and see your own receipts and passbook.</p>
        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="text-sm font-semibold text-trust sm:col-span-2" htmlFor="register-name">Full name
            <input id="register-name" className="input mt-1 w-full" required maxLength={100} autoComplete="name" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-trust" htmlFor="register-phone">Mobile number
            <input id="register-phone" className="input mt-1 w-full" type="tel" inputMode="tel" required maxLength={15} autoComplete="tel" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-trust" htmlFor="register-sector">Noida sector
            <input id="register-sector" className="input mt-1 w-full" maxLength={80} autoComplete="address-level3" value={form.noidaSector}
              onChange={(e) => setForm({ ...form, noidaSector: e.target.value })} placeholder="e.g. Sector 62" />
          </label>
          <label className="text-sm font-semibold text-trust sm:col-span-2" htmlFor="register-email">Email (optional)
            <input id="register-email" className="input mt-1 w-full" type="email" maxLength={150} autoComplete="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-trust sm:col-span-2" htmlFor="register-password">Password (at least 8 characters)
            <input id="register-password" className="input mt-1 w-full" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 sm:col-span-2">{error}</p>}
          <button type="submit" className="btn-primary w-full sm:col-span-2" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-bold text-gullak-dark hover:underline">Sign in</Link></p>
      </section>
    </div>
  );
}
