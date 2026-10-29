interface ProsConsProps {
  title?: string
  pros: string[]
  cons: string[]
}

export default function ProsCons({ title, pros = [], cons = [] }: ProsConsProps) {
  if (pros.length === 0 && cons.length === 0) return null
  return (
    <div className="card p-6 my-6">
      {title && <h4 className="font-bold text-ink mb-4 text-base">{title}</h4>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h5 className="text-green-700 font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span role="img" aria-hidden>✅</span> Pros
          </h5>
          <ul className="space-y-2">
            {pros.map((p, i) => (
              <li key={i} className="text-sm text-muted flex items-start gap-2">
                <span className="text-green-500 mt-0.5 shrink-0">+</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-red-700 font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span role="img" aria-hidden>❌</span> Cons
          </h5>
          <ul className="space-y-2">
            {cons.map((c, i) => (
              <li key={i} className="text-sm text-muted flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">−</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
