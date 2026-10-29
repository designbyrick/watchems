import React from 'react';

interface ResultBarProps {
  score1: number;
  score2: number;
  label?: string;
  className?: string;
}

export function ResultBar({
  score1,
  score2,
  label,
  className = '',
}: ResultBarProps) {
  const total = score1 + score2;
  const pct1 = total > 0 ? (score1 / total) * 100 : 50;
  const pct2 = 100 - pct1;

  // Determine which side is the winner
  const winner1 = score1 > score2;
  const winner2 = score2 > score1;

  return (
    <div className={className}>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-line w-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            winner1 ? 'bg-winner' : 'bg-line'
          }`}
          style={{ width: `${pct1}%` }}
        />
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            winner2 ? 'bg-winner' : 'bg-line'
          }`}
          style={{ width: `${pct2}%` }}
        />
      </div>
      {label && <div className="text-xs text-faint mt-1.5">{label}</div>}
    </div>
  );
}
