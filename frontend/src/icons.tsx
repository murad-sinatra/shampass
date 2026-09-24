export function BusMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="4" fill="#0f766e" />
      <path d="M6 16.5h20" stroke="#fff8e8" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="9" cy="16.5" r="2.5" fill="#fff8e8" />
      <circle cx="23" cy="16.5" r="2.5" fill="#fff8e8" />
    </svg>
  );
}

export function TicketGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="mors-icon">
      <path d="M4.5 8.5A2 2 0 0 1 6.5 6.5h11a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.2v1.4a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-1.4a1.6 1.6 0 0 0 0-3.2z" />
      <path d="M9 8.5v7" />
    </svg>
  );
}

export function SwapGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="mors-icon">
      <path d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}
