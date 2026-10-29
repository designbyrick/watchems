'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

interface ProfileClientProps {
  userId: string
  displayName: string
  firstName: string
  lastName: string
  username: string
  avatarUrl: string | null
  email: string
}

export default function ProfileClient({
  userId,
  displayName,
  firstName: initialFirst,
  lastName: initialLast,
  username,
  avatarUrl: initialAvatar,
  email,
}: ProfileClientProps) {
  const { user, isLoaded } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [firstName, setFirstName] = useState(initialFirst)
  const [lastName, setLastName] = useState(initialLast)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const profileHref = username ? `/u/${username}` : `/profile/${userId}`

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      await user.setProfileImage({ file })
      // Refresh to get the new URL
      await user.reload()
      setAvatarUrl(user.imageUrl)
    } catch (err) {
      console.error('Failed to upload avatar:', err)
      alert('Failed to upload image. Please try a smaller file.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return
    if (!confirm('Remove your profile photo?')) return
    setUploading(true)
    try {
      await user.setProfileImage({ file: null })
      await user.reload()
      setAvatarUrl(null)
    } catch (err) {
      console.error('Failed to remove avatar:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveName() {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to update name:', err)
    } finally {
      setSaving(false)
    }
  }

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const card = 'bg-surface border border-line rounded-[10px] p-5 sm:p-6'
  const label = 'font-mono text-[11px] tracking-[1px] uppercase text-muted'
  const input = 'w-full h-11 px-3 bg-surface border border-line rounded-md text-[15px] text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink'
  const outlineBtn = 'inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[15px] font-medium text-ink hover:bg-subtle transition-colors disabled:opacity-50'

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-16">
      <h1 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">Profile</h1>
      <p className="mt-2 text-[15px] text-muted">How you appear next to your wrist shots.</p>

      <div className="mt-8 max-w-[720px] space-y-4">
        {/* Avatar section */}
        <section className={card}>
          <h2 className={label}>Profile photo</h2>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-ink text-white flex items-center justify-center text-2xl font-semibold">
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-surface/70 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || !isLoaded}
                  className={outlineBtn}
                >
                  {avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploading || !isLoaded}
                    className="h-11 px-2 text-[15px] font-medium text-muted hover:text-mark transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[13px] text-faint">JPG, PNG, or WebP. Max 10MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
        </section>

        {/* Name section */}
        <section className={card}>
          <h2 className={label}>Display name</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-first-name" className="block text-[13px] text-muted mb-1.5">First name</label>
              <input
                id="profile-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={input}
                maxLength={50}
              />
            </div>
            <div>
              <label htmlFor="profile-last-name" className="block text-[13px] text-muted mb-1.5">Last name</label>
              <input
                id="profile-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={input}
                maxLength={50}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveName}
              disabled={saving || !isLoaded}
              className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[15px] font-semibold text-white hover:bg-ink-hover transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <span className="text-sm font-medium text-winner">Saved</span>}
          </div>
        </section>

        {/* Info section */}
        <section className={card}>
          <h2 className={label}>Account</h2>
          <dl className="mt-4 divide-y divide-line text-[15px]">
            <div className="flex items-center justify-between gap-4 pb-3">
              <dt className="text-muted">Email</dt>
              <dd className="text-ink truncate">{email}</dd>
            </div>
            {username && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">Username</dt>
                <dd className="font-mono text-sm text-ink truncate">@{username}</dd>
              </div>
            )}
          </dl>
          <Link href="/dashboard/account" className={`${outlineBtn} mt-4`}>
            Account settings
          </Link>
          <p className="mt-2 text-[13px] text-faint">Email, password and connected accounts.</p>
        </section>

        {/* Public profile link */}
        <section className={card}>
          <h2 className={label}>Public profile</h2>
          <p className="mt-3 text-[15px] text-muted">
            Your public profile shows your approved wrist shots and is visible to everyone.
          </p>
          <Link href={profileHref} className={`${outlineBtn} mt-4`}>
            View your public profile
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5H19.5V10.5M19.5 4.5L10.5 13.5M18 13.5V18a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 18V7.5A1.5 1.5 0 016 6h4.5" />
            </svg>
          </Link>
        </section>
      </div>
    </div>
  )
}
