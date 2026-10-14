/** Brand mark: a clay gullak with a coin slot and rupee. */
export default function GullakMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0F172A" />
      <ellipse cx="32" cy="15" rx="7" ry="4" fill="#F59E0B" />
      <path d="M22 18c-9 4-12 15-9 25 3 9 11 13 19 13s16-4 19-13c3-10 0-21-9-25z" fill="#10B981" />
      <rect x="26" y="22" width="12" height="3" rx="1.5" fill="#0F172A" />
      <text x="32" y="47" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="16" fill="#fff">₹</text>
    </svg>
  );
}
