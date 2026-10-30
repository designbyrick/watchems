interface WatchSpec {
  label: string
  values: string[]
}

interface WatchObject {
  name: string
  [key: string]: string
}

interface ComparisonTablePropsLegacy {
  watches: string[]
  specs: WatchSpec[]
}

interface ComparisonTablePropsObjects {
  watches: WatchObject[]
  specs?: never
}

type ComparisonTableProps = ComparisonTablePropsLegacy | ComparisonTablePropsObjects

function isObjectArray(watches: string[] | WatchObject[]): watches is WatchObject[] {
  return watches.length > 0 && typeof watches[0] === 'object'
}

export default function ComparisonTable({ watches, specs }: ComparisonTableProps) {
  if (!watches || watches.length === 0) return null

  // If watches is an array of objects, derive headers and specs from it
  if (isObjectArray(watches)) {
    const headers = watches.map((w) => w.name)
    const allKeys = Object.keys(watches[0]).filter((k) => k !== 'name')
    const derivedSpecs: WatchSpec[] = allKeys.map((key) => ({
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      values: watches.map((w) => w[key] ?? '—'),
    }))

    return (
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 my-8">
        <table className="w-full text-sm border border-line rounded-sm overflow-hidden">
          <thead>
            <tr className="bg-canvas text-ink text-left">
              <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider border-b border-line">
                Spec
              </th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider border-b border-line">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {derivedSpecs.map((spec, i) => (
              <tr key={spec.label} className={`border-b border-line ${i % 2 === 0 ? 'bg-surface' : 'bg-canvas'}`}>
                <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap">{spec.label}</td>
                {spec.values.map((val, vi) => (
                  <td key={vi} className="px-3 py-2.5 text-muted">{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Legacy format: string[] watches + WatchSpec[] specs
  if (!specs || specs.length === 0) return null

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 my-8">
      <table className="w-full text-sm border border-line rounded-sm overflow-hidden">
        <thead>
          <tr className="bg-canvas text-ink text-left">
            <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider border-b border-line">
              Spec
            </th>
            {watches.map((w) => (
              <th key={w} className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wider border-b border-line">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map((spec, i) => (
            <tr key={spec.label} className={`border-b border-line ${i % 2 === 0 ? 'bg-surface' : 'bg-canvas'}`}>
              <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap">{spec.label}</td>
              {spec.values.map((val, vi) => (
                <td key={vi} className="px-3 py-2.5 text-muted">{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
