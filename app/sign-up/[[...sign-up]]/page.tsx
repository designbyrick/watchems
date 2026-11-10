import type { Metadata } from 'next'
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sign Up',
  robots: { index: false, follow: true },
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <SignUp />
      <p className="mt-4 max-w-sm text-center text-xs text-gray-400 leading-relaxed">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-gray-500 underline hover:text-gray-700">
          Terms of Use
        </Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-gray-500 underline hover:text-gray-700">
          Privacy Policy
        </Link>
        . Photos you upload may be featured on our social media with credit.
      </p>
    </div>
  )
}
