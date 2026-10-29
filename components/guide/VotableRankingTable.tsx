'use client'

import { useEffect, useState, useTransition } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import { tb } from '@/lib/styles'
import type { RankEntry } from '@/components/guide/RankingTable'
import { CopyCell } from '@/components/guide/RankingTable'

function toWatchKey(brand: string, model: string) {
  return `${brand}:${model}`.toLowerCase()
}

interface VoteState {
  counts: Record<string, number>
  userVote: string | null
}

interface Props {
  rows: RankEntry[]
  guideSlug: string
  initialCount?: number
}

export function VotableRankingTable({ rows, guideSlug, initialCount }: Props) {
  const { isSignedIn, isLoaded } = useUser()
  const [voteState, setVoteState] = useState<VoteState>({ counts: {}, userVote: null })
  const [isPending, startTransition] = useTransition()
  const [optimisticVote, setOptimisticVote] = useState<string | null | undefined>(undefined) // undefined = not yet loaded

  useEffect(() => {
    fetch(`/api/guide-votes?slug=${guideSlug}`)
      .then((r) => r.json())
      .then((data: VoteState) => {
        setVoteState(data)
        setOptimisticVote(data.userVote)
      })
  }, [guideSlug])

  function handleVote(brand: string, model: string) {
    if (!isSignedIn) return
    const watchKey = toWatchKey(brand, model)
    const prev = optimisticVote ?? null

    // Optimistic update
    const isDeselect = prev === watchKey
    setOptimisticVote(isDeselect ? null : watchKey)
    setVoteState((s) => {
      const counts = { ...s.counts }
      if (prev) counts[prev] = Math.max(0, (counts[prev] ?? 1) - 1)
      if (!isDeselect) counts[watchKey] = (counts[watchKey] ?? 0) + 1
      return { counts, userVote: isDeselect ? null : watchKey }
    })

    startTransition(async () => {
      try {
        const res = await fetch('/api/guide-votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guideSlug, watchKey }),
        })
        const data = await res.json() as { action: string; watchKey: string | null }
        setOptimisticVote(data.watchKey)
        // Refresh counts from server
        const fresh = await fetch(`/api/guide-votes?slug=${guideSlug}`).then((r) => r.json()) as VoteState
        setVoteState(fresh)
      } catch {
        // Revert on error
        setOptimisticVote(prev)
        setVoteState((s) => ({ ...s, userVote: prev }))
      }
    })
  }

  const currentVote = optimisticVote !== undefined ? optimisticVote : voteState.userVote
  const totalVotes = Object.values(voteState.counts).reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* Vote prompt */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {!isLoaded ? null : isSignedIn ? (
          <p className="text-xs text-faint">
            {currentVote
              ? 'Your favourite is highlighted. Click it again to remove your vote, or pick another.'
              : 'Click any watch to vote for your favourite from this list.'}
          </p>
        ) : (
          <p className="text-xs text-faint flex items-center gap-1.5">
            <SignInButton mode="modal">
              <button className="text-muted underline underline-offset-2 hover:text-ink transition-colors">
                Sign in
              </button>
            </SignInButton>
            {' '}to vote for your favourite watch from this list.
            {totalVotes > 0 && <span className="text-faint">({totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} so far)</span>}
          </p>
        )}
      </div>

      <VotableTable
        rows={rows}
        guideSlug={guideSlug}
        initialCount={initialCount}
        voteCounts={voteState.counts}
        userVote={currentVote}
        isSignedIn={!!isSignedIn}
        isPending={isPending}
        onVote={handleVote}
      />
    </div>
  )
}

// ─── Inner table with vote UI ────────────────────────────────────────────────

interface VotableTableProps {
  rows: RankEntry[]
  guideSlug: string
  initialCount?: number
  voteCounts: Record<string, number>
  userVote: string | null
  isSignedIn: boolean
  isPending: boolean
  onVote: (brand: string, model: string) => void
}

function VotableTable({ rows, initialCount = 25, voteCounts, userVote, isSignedIn, isPending, onVote }: VotableTableProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? rows : rows.slice(0, initialCount)
  const remaining = rows.length - initialCount

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-line shadow-sm">
        <table className="w-full text-sm border-collapse bg-surface">
          <caption className="sr-only">Watch ranking — click a row to vote for your favourite</caption>
          <thead>
            <tr className="bg-canvas border-b border-line">
              <th scope="col" className={`px-3 py-3.5 text-center ${tb.header} whitespace-nowrap w-10`}>#</th>
              <th scope="col" className={`sticky left-0 z-10 bg-canvas px-4 py-3.5 text-left ${tb.header} whitespace-nowrap border-l border-r border-line`}>
                Brand &amp; Model
              </th>
              <th scope="col" className={`px-4 py-3.5 text-right ${tb.header} whitespace-nowrap`}>Price</th>
              <th scope="col" className={`px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden sm:table-cell`}>Case</th>
              <th scope="col" className={`px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden md:table-cell`}>Thick</th>
              <th scope="col" className={`px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden lg:table-cell`}>Movement</th>
              <th scope="col" className={`px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden md:table-cell`}>Crystal</th>
              <th scope="col" className={`px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden sm:table-cell`}>WR</th>
              <th scope="col" className={`px-3 py-3.5 text-center ${tb.header} whitespace-nowrap w-16`}>Votes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((row) => {
              const watchKey = toWatchKey(row.brand, row.model)
              const isMyVote = userVote === watchKey
              const count = voteCounts[watchKey] ?? 0

              return (
                <tr
                  key={row.rank}
                  onClick={() => isSignedIn && onVote(row.brand, row.model)}
                  className={[
                    'transition-colors',
                    isSignedIn && !isPending ? 'cursor-pointer' : '',
                    isMyVote
                      ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10'
                      : 'hover:bg-canvas',
                  ].join(' ')}
                >
                  <td className={`px-3 py-3 text-center ${tb.cell} tabular-nums text-faint`}>{row.rank}</td>
                  <td className={[
                    'sticky left-0 z-10 px-4 py-3 transition-colors whitespace-nowrap border-l border-r border-line',
                    tb.cellStrong,
                    isMyVote ? 'bg-amber-50' : 'bg-surface',
                  ].join(' ')}>
                    <span className="flex items-center gap-2">
                      {isMyVote && (
                        <span title="Your vote" aria-label="Your vote">
                          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </span>
                      )}
                      <CopyCell brand={row.brand} model={row.model} />
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${tb.cellStrong} whitespace-nowrap tabular-nums text-right`}>{row.price}</td>
                  <td className={`px-4 py-3 ${tb.cell} hidden sm:table-cell whitespace-nowrap`}>{row.caseSize}</td>
                  <td className={`px-4 py-3 ${tb.cell} hidden md:table-cell whitespace-nowrap tabular-nums`}>{row.thickness}</td>
                  <td className={`px-4 py-3 ${tb.cell} hidden lg:table-cell`}>{row.movement}</td>
                  <td className={`px-4 py-3 ${tb.cell} hidden md:table-cell whitespace-nowrap`}>{row.crystal}</td>
                  <td className={`px-4 py-3 ${tb.cell} hidden sm:table-cell whitespace-nowrap`}>{row.wr}</td>
                  <td className="px-3 py-3 text-center">
                    {count > 0 ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${isMyVote ? 'text-amber-600' : 'text-faint'}`}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {count}
                      </span>
                    ) : (
                      <span className="text-xs text-faint/30">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!expanded && remaining > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-line bg-surface hover:bg-canvas text-sm font-medium text-muted hover:text-ink transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            Show {remaining} more watches
          </button>
        </div>
      )}

      {expanded && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-line bg-surface hover:bg-canvas text-sm font-medium text-muted hover:text-ink transition-colors"
          >
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            Show less
          </button>
        </div>
      )}
    </div>
  )
}
