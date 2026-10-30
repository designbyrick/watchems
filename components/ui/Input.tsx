import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = '', ...rest }: InputProps) {
  return (
    <input
      className={`w-full bg-canvas border border-line-strong rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ink transition-colors ${className}`}
      {...rest}
    />
  );
}
