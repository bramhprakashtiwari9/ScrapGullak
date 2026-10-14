import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, FileText, Gauge, Loader2, MapPin, Scale } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { b2bApi } from '../services/api';
import {
  B2B_ZONES, GSTIN_REGEX, MONTHLY_VOLUMES, PHONE_REGEX, PICKUP_FREQUENCIES, SCRAP_GROUPS,
} from '../utils/constants';
import { addDays, formatDay, localISO } from '../utils/format';

const FEATURES = [
  { icon: FileText, title: 'GST invoices', body: 'Tax invoice against your GSTIN for every lift, with HSN-wise grade breakup for your books.' },
  { icon: Scale, title: 'Certified digital weighbridge', body: 'Loads weighed on a stamped weighbridge. Gross, tare and net on one slip, with photos.' },
  { icon: Award, title: 'EPR and zero-waste certificates', body: 'Recycling certificates by material, ready for EPR filings and ESG reports.' },
  { icon: Gauge, title: 'Scheduled or on-call lifting', body: 'Fixed weekly slots, or call a truck when your bay fills. Rates locked for contract periods.' },
];

const EMPTY = {
  requestType: 'Bulk pickup', companyName: '', gstNumber: '', contactName: '', phone: '', email: '',
  zone: '', siteAddress: '', materials: [], monthlyVolume: '', frequency: 'One-time lift',
  preferredDate: localISO(addDays(new Date(), 1)), notes: '',
};

function validate(f) {
  const e = {};
  if (f.companyName.trim().length < 2) e.companyName = 'Enter the registered company name.';
  if (f.gstNumber && !GSTIN_REGEX.test(f.gstNumber.trim().toUpperCase())) e.gstNumber = 'GSTIN should look like 09AABCE1234F1Z5.';
  if (f.contactName.trim().length < 2) e.contactName = 'Enter a contact person.';
  if (!PHONE_REGEX.test(f.phone.trim())) e.phone = 'Enter a 10-digit mobile number.';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid work email.';
  if (!f.zone) e.zone = 'Choose the industrial zone or sector.';
  if (f.siteAddress.trim().length < 6) e.siteAddress = 'Enter the plot or tower address for the truck.';
  if (!f.materials.length) e.materials = 'Select at least one material.';
  if (!f.monthlyVolume) e.monthlyVolume = 'Select an expected volume.';
  if (!f.preferredDate || f.preferredDate < localISO()) e.preferredDate = 'Choose today or a later date.';
  return e;
}

function Field({ label, error, htmlFor, optional, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">{label}{optional && <span className="font-normal text-slate-400"> (optional)</span>}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function B2BPortalPage() {
  const { session, ensureSession, notify } = useApp();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const u = session?.user;
    if (u?.accountType !== 'B2B_CORPORATE') return;
    setForm((f) => ({
      ...f,
      companyName: f.companyName || u.companyName || '',
      gstNumber: f.gstNumber || u.gstNumber || '',
      contactName: f.contactName || u.fullName || '',
      phone: f.phone || u.phone || '',
      email: f.email || u.email || '',
      zone: f.zone || (B2B_ZONES.some((z) => z.id === u.noidaSector) ? u.noidaSector : ''),
      siteAddress: f.siteAddress || u.address || '',
    }));
  }, [session]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleMaterial = (id) => setForm((f) => ({ ...f, materials: f.materials.includes(id) ? f.materials.filter((m) => m !== id) : [...f.materials, id] }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`b2b-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await ensureSession();
      const order = await b2bApi.requestBulkPickup({ ...form, gstNumber: form.gstNumber.trim().toUpperCase() });
      setResult(order);
      notify(`Request ${order.orderNumber} sent to the B2B desk.`);
    } catch (err) {
      notify(err.message || 'Could not send the request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="bg-trust text-white">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr] lg:py-20">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Scrap lifting for Noida’s factories, warehouses and IT campuses.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              One partner for production scrap, packaging waste and IT asset disposal. Weighbridge-verified, invoiced against your GSTIN, and certified for EPR.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#tender" className="btn-coin">Request a bulk pickup</a>
              <Link to="/rates" className="btn border border-white/25 text-white hover:bg-white/10">See today’s rates</Link>
            </div>
          </div>
          <ul className="grid content-center gap-2">
            {B2B_ZONES.map((z) => (
              <li key={z.id} className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gullak" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-white">{z.name}</p>
                  <p className="text-sm text-slate-400">{z.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-14">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="h-7 w-7 text-gullak" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="tender" className="container-page pb-6">
        <div className="card grid overflow-hidden lg:grid-cols-[1fr_1.6fr]">
          <div className="bg-gullak-soft p-6 sm:p-8">
            <h2 className="text-3xl font-extrabold">Request a corporate tender or bulk pickup</h2>
            <p className="mt-3 text-slate-600">Our B2B desk calls back within 2 working hours with a site visit slot and rate sheet.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {['Free site survey and bin placement', 'Rates locked for monthly and annual contracts', 'Truck dispatched within 24 hours for one-time lifts', 'Payment by bank transfer within 2 days of the slip'].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gullak" />{t}</li>
              ))}
            </ul>
          </div>

          {result ? (
            <div className="flex flex-col items-start justify-center p-6 sm:p-8">
              <CheckCircle2 className="h-10 w-10 text-gullak" aria-hidden="true" />
              <h3 className="mt-3 text-2xl font-extrabold">Request received</h3>
              <p className="mt-1 text-slate-600">Reference <span className="font-semibold text-trust">#{result.orderNumber}</span> for {form.companyName}.</p>
              <p className="mt-1 text-slate-600">Preferred visit: {formatDay(result.scheduledDate)}. The dispatch team will call {form.contactName} on {form.phone}.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/passbook" className="btn-primary">Track lifts and receipts</Link>
                <button type="button" className="btn-outline" onClick={() => { setResult(null); setForm((f) => ({ ...EMPTY, companyName: f.companyName, gstNumber: f.gstNumber, contactName: f.contactName, phone: f.phone, email: f.email })); }}>Send another request</button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={submit} className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              <fieldset className="sm:col-span-2">
                <legend className="field-label">Request type</legend>
                <div className="flex gap-2">
                  {['Bulk pickup', 'Corporate tender'].map((t) => (
                    <button key={t} type="button" aria-pressed={form.requestType === t} onClick={() => setForm((f) => ({ ...f, requestType: t }))} className={form.requestType === t ? 'chip-on' : 'chip-off'}>{t}</button>
                  ))}
                </div>
              </fieldset>
              <Field label="Company name" htmlFor="b2b-companyName" error={errors.companyName}>
                <input id="b2b-companyName" className="field" value={form.companyName} onChange={set('companyName')} autoComplete="organization" />
              </Field>
              <Field label="GSTIN" htmlFor="b2b-gstNumber" error={errors.gstNumber} optional>
                <input id="b2b-gstNumber" className="field uppercase" value={form.gstNumber} onChange={set('gstNumber')} placeholder="09AABCE1234F1Z5" maxLength={15} />
              </Field>
              <Field label="Contact person" htmlFor="b2b-contactName" error={errors.contactName}>
                <input id="b2b-contactName" className="field" value={form.contactName} onChange={set('contactName')} autoComplete="name" />
              </Field>
              <Field label="Mobile number" htmlFor="b2b-phone" error={errors.phone}>
                <input id="b2b-phone" className="field" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} autoComplete="tel-national" />
              </Field>
              <Field label="Work email" htmlFor="b2b-email" error={errors.email}>
                <input id="b2b-email" type="email" className="field" value={form.email} onChange={set('email')} autoComplete="email" />
              </Field>
              <Field label="Industrial zone or sector" htmlFor="b2b-zone" error={errors.zone}>
                <select id="b2b-zone" className="field" value={form.zone} onChange={set('zone')}>
                  <option value="">Choose a zone</option>
                  {B2B_ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Site address" htmlFor="b2b-siteAddress" error={errors.siteAddress}>
                  <input id="b2b-siteAddress" className="field" value={form.siteAddress} onChange={set('siteAddress')} placeholder="Plot, block, gate number" />
                </Field>
              </div>
              <fieldset className="sm:col-span-2">
                <legend className="field-label">Materials</legend>
                <div className="flex flex-wrap gap-2" id="b2b-materials" tabIndex={-1}>
                  {SCRAP_GROUPS.map((g) => (
                    <button key={g.id} type="button" aria-pressed={form.materials.includes(g.id)} onClick={() => toggleMaterial(g.id)} className={form.materials.includes(g.id) ? 'chip-on' : 'chip-off'}>{g.label}</button>
                  ))}
                </div>
                {errors.materials && <p className="field-error">{errors.materials}</p>}
              </fieldset>
              <Field label="Expected volume per month" htmlFor="b2b-monthlyVolume" error={errors.monthlyVolume}>
                <select id="b2b-monthlyVolume" className="field" value={form.monthlyVolume} onChange={set('monthlyVolume')}>
                  <option value="">Choose volume</option>
                  {MONTHLY_VOLUMES.map((v) => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Pickup frequency" htmlFor="b2b-frequency">
                <select id="b2b-frequency" className="field" value={form.frequency} onChange={set('frequency')}>
                  {PICKUP_FREQUENCIES.map((v) => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Preferred site visit date" htmlFor="b2b-preferredDate" error={errors.preferredDate}>
                <input id="b2b-preferredDate" type="date" className="field" min={localISO()} value={form.preferredDate} onChange={set('preferredDate')} />
              </Field>
              <Field label="Notes for the B2B desk" htmlFor="b2b-notes" optional>
                <input id="b2b-notes" className="field" value={form.notes} onChange={set('notes')} placeholder="Loading bay hours, gate pass needs…" />
              </Field>
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <p className="text-xs text-slate-500">We share your details only with the ScrapGullak dispatch team.</p>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Send request
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
