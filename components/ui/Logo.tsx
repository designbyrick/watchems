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

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoGlyph className="w-6 h-6 lg:w-[26px] lg:h-[26px]" />
      <span className="text-[20px] lg:text-[21px] font-bold tracking-[-0.6px] leading-none">watchems</span>
    </span>
  )
}
