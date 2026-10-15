import { CheckCircle2, Phone } from 'lucide-react';
import { STATUS_FLOW } from '../../utils/constants';
import { formatDay } from '../../utils/format';

const LABELS = {
  BOOKED: 'Booking confirmed',
  AGENT_ASSIGNED: 'Agent assigned',
  OUT_FOR_PICKUP: 'Out for pickup',
  WEIGHED: 'Digital weighing',
  PAID: 'UPI paid',
};

export default function StatusTracker({ order }) {
  const current = STATUS_FLOW.indexOf(order.status);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Pickup #{order.orderNumber}</p>
          <p className="font-display text-lg font-bold text-trust">{formatDay(order.scheduledDate)}, {order.timeSlot}</p>
          <p className="text-sm text-slate-500">{order.fullAddress}, {order.noidaSector}</p>
        </div>
        {order.assignedAgent && (
          <a href={`tel:${order.assignedAgent.phone}`} className="btn-outline px-3 py-1.5 text-xs">
            <Phone className="h-3.5 w-3.5" /> Call {order.assignedAgent.fullName.split(' ')[0]}
          </a>
        )}
      </div>
      <ol className="mt-5 grid grid-cols-5 gap-1" aria-label="Pickup status">
        {STATUS_FLOW.map((s, i) => {
          const done = i < current || order.status === 'PAID';
          const active = i === current && order.status !== 'PAID';
          return (
            <li key={s} className="flex flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
              <div className="flex w-full items-center">
                <span className={`h-1 flex-1 ${i === 0 ? 'invisible' : done || active ? 'bg-gullak' : 'bg-slate-200'}`} />
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${done ? 'border-gullak bg-gullak text-white' : active ? 'border-gullak bg-white text-gullak' : 'border-slate-200 bg-white text-slate-300'}`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <span className={`h-2 w-2 rounded-full ${active ? 'animate-pulse bg-gullak' : 'bg-slate-300'}`} />}
                </span>
                <span className={`h-1 flex-1 ${i === STATUS_FLOW.length - 1 ? 'invisible' : done ? 'bg-gullak' : 'bg-slate-200'}`} />
              </div>
              <span className={`mt-2 text-[11px] font-semibold leading-tight sm:text-xs ${done || active ? 'text-trust' : 'text-slate-400'}`}>{LABELS[s]}</span>
            </li>
          );
        })}
      </ol>
      {order.assignedAgent && order.status !== 'PAID' && (
        <p className="mt-4 rounded-xl bg-gullak-soft px-3 py-2 text-sm text-gullak-dark">
          {order.assignedAgent.fullName} will arrive in your slot with a certified digital scale.
        </p>
      )}
    </div>
  );
}
