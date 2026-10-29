import AcceptTermsClient from './AcceptTermsClient'

// ClerkProvider is only mounted when the publishable key is set (see app/layout.tsx),
// so useUser() would throw during prerender in environments without it.
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function AcceptTermsPage() {
  if (clerkEnabled) return <AcceptTermsClient />

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <p className="font-mono text-[13px] tracking-[0.5px] uppercase text-muted">
        Sign-in is not configured in this environment.
      </p>
    </div>
  )
}
