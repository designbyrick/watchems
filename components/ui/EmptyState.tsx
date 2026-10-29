import Link from 'next/link'

interface EmptyStateProps {
  icon?: string
  title: string
  message?: string
  actionUrl?: string
  actionText?: string
  actionStyle?: 'gold' | 'blue' | 'link'
  onAction?: () => void
}

export default function EmptyState({
  icon,
  title,
  message,
  actionUrl,
  actionText,
  actionStyle = 'gold',
  onAction,
}: EmptyStateProps) {
  const btnClass =
    actionStyle === 'blue'
      ? 'inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm sm:text-base'
      : actionStyle === 'link'
        ? 'inline-block text-ink hover:text-ink-hover font-medium transition-colors'
        : 'btn-gold'

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
      {icon && <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">{icon}</div>}
      <h3 className="text-xl sm:text-2xl font-bold text-ink mb-2">{title}</h3>
      {message && <p className="text-muted mb-6 text-sm sm:text-base">{message}</p>}
      {actionUrl && actionText && (
        <Link href={actionUrl} className={btnClass}>
          {actionText}
        </Link>
      )}
      {!actionUrl && onAction && actionText && (
        <button type="button" onClick={onAction} className={btnClass}>
          {actionText}
        </button>
      )}
    </div>
  )
}
