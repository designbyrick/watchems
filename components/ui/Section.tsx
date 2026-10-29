import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  bg?: 'base' | 'surface' | 'none';
  border?: boolean;
  py?: 'sm' | 'md' | 'lg';
}

export function Section({
  children,
  className = '',
  bg = 'none',
  border = false,
  py = 'md',
}: SectionProps) {
  const bgClass = {
    base: 'bg-background',
    surface: 'bg-surface',
    none: '',
  }[bg];

  const pyClass = {
    sm: 'py-10',
    md: 'py-12 md:py-14',
    lg: 'py-16 md:py-20',
  }[py];

  const borderClass = border ? 'border-y border-line' : '';

  return (
    <section className={`${bgClass} ${borderClass} ${pyClass} ${className}`}>
      {children}
    </section>
  );
}
