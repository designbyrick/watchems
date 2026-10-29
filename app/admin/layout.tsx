import type { Metadata } from 'next'
import { ReactNode } from 'react'
import AdminNav from './AdminNav'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[1320px] w-full mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-72px)]">
      <AdminNav />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
