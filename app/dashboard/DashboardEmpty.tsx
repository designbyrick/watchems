import Link from 'next/link'

interface DashboardEmptyProps {
  title: string
  message: string
  actionUrl: string
  actionText: string
}

export default function DashboardEmpty({ title, message, actionUrl, actionText }: DashboardEmptyProps) {
  return (
    <div className="mt-8 rounded-[10px] border border-dashed border-line-strong px-6 py-14 sm:py-20 text-center">
      <h2 className="text-xl font-semibold tracking-[-0.4px] text-ink">{title}</h2>
      <p className="mt-2 mx-auto max-w-sm text-[15px] text-muted">{message}</p>
      <Link
        href={actionUrl}
        className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[15px] font-semibold text-white hover:bg-ink-hover transition-colors"
      >
        {actionText}
      </Link>
    </div>
  )
}
