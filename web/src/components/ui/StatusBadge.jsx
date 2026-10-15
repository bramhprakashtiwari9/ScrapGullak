import { ORDER_STATUS } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const meta = ORDER_STATUS[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
