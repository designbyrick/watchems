'use client';

import React from 'react';
import Link from 'next/link';

/**
 * CTAButton — Enforces a clear CTA hierarchy across the site.
 *
 * Usage:
 *   - ONE `priority="primary"` per page (bold, high-contrast, impossible to miss)
 *   - `priority="secondary"` for supporting actions (visible but subdued)
 *   - `priority="tertiary"` for low-priority navigation (text link style)
 */

type CTAPriority = 'primary' | 'secondary' | 'tertiary';
type CTASize = 'sm' | 'md' | 'lg';

interface CTAButtonProps {
  priority: CTAPriority;
  size?: CTASize;
  href?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const priorityStyles: Record<CTAPriority, string> = {
  primary:
    'bg-ink text-white font-bold rounded-md hover:bg-ink-hover shadow-sm transition-colors',
  secondary:
    'bg-subtle text-ink font-semibold rounded-md hover:bg-subtle border border-line-strong transition-colors',
  tertiary:
    'text-ink font-medium hover:underline underline-offset-2 transition-colors',
};

const sizeStyles: Record<CTASize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-7 py-3 text-base',
};

export function CTAButton({
  priority,
  size = 'md',
  href,
  className = '',
  children,
  onClick,
}: CTAButtonProps) {
  const combined = `${priorityStyles[priority]} ${sizeStyles[size]} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={`inline-block text-center ${combined}`}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combined} onClick={onClick}>
      {children}
    </button>
  );
}
