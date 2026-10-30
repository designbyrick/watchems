/** Dial glyph with an orange tick at 12 o'clock, plus the lowercase wordmark. */
export function LogoGlyph({ className = 'w-[26px] h-[26px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="11.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 3.5v3" className="stroke-mark" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 13V8.2M13 13l3.6 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Original Watchems wordmark (pre-redesign), served from public/logo.svg. */
export default function Logo() {
  return (
    <span className="flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Watchems" className="h-6 lg:h-[26px] w-auto" />
    </span>
  )
}
