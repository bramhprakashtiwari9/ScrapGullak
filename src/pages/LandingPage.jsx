import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Building2, IndianRupee, PiggyBank, Scale } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BookingWidget from '../components/booking/BookingWidget';
import GullakCalculator, { newLine } from '../components/rates/GullakCalculator';
import CategoryIcon from '../components/ui/CategoryIcon';
import { GROUP_TONE, NOIDA_SECTORS, groupOfCategory } from '../utils/constants';
import { formatRate } from '../utils/format';

const PROMISES = [
  { icon: Scale, title: '100% ISO digital weighing', body: 'Weighed in front of you on a certified scale. The slip lands on your phone.' },
  { icon: IndianRupee, title: 'Paid on the spot', body: 'Payment is made after weighing, with the amount and method on your digital receipt.' },
  { icon: PiggyBank, title: 'Daily scrap savings', body: 'Every pickup adds to your Gullak passbook. Watch it fill.' },
];

const HOW = [
  { title: 'Book in a minute', body: 'Pick scrap types, a sector and a slot. No minimum weight for homes.' },
  { title: 'Agent arrives on time', body: 'A verified ScrapGullak agent comes in your slot with a digital scale.' },
  { title: 'Sorted and weighed at your door', body: 'Each grade is weighed separately at today’s published rate.' },
  { title: 'Paid on the spot', body: 'Your digital receipt records the weighed grades, rates, payout and payment method.' },
];

export default function LandingPage() {
  const { rates } = useApp();
  const location = useLocation();
  const [lines, setLines] = useState([]);
  const initialGroups = location.state?.groups || [];

  // Seed the estimator with a typical household mix once rates load.
  useEffect(() => {
    if (lines.length || !rates.length) return;
    const pick = (rx, kg) => { const r = rates.find((x) => rx.test(x.name)); return r ? newLine(r.id, kg) : null; };
    setLines([pick(/newspaper/i, 12), pick(/gatta/i, 8), pick(/pet/i, 3)].filter(Boolean));
  }, [rates]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (location.state?.scrollTo) {
      requestAnimationFrame(() => document.getElementById(location.state.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Hero: the booking widget is the hero's working half */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-gullak-soft" aria-hidden="true" />
        <div className="container-page relative grid gap-10 py-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-coin-soft px-3 py-1 text-sm font-semibold text-coin-dark">
              <span className="h-2 w-2 rounded-full bg-coin" aria-hidden="true" /> Picking up across Noida & Greater Noida today
            </p>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.1rem]">
              Kachre ko nahi, apni ScrapGullak ko bharein.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Book doorstep pickup for household or industrial scrap. Watch each grade weighed at your door, then get paid and receive a digital receipt.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#book" className="btn-primary">Book a free pickup <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              <Link to="/rates" className="btn-outline">See today’s rates</Link>
            </div>
            <ul className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4 lg:grid-cols-1 xl:grid-cols-3">
              {PROMISES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-2xl border border-slate-100 bg-white/80 p-2.5 sm:p-3 lg:border-0 lg:bg-transparent lg:p-0">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gullak-soft sm:h-9 sm:w-9">
                    <Icon className="h-4 w-4 text-gullak-dark sm:h-5 sm:w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-2 hidden font-display text-[17px] font-bold text-trust sm:block">{title}</p>
                  <p className="mt-2 font-display text-[11px] font-bold leading-tight text-trust sm:hidden">{title === '100% ISO digital weighing' ? 'Digital weighing' : title === 'Paid on the spot' ? 'Instant payout' : 'Gullak passbook'}</p>
                  <p className="mt-1 hidden text-sm text-slate-500 sm:block">{body}</p>
                </li>
              ))}
            </ul>
          </div>
          <BookingWidget initialGroups={initialGroups} />
        </div>
      </section>

      {/* Live rate strip */}
      <section className="border-b border-slate-200 bg-trust text-white" aria-label="Today’s rates">
        <div className="container-page flex items-center gap-6 overflow-x-auto py-4">
          <span className="shrink-0 font-display text-sm font-bold text-coin">Today in Noida</span>
          {rates.map((r) => (
            <span key={r.id} className="flex shrink-0 items-center gap-2 text-sm">
              <span className="text-slate-300">{r.name.split(' (')[0]}</span>
              <span className="font-semibold tabular">{formatRate(r.buyingRateInr, r.unit)}</span>
            </span>
          ))}
          <Link to="/rates" className="shrink-0 text-sm font-semibold text-gullak hover:underline">Full rate card</Link>
        </div>
      </section>

      {/* How it works (a real sequence) */}
      <section className="container-page py-16">
        <h2 className="max-w-xl text-3xl font-extrabold sm:text-4xl">From storeroom to payout in one visit</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((s, i) => (
            <li key={s.title} className="border-t-2 border-trust pt-4">
              <span className="font-display text-sm font-bold text-gullak-dark">Step {i + 1}</span>
              <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Estimator + top grades */}
      <section id="estimate" className="container-page grid gap-8 pb-16 lg:grid-cols-[1.25fr_1fr]">
        <GullakCalculator lines={lines} onChange={setLines} title="What’s your storeroom worth?" />
        <div>
          <h2 className="text-2xl font-extrabold">Grades that pay the most</h2>
          <p className="mt-1 text-sm text-slate-500">Separate these before the agent arrives and you get the full grade rate.</p>
          <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {[...rates].sort((a, b) => b.buyingRateInr - a.buyingRateInr).slice(0, 6).map((r) => {
              const g = groupOfCategory(r);
              return (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${GROUP_TONE[g]}`}><CategoryIcon iconName={r.iconName} group={g} className="h-4 w-4" /></span>
                  <span className="flex-1 font-medium text-trust">{r.name}</span>
                  <span className="font-display text-lg font-bold tabular">{formatRate(r.buyingRateInr, r.unit)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* B2B band */}
      <section className="bg-trust">
        <div className="container-page grid items-center gap-6 py-12 text-white md:grid-cols-[1fr_auto]">
          <div className="flex gap-4">
            <Building2 className="h-10 w-10 shrink-0 text-coin" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Running a factory, warehouse or IT campus?</h2>
              <p className="mt-2 max-w-2xl text-slate-300">Weighbridge slips, GST invoices and EPR certificates for Phase-2, Sector 80, Ecotech and the Sector 62 and 135 IT parks.</p>
            </div>
          </div>
          <Link to="/b2b" className="btn-coin">Request a bulk pickup</Link>
        </div>
      </section>

      {/* Coverage */}
      <section className="container-page py-14">
        <h2 className="text-2xl font-extrabold">Where we pick up</h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {NOIDA_SECTORS.map((s) => <li key={s} className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm text-slate-700">{s}</li>)}
        </ul>
        <p className="mt-4 text-sm text-slate-500">Not on the list? Book anyway. If your society is within 5 km of a route we will confirm by call.</p>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="container-page py-14">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Good to know before you book</h2>
          <p className="mt-2 max-w-2xl text-slate-600">Clear answers about pickup, weighing and payment.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              ['Is there a minimum quantity for a home pickup?', 'No. Household pickups have no minimum weight, so you can book even for a small pile of scrap.'],
              ['How is my payout calculated?', 'We weigh each scrap grade separately on a digital scale in front of you. Your payout is based on the actual weight and the published rate for that grade.'],
              ['Do I need to know the exact weight?', 'No. Choose an approximate range while booking. The final amount is calculated after weighing at your door.'],
              ['Does a household pickup cost anything?', 'No. Household doorstep pickup is free, and payment is made after weighing.'],
            ].map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-slate-200 bg-paper px-4 py-3 open:bg-white">
                <summary className="cursor-pointer list-none font-display font-bold text-trust marker:hidden">
                  <span className="flex items-center justify-between gap-3">{question}<span className="text-xl text-gullak-dark transition-transform group-open:rotate-45" aria-hidden="true">+</span></span>
                </summary>
                <p className="mt-2 pr-8 text-sm leading-relaxed text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
          <Link to="/rates" className="mt-6 inline-flex items-center gap-2 font-semibold text-gullak-dark hover:underline">
            Check rates and estimate your payout <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
