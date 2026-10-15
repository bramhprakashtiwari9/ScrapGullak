import { formatINR } from '../../utils/format';

const BODY = 'M74 46 C 34 60, 20 108, 32 150 C 44 192, 82 206, 100 206 C 118 206, 156 192, 168 150 C 180 108, 166 60, 126 46 Z';
const TOP = 46;
const BOTTOM = 206;

/** Clay gullak that fills with gold as lifetime earnings grow toward the next milestone. */
export default function GullakJar({ amount = 0, milestone = 5000 }) {
  const fill = Math.max(0.06, Math.min(1, amount / milestone));
  const level = (BOTTOM - TOP) * (1 - fill);
  return (
    <figure className="relative mx-auto w-full max-w-[220px]">
      <svg viewBox="0 0 200 220" className="w-full" role="img" aria-label={`Gullak ${Math.round(fill * 100)}% of the way to ${formatINR(milestone)}`}>
        <defs>
          <clipPath id="gullak-body"><path d={BODY} /></clipPath>
          <linearGradient id="gullak-gold" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FCD34D" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        {/* Clay body */}
        <path d={BODY} fill="#ECFDF5" stroke="#0F172A" strokeWidth="4" />
        {/* Gold fill */}
        <g clipPath="url(#gullak-body)">
          <rect x="0" y={TOP} width="200" height={BOTTOM - TOP} fill="url(#gullak-gold)"
            style={{ transform: `translateY(${level}px)`, transition: 'transform 1.2s cubic-bezier(.2,.8,.2,1)' }} />
          {[40, 70, 100, 130, 160].map((x, i) => (
            <circle key={x} cx={x} cy={BOTTOM - 10 - (i % 2) * 8} r="9" fill="#FBBF24" stroke="#B45309" strokeWidth="1.5" opacity={fill > 0.12 ? 1 : 0} />
          ))}
        </g>
        <path d={BODY} fill="none" stroke="#0F172A" strokeWidth="4" />
        {/* Neck, knob and coin slot */}
        <path d="M80 46 Q100 36 120 46" fill="none" stroke="#0F172A" strokeWidth="4" />
        <ellipse cx="100" cy="30" rx="16" ry="9" fill="#10B981" stroke="#0F172A" strokeWidth="4" />
        <rect x="84" y="62" width="32" height="6" rx="3" fill="#0F172A" />
        {/* Clay highlight */}
        <path d="M52 92 C 46 112, 46 132, 52 150" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".7" />
        {/* Falling coin */}
        <g className="motion-coin">
          <g className="animate-coin-drop" style={{ transformBox: 'fill-box' }}>
            <circle cx="100" cy="58" r="8" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
            <text x="100" y="62" textAnchor="middle" fontSize="10" fontWeight="700" fill="#78350F">₹</text>
          </g>
        </g>
      </svg>
    </figure>
  );
}
