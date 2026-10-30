import type { Watch } from '@/lib/types'

function getBestFor(watch: Watch): string {
  const traits: string[] = []

  // Movement-based
  if (watch.movement_type === 'quartz') {
    traits.push('Low-maintenance daily wear')
  } else if (watch.movement_type === 'manual') {
    traits.push('Watch enthusiasts & collectors')
  }

  // Water resistance
  if (watch.water_resistance_m >= 200) {
    traits.push('Diving & water sports')
  } else if (watch.water_resistance_m >= 100) {
    traits.push('Swimming & active lifestyles')
  }

  // Case size
  if (watch.case_diameter_mm <= 38) {
    traits.push('Dress occasions & smaller wrists')
  } else if (watch.case_diameter_mm >= 42) {
    traits.push('Bold, sporty style')
  }

  // Category-based
  if (watch.primary_category === 'dive' && !traits.some(t => t.includes('Diving'))) {
    traits.push('Diving & adventure')
  } else if (watch.primary_category === 'dress' && !traits.some(t => t.includes('Dress'))) {
    traits.push('Formal & business settings')
  } else if (watch.primary_category === 'gmt') {
    traits.push('Frequent travelers')
  } else if (watch.primary_category === 'field') {
    traits.push('Outdoor & field use')
  } else if (watch.primary_category === 'chronograph') {
    traits.push('Timing & motorsport fans')
  }

  // Automatic as a feature
  if (watch.movement_type === 'automatic' && !traits.some(t => t.includes('enthusiasts'))) {
    traits.push('Mechanical watch appreciation')
  }

  return traits.slice(0, 2).join(' · ') || 'Everyday versatility'
}

export default function BestForBox({ w1, w2 }: { w1: Watch; w2: Watch }) {
  const bestFor1 = getBestFor(w1)
  const bestFor2 = getBestFor(w2)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div className="relative bg-surface border-l-4 border-l-ink border border-line rounded-sm p-5">
        <span className="absolute -top-3 left-4 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
          Best For
        </span>
        <p className="text-xs text-faint font-semibold uppercase tracking-wider mt-1 mb-1">{w1.brand}</p>
        <p className="text-sm font-bold text-ink mb-2">{w1.name}</p>
        <p className="text-sm text-muted leading-relaxed">{bestFor1}</p>
      </div>
      <div className="relative bg-surface border-l-4 border-l-line-strong border border-line rounded-sm p-5">
        <span className="absolute -top-3 left-4 bg-line-strong text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
          Best For
        </span>
        <p className="text-xs text-faint font-semibold uppercase tracking-wider mt-1 mb-1">{w2.brand}</p>
        <p className="text-sm font-bold text-ink mb-2">{w2.name}</p>
        <p className="text-sm text-muted leading-relaxed">{bestFor2}</p>
      </div>
    </div>
  )
}
