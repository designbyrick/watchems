interface VerdictCalloutProps {
  winnerName: string | null
  verdictSummary: string
}

export function VerdictCallout({ winnerName, verdictSummary }: VerdictCalloutProps) {
  const isClose = !winnerName

  return (
    <div
      className={`rounded-sm p-5 md:p-6 mb-8 border-l-4 ${
        isClose
          ? 'bg-subtle border-ink'
          : 'bg-winnerBg border-winner'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl" aria-hidden="true">
          {isClose ? '⚖️' : '🏆'}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-faint">
            Our Verdict
          </p>
          <p className={`text-lg md:text-xl font-bold ${isClose ? 'text-ink' : 'text-winner'}`}>
            {isClose ? 'Too Close to Call' : winnerName}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted leading-relaxed ml-0 md:ml-11">
        {verdictSummary}
      </p>
    </div>
  )
}
