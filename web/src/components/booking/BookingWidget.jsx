import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarDays, Camera, CheckCircle2, ChevronLeft, Clock, Factory, Home, ImagePlus,
  Loader2, LocateFixed, MapPin, MessageCircle, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { customerApi } from '../../services/api';
import { NOIDA_SECTORS, SCRAP_GROUPS, SECTOR_COORDS, TIME_SLOTS, WEIGHT_RANGES } from '../../utils/constants';
import { addDays, formatDay, formatINR, localISO } from '../../utils/format';
import { compressImage } from '../../utils/image';
import CategoryIcon from '../ui/CategoryIcon';

const STEPS = ['Pickup type', 'Scrap types', 'Weight & slot', 'Confirmed'];

const TYPES = [
  { id: 'DOORSTEP_B2C', icon: Home, title: 'Household or society', body: 'Flats, villas and RWA scrap drives. No minimum weight.' },
  { id: 'INDUSTRIAL_B2B', icon: Factory, title: 'Factory, IT park or warehouse', body: 'Bulk lifts with weighbridge slip and GST invoice.' },
];

function StepIndicator({ step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n || step === STEPS.length;
        const current = step === n && step < STEPS.length;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-gullak text-white' : current ? 'bg-trust text-white' : 'bg-slate-100 text-slate-500'}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : n}
            </span>
            <span className={`hidden text-xs font-semibold xl:inline ${current ? 'text-trust' : 'text-slate-400'}`}>{label}</span>
            {n < STEPS.length && <span className={`h-0.5 flex-1 rounded ${done ? 'bg-gullak' : 'bg-slate-200'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function BookingWidget({ initialGroups = [] }) {
  const { session, rates, ensureSession, notify } = useApp();
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState(null);
  const [groups, setGroups] = useState(() => new Set(initialGroups));
  const [weightRange, setWeightRange] = useState('');
  const [photo, setPhoto] = useState(null); // { name, dataUrl }
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sector, setSector] = useState('');
  const [date, setDate] = useState(localISO());
  const [slot, setSlot] = useState('');
  const [address, setAddress] = useState('');
  const [gps, setGps] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const fileInput = useRef(null);
  const headingRef = useRef(null);

  const initialKey = initialGroups.join(',');
  useEffect(() => {
    if (initialGroups.length) {
      setGroups(new Set(initialGroups));
      setOrder(null);
      setStep(1);
    }
  }, [initialKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const u = session?.user;
    if (!u) return;
    if (!sector && NOIDA_SECTORS.includes(u.noidaSector)) setSector(u.noidaSector);
    if (!address && u.address) setAddress(u.address);
    if (!orderType && u.accountType === 'B2B_CORPORATE') setOrderType('INDUSTRIAL_B2B');
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [step]);

  const topRateByGroup = useMemo(() => {
    const m = {};
    rates.forEach((r) => {
      const g = /mixed/i.test(r.name) ? 'MIXED' : r.categoryGroup;
      m[g] = Math.max(m[g] || 0, Number(r.buyingRateInr) || 0);
    });
    return m;
  }, [rates]);

  const toggleGroup = (id) => setGroups((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const goNext = () => {
    setError('');
    if (step === 1 && !orderType) return setError('Choose who the pickup is for.');
    if (step === 2 && groups.size === 0) return setError('Pick at least one type of scrap.');
    if (step === 1 && weightRange && !WEIGHT_RANGES[orderType].includes(weightRange)) setWeightRange('');
    return setStep((s) => s + 1);
  };

  const onPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('That file is not a photo. Choose a JPG or PNG.');
    if (file.size > 12 * 1024 * 1024) return setError('That photo is over 12 MB. Choose a smaller one.');
    setError('');
    setPhotoBusy(true);
    try {
      setPhoto({ name: file.name, dataUrl: await compressImage(file) });
    } catch (e) {
      setError(e.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return setError('Location is not available in this browser. Choose your sector instead.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocating(false); setError('Location permission was denied. Choose your sector and type your address.'); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const submit = async () => {
    setError('');
    if (!weightRange) return setError('Select an approximate weight.');
    if (!sector) return setError('Select your sector.');
    if (!date || date < localISO()) return setError('Choose today or a later date.');
    if (!slot) return setError('Select a time slot.');
    if (address.trim().length < 6) return setError('Add your flat, tower or plot number so the agent can find you.');
    setSubmitting(true);
    try {
      await ensureSession();
      const [lat, lng] = gps ? [gps.lat, gps.lng] : SECTOR_COORDS[sector] || [null, null];
      const created = await customerApi.createPickup({
        orderType,
        noidaSector: sector,
        fullAddress: address.trim(),
        gpsLat: lat,
        gpsLng: lng,
        scheduledDate: date,
        timeSlot: slot,
        estimatedWeightRange: weightRange,
        scrapGroups: [...groups],
        photoUrl: photo?.dataUrl || null,
      });
      setOrder(created);
      setStep(4);
      notify(`Pickup ${created.orderNumber} booked.`);
    } catch (e) {
      setError(e.message || 'Booking failed. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1); setOrder(null); setGroups(new Set()); setWeightRange(''); setPhoto(null); setSlot(''); setError(''); setGps(null);
  };

  const shareText = order
    ? `My ScrapGullak pickup is booked.\nOrder ${order.orderNumber}\n${formatDay(order.scheduledDate)}, ${order.timeSlot}\n${order.noidaSector}\nWeighed on a digital scale, paid instantly to UPI.\nBook yours: ${window.location.origin}`
    : '';

  const dateOptions = Array.from({ length: 7 }, (_, i) => localISO(addDays(new Date(), i)));

  return (
    <section id="book" className="card h-fit self-center overflow-hidden shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]" aria-labelledby="book-heading">
      <div className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="book-heading" ref={headingRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
            {step === 4 ? 'Pickup booked' : 'Book a free pickup'}
          </h2>
          {step > 1 && step < 4 && (
            <button type="button" className="btn-ghost -mr-2 px-2 py-1.5 text-xs" onClick={() => { setError(''); setStep((s) => s - 1); }}>
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>
        <StepIndicator step={step} />
      </div>

      <div className="px-5 py-5 sm:px-6">
        {step === 1 && (
          <fieldset>
            <legend className="mb-3 text-sm text-slate-500">Who is the scrap for?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {TYPES.map(({ id, icon: Icon, title, body }) => {
                const on = orderType === id;
                return (
                  <button key={id} type="button" aria-pressed={on} onClick={() => setOrderType(id)}
                    className={`rounded-2xl border-2 p-4 text-left transition-colors ${on ? 'border-gullak bg-gullak-soft' : 'border-slate-200 hover:border-slate-300'}`}>
                    <Icon className={`h-6 w-6 ${on ? 'text-gullak-dark' : 'text-slate-500'}`} aria-hidden="true" />
                    <span className="mt-3 block font-display text-[17px] font-bold text-trust">{title}</span>
                    <span className="mt-1 block text-sm text-slate-500">{body}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend className="mb-3 text-sm text-slate-500">Select everything you have. The agent sorts and weighs each grade separately.</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SCRAP_GROUPS.map((g) => {
                const on = groups.has(g.id);
                return (
                  <button key={g.id} type="button" aria-pressed={on} onClick={() => toggleGroup(g.id)}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors ${on ? 'border-gullak bg-gullak-soft' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-gullak text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <CategoryIcon iconName={g.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold leading-snug text-trust">{g.label}</span>
                      <span className="block text-xs text-slate-500">{g.hint}</span>
                      {topRateByGroup[g.id] > 0 && (
                        <span className="mt-1 block text-xs font-semibold text-coin-dark">up to {formatINR(topRateByGroup[g.id])}/kg</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 3 && orderType && (
          <div className="space-y-5">
            <fieldset>
              <legend className="field-label">Approximate weight</legend>
              <div className="flex flex-wrap gap-2">
                {WEIGHT_RANGES[orderType].map((w) => (
                  <button key={w} type="button" aria-pressed={weightRange === w} onClick={() => setWeightRange(w)} className={weightRange === w ? 'chip-on' : 'chip-off'}>{w}</button>
                ))}
              </div>
            </fieldset>

            <div>
              <span className="field-label">Photo of your scrap <span className="font-normal text-slate-400">(optional)</span></span>
              {photo ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2">
                  <img src={photo.dataUrl} alt="Your scrap pile" className="h-16 w-16 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{photo.name}</span>
                  <button type="button" className="btn-ghost px-2" onClick={() => setPhoto(null)} aria-label="Remove photo"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onPhoto(e.dataTransfer.files?.[0]); }}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-left text-sm text-slate-600 hover:border-gullak">
                  {photoBusy ? <Loader2 className="h-5 w-5 animate-spin text-gullak" /> : <Camera className="h-5 w-5 text-slate-500" />}
                  <span>A photo helps us send the right vehicle. <span className="font-semibold text-gullak-dark">Upload or drop one</span></span>
                  <ImagePlus className="ml-auto h-4 w-4 text-slate-400" aria-hidden="true" />
                </button>
              )}
              <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bk-sector" className="field-label"><MapPin className="mr-1 inline h-4 w-4 text-slate-400" />Sector</label>
                <select id="bk-sector" className="field" value={sector} onChange={(e) => setSector(e.target.value)}>
                  <option value="">Choose your sector</option>
                  {NOIDA_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="bk-date" className="field-label"><CalendarDays className="mr-1 inline h-4 w-4 text-slate-400" />Date</label>
                <select id="bk-date" className="field" value={date} onChange={(e) => setDate(e.target.value)}>
                  {dateOptions.map((d) => <option key={d} value={d}>{formatDay(d)}</option>)}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className="field-label"><Clock className="mr-1 inline h-4 w-4 text-slate-400" />Time slot</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TIME_SLOTS.map((t) => (
                  <button key={t} type="button" aria-pressed={slot === t} onClick={() => setSlot(t)}
                    className={`rounded-xl border px-2 py-2 text-sm font-semibold ${slot === t ? 'border-gullak bg-gullak-soft text-gullak-dark' : 'border-slate-300 text-slate-700 hover:border-slate-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bk-address" className="field-label">{orderType === 'INDUSTRIAL_B2B' ? 'Plot / site address' : 'Flat, tower and society'}</label>
                <button type="button" onClick={locate} className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-gullak-dark hover:underline">
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                  {gps ? 'Location added' : 'Use my location'}
                </button>
              </div>
              <textarea id="bk-address" rows={2} className="field resize-none" value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder={orderType === 'INDUSTRIAL_B2B' ? 'e.g. Plot 14, Udyog Vihar, Ecotech-3' : 'e.g. C-1204, Supertech Capetown'} />
            </div>
          </div>
        )}

        {step === 4 && order && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gullak" aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500">Your order ID</p>
            <p className="font-display text-3xl font-extrabold tracking-tight text-trust tabular">#{order.orderNumber}</p>
            <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3 rounded-2xl bg-paper p-4 text-left text-sm">
              <div><dt className="text-slate-500">When</dt><dd className="font-semibold text-trust">{formatDay(order.scheduledDate)}, {order.timeSlot}</dd></div>
              <div><dt className="text-slate-500">Where</dt><dd className="font-semibold text-trust">{order.noidaSector}</dd></div>
              <div><dt className="text-slate-500">Type</dt><dd className="font-semibold text-trust">{order.orderType === 'INDUSTRIAL_B2B' ? 'Industrial lift' : 'Doorstep pickup'}</dd></div>
              <div><dt className="text-slate-500">Estimated</dt><dd className="font-semibold text-trust">{order.estimatedWeightRange}</dd></div>
            </dl>
            <p className="mx-auto mt-4 max-w-sm text-sm text-slate-500">We will message you when an agent is assigned. Keep your scrap near the door; the agent brings the digital scale.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:bg-[#1ebe5a]">
                <MessageCircle className="h-4 w-4" /> Share on WhatsApp
              </a>
              <Link to="/passbook" className="btn-outline">Track in passbook</Link>
            </div>
            <button type="button" onClick={reset} className="mt-3 text-sm font-semibold text-slate-500 hover:text-trust">Book another pickup</button>
          </div>
        )}

        {error && <p className="field-error mt-4" role="alert">{error}</p>}
      </div>

      {step < 4 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-paper/60 px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500">
            {step === 1 && 'Free pickup. No charges, no minimum for households.'}
            {step === 2 && `${groups.size} selected`}
            {step === 3 && (orderType === 'INDUSTRIAL_B2B'
              ? <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />GST invoice issued after weighing</span>
              : 'Paid on the spot after weighing.')}
          </p>
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={goNext}>Continue</button>
          ) : (
            <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Confirm pickup
            </button>
          )}
        </div>
      )}
    </section>
  );
}
