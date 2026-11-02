'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { withPostHog } from '@/lib/posthog'

/**
 * Links PostHog events to the signed-in Clerk user and clears the identity on
 * sign-out. Only rendered inside <ClerkProvider> (see app/layout.tsx).
 */
export default function PostHogIdentify() {
  const { user, isLoaded, isSignedIn } = useUser()
  const identifiedId = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn && user && identifiedId.current !== user.id) {
      identifiedId.current = user.id
      withPostHog((posthog) =>
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName ?? user.username ?? undefined,
        })
      )
    } else if (!isSignedIn && identifiedId.current) {
      identifiedId.current = null
      withPostHog((posthog) => posthog.reset())
    }
  }, [isLoaded, isSignedIn, user])

  return null
}
