import { redirect } from 'next/navigation'
import { checkAdmin } from '@/lib/admin'
import AdminPhotosClient from './AdminPhotosClient'

export const dynamic = 'force-dynamic'

export default async function AdminPhotosPage() {
  let userId: string | null = null

  try {
    const { auth } = await import('@clerk/nextjs/server')
    const session = await auth()
    userId = session.userId
  } catch {
    // Clerk not configured — block access
  }

  if (!userId) redirect('/')

  if (!checkAdmin(userId)) {
    return (
      <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-16">
        <div role="alert" className="max-w-[720px] rounded-[10px] border border-line bg-surface px-5 py-6 shadow-[inset_2px_0_0_theme(colors.mark)]">
          <p className="font-mono text-[11px] tracking-[1px] uppercase text-mark">Access denied</p>
          <p className="mt-1.5 text-[15px] text-muted">This area is for Watchems admins only.</p>
        </div>
      </div>
    )
  }

  return <AdminPhotosClient />
}
