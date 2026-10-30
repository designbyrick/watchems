import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'article';
}

export function Card({
  children,
  className = '',
  hover = false,
  as: Component = 'div',
}: CardProps) {
  const hoverClass = hover ? 'hover:shadow-sm transition-all duration-200' : '';
  const borderClass = 'border border-canvas';

  return React.createElement(
    Component,
    {
      className: `bg-surface ${borderClass} rounded-sm ${hoverClass} ${className}`,
    },
    children
  );
}
