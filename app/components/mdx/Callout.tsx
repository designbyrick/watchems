import { ReactNode } from 'react'

interface CalloutProps {
  type?: 'tip' | 'warning' | 'info'
  title?: string
  children: ReactNode
}

const config = {
  tip: {
    icon: '💡',
    border: 'border-green-400',
    bg: 'bg-green-50',
    titleColor: 'text-green-800',
  },
  warning: {
    icon: '⚠️',
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    titleColor: 'text-amber-800',
  },
  info: {
    icon: 'ℹ️',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
    titleColor: 'text-blue-800',
  },
}

export default function Callout({ type = 'info', title, children }: CalloutProps) {
  const { icon, border, bg, titleColor } = config[type]

  return (
    <div className={`${bg} ${border} border-l-4 rounded-r-sm p-4 my-6`}>
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5" role="img" aria-hidden>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`font-semibold ${titleColor} text-sm mb-1`}>{title}</p>
          )}
          <div className="text-sm text-muted leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
