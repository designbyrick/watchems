import React from 'react';

interface SpecRowProps {
  label: string;
  value1: string | number;
  value2: string | number;
  watch1Name?: string;
  watch2Name?: string;
  winner?: 1 | 2 | null;
  highlight?: boolean;
}

export function SpecRow({
  label,
  value1,
  value2,
  watch1Name,
  watch2Name,
  winner,
  highlight = false,
}: SpecRowProps) {
  const bgClass = highlight ? 'bg-canvas' : '';

  const value1Class =
    winner === 1
      ? 'font-bold text-winner'
      : winner === 2
      ? 'text-faint'
      : 'text-ink font-medium';

  const value2Class =
    winner === 2
      ? 'font-bold text-winner'
      : winner === 1
      ? 'text-faint'
      : 'text-ink font-medium';

  return (
    <>
      {/* Desktop: 3-column grid */}
      <div className={`hidden sm:grid grid-cols-3 gap-2 py-3 border-b border-line text-sm ${bgClass}`}>
        <div className="text-faint text-xs text-center">{label}</div>
        <div className={`text-center ${value1Class}`}>{value1}</div>
        <div className={`text-center ${value2Class}`}>{value2}</div>
      </div>

      {/* Mobile: stacked card layout */}
      <div className={`sm:hidden border-b border-line py-3.5 px-4 ${bgClass}`}>
        <div className="text-xs text-faint font-semibold uppercase tracking-wider mb-2">{label}</div>
        <div className="flex justify-between gap-3">
          <div className="flex-1 min-w-0">
            {watch1Name && <div className="text-[11px] text-faint mb-0.5 truncate">{watch1Name}</div>}
            <div className={`text-sm break-words ${value1Class}`}>{value1}</div>
          </div>
          <div className="w-px bg-line self-stretch mx-1" />
          <div className="flex-1 min-w-0 text-right">
            {watch2Name && <div className="text-[11px] text-faint mb-0.5 truncate">{watch2Name}</div>}
            <div className={`text-sm break-words ${value2Class}`}>{value2}</div>
          </div>
        </div>
      </div>
    </>
  );
}
