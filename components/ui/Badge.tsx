import React from 'react';

interface BadgeProps {
  variant?: 'winner' | 'loser' | 'accent' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: BadgeProps) {
  const variantClass = {
    winner:
      'bg-winnerBg text-winner font-medium text-xs tracking-wider px-2.5 py-0.5 rounded-full uppercase',
    loser:
      'bg-canvas text-faint font-medium text-xs tracking-wider px-2.5 py-0.5 rounded-full uppercase',
    accent:
      'bg-subtle text-ink font-medium text-xs tracking-wider px-2.5 py-0.5 rounded-full uppercase',
    neutral:
      'bg-canvas text-muted font-medium text-xs tracking-wider px-2.5 py-0.5 rounded-full uppercase',
  }[variant];

  return <span className={`${variantClass} ${className}`}>{children}</span>;
}
