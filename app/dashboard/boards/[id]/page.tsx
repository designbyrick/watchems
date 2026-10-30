import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import BoardDetailClient from './BoardDetailClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Collection',
  description: 'View your saved watch photos.',
  robots: { index: false, follow: false },
}

export default async function BoardDetailPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <BoardDetailClient boardId={params.id} />
}
