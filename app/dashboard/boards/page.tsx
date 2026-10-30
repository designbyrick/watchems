import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import BoardsClient from './BoardsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Manage your saved watch photo collections.',
  robots: { index: false, follow: false },
}

export default async function BoardsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <BoardsClient />
}
