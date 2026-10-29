interface Props {
  label: string
  value: number
  max?: number
}

export default function RatingBar({ label, value, max = 5 }: Props) {
  const pct = (value / max) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className="h-full bg-winner rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-ink w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}
