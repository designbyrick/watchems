'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function AcceptTermsClient() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    router.replace('/sign-in')
    return null
  }

  async function handleAccept() {
    if (!agreed) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/user/accept-terms', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to save')
      router.replace('/upload')
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Watchems</h1>
        <p className="text-gray-500 text-sm mb-6">
          Before you upload your first watch photo, please review and accept our community guidelines.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3 text-sm text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-900">By using Watchems, you agree that:</p>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-green-500 shrink-0 mt-0.5">✓</span>
              Photos you upload are yours — you took them or have permission to share them.
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 shrink-0 mt-0.5">✓</span>
              You own the copyright to your photos. Watchems does not claim ownership.
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 shrink-0 mt-0.5">✓</span>
              Watchems may display, resize, and feature your photos in the gallery and on social media — always with credit to you.
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 shrink-0 mt-0.5">✓</span>
              You can request removal of your photos at any time.
            </li>
          </ul>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the{' '}
            <Link href="/terms" target="_blank" className="text-blue-600 hover:text-blue-700 underline">
              Terms of Use
            </Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700 underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="button"
          onClick={handleAccept}
          disabled={!agreed || submitting}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-900 text-white hover:bg-gray-800"
        >
          {submitting ? 'Saving...' : 'Accept & Continue'}
        </button>
      </div>
    </div>
  )
}
