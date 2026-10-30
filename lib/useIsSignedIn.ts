'use client'

import { useAuth } from '@clerk/nextjs'

/* Clerk is only rendered when the publishable key is configured in Vercel env vars */
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

function useClerkSignedIn() {
  return !!useAuth().isSignedIn
}

function useNoClerk() {
  return false
}

/** Clerk hooks throw outside <ClerkProvider>, which isn't mounted without keys (e.g. Preview). */
export const useIsSignedIn = clerkEnabled ? useClerkSignedIn : useNoClerk
