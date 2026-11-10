import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { ensureTermsAccepted } from '@/lib/requireTerms'
import UploadClient from './UploadClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Upload Your Watch Photo',
  description: 'Share a photo of your watch. Real wrist shots from real owners.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://watchems.com/upload',
  },
}

export default async function UploadPage() {
  const { userId } = await auth()
  if (userId) await ensureTermsAccepted(userId)

  return <UploadClient />
}
