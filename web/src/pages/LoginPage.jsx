import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Factory, Home, Loader2, ShieldCheck, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IS_PUBLIC_DEMO } from '../services/api';
import GullakMark from '../components/ui/GullakMark';

const ACCESS_TYPES = [
  { id: 'CUSTOMER', label: 'Customer', detail: 'Book pickups and see your passbook', icon: Home },
  { id: 'STAFF', label: 'Admin or agent', detail: 'Staff accounts are provisioned by ScrapGullak', icon: ShieldCheck },
];

function homeForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'AGENT') return '/agent';
  return '/passbook';
}

export default function LoginPage() {
  const { session, signIn, notify } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [accessType, setAccessType] = useState('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const returnTo = location.state?.from?.pathname;

  if (session && !IS_PUBLIC_DEMO) return <Navigate to={homeForRole(session.role)} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const auth = await signIn(phone.trim(), password, accessType);
      const from = returnTo && returnTo !== '/login' ? returnTo : homeForRole(auth.role);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e.message || 'Could not sign in. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const demoSignIn = async () => {
    setSubmitting(true);
    setError('');
    try {
      const auth = await signIn(null, null, accessType === 'STAFF' ? 'ADMIN' : 'CUSTOMER');
      navigate(homeForRole(auth.role), { replace: true });
    } catch (e) {
      setError(e.message || 'Could not open the demo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page grid min-h-[70vh] items-center gap-10 py-12 lg:grid-cols-[1fr_440px]">
      <section className="max-w-xl">
        <Link to="/" className="inline-flex items-center gap-2" aria-label="ScrapGullak home">
          <GullakMark />
          <span className="font-display text-xl font-extrabold text-trust">Scrap<span className="text-gullak">Gullak</span></span>
        </Link>
        <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-gullak-soft px-3 py-1 text-sm font-semibold text-gullak-dark">
          <Truck className="h-4 w-4" /> Your scrap pickup, in one place
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-trust sm:text-5xl">Welcome back</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Sign in to your account to manage pickups, see your customer passbook, or open your staff dashboard.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="card p-4"><Home className="h-5 w-5 text-gullak" /><p className="mt-2 font-bold">For customers</p><p className="mt-1 text-sm text-slate-500">Your bookings, pickup status and receipts.</p></div>
          <div className="card p-4"><Factory className="h-5 w-5 text-gullak" /><p className="mt-2 font-bold">For staff</p><p className="mt-1 text-sm text-slate-500">Admin and agent access is assigned by the company.</p></div>
        </div>
      </section>

      <section className="card p-6 sm:p-8" aria-labelledby="login-heading">
        <h2 id="login-heading" className="text-2xl font-extrabold text-trust">Sign in securely</h2>
        <p className="mt-1 text-sm text-slate-500">Choose your account type. Your server role determines which screens you can access.</p>

        {IS_PUBLIC_DEMO ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-coin-soft p-3 text-sm font-medium text-coin-dark">This public site is a simulated demo. Real account sign-in is not available here.</p>
            <div className="grid gap-2">
              {ACCESS_TYPES.map(({ id, label, detail, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setAccessType(id)} aria-pressed={accessType === id}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left ${accessType === id ? 'border-gullak bg-gullak-soft' : 'border-slate-200'}`}>
                  <Icon className="h-5 w-5 text-gullak-dark" />
                  <span className="flex-1"><span className="block font-bold">{label}</span><span className="text-xs text-slate-500">{detail}</span></span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-primary w-full" disabled={submitting} onClick={demoSignIn}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue to demo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-2">
              {ACCESS_TYPES.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setAccessType(id)} aria-pressed={accessType === id}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${accessType === id ? 'border-gullak bg-gullak-soft text-gullak-dark' : 'border-slate-200 text-slate-600'}`}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>
            <label className="block text-sm font-semibold text-trust" htmlFor="login-phone">Mobile number
              <input id="login-phone" className="input mt-1 w-full" type="tel" inputMode="tel" autoComplete="username" required maxLength={15}
                value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone number" />
            </label>
            <label className="block text-sm font-semibold text-trust" htmlFor="login-password">Password
              <input id="login-password" className="input mt-1 w-full" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in <ArrowRight className="h-4 w-4" />
            </button>
            {accessType === 'CUSTOMER' ? (
              <p className="text-center text-sm text-slate-600">New to ScrapGullak? <Link className="font-bold text-gullak-dark hover:underline" to="/register">Create a customer account</Link></p>
            ) : (
              <p className="text-center text-xs text-slate-500">Staff accounts are created by your ScrapGullak administrator. Self-registration is not available.</p>
            )}
          </form>
        )}
        {error && IS_PUBLIC_DEMO && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
        <p className="mt-6 text-center text-sm"><Link className="font-semibold text-slate-500 hover:text-trust" to="/">Back to ScrapGullak</Link></p>
      </section>
    </div>
  );
}
