'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isFuture,
  isSameMonth,
} from 'date-fns'

interface WristCheckEntry {
  id: string
  photoId: string
  date: string
  notes: string | null
  watchId: string
  brandName: string | null
  modelName: string | null
  thumbnailUrl: string | null
  url: string
}

interface UserWatch {
  photoId: string
  watchId: string
  brandName: string | null
  modelName: string | null
  thumbnailUrl: string | null
  url: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function watchName(w: { brandName: string | null; modelName: string | null }) {
  return [w.brandName, w.modelName].filter(Boolean).join(' ') || 'Watch'
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

export default function WristCheckClient() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [entries, setEntries] = useState<WristCheckEntry[]>([])
  const [watches, setWatches] = useState<UserWatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(() => format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const pickerRef = useRef<HTMLElement>(null)

  const monthKey = format(currentMonth, 'yyyy-MM')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [entriesRes, watchesRes] = await Promise.all([
        fetch(`/api/wrist-checks?month=${monthKey}`),
        fetch('/api/user/watches'),
      ])
      if (entriesRes.ok) {
        const data = await entriesRes.json()
        setEntries(data.entries)
      }
      if (watchesRes.ok) {
        const data = await watchesRes.json()
        setWatches(data.watches)
      }
    } catch (err) {
      console.error('Failed to fetch wrist check data:', err)
    } finally {
      setLoading(false)
    }
  }, [monthKey])

  useEffect(() => { fetchData() }, [fetchData])

  function changeMonth(next: Date) {
    setCurrentMonth(next)
    // Keep today selected when returning to the current month; otherwise wait for a pick
    setSelectedDate(isSameMonth(next, new Date()) ? format(new Date(), 'yyyy-MM-dd') : null)
  }

  function selectDay(dateStr: string) {
    setSelectedDate(dateStr)
    // On stacked layouts the picker sits below the calendar, so bring it into view
    if (window.matchMedia('(max-width: 1023px)').matches) {
      pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Group entries by date. A day can hold several entries; the first one is the day's watch.
  const entriesByDate = new Map<string, WristCheckEntry[]>()
  for (const entry of entries) {
    if (!entriesByDate.has(entry.date)) entriesByDate.set(entry.date, [])
    entriesByDate.get(entry.date)!.push(entry)
  }

  const selectedEntries = selectedDate ? entriesByDate.get(selectedDate) || [] : []
  const selectedEntry = selectedEntries[0] ?? null

  /** Pick a watch for the selected day: the same watch again clears it, another one replaces it. */
  async function handlePick(watch: UserWatch) {
    if (!selectedDate || saving) return
    setSaving(true)
    try {
      if (selectedEntry) {
        await fetch(`/api/wrist-checks/${selectedEntry.id}`, { method: 'DELETE' })
      }
      if (selectedEntry?.photoId !== watch.photoId) {
        await fetch('/api/wrist-checks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId: watch.photoId, date: selectedDate }),
        })
      }
      await fetchData()
    } catch (err) {
      console.error('Failed to update wrist check:', err)
    } finally {
      setSaving(false)
    }
  }

  // Calendar grid, Monday first
  const monthStart = startOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) })
  const leadingBlanks = (getDay(monthStart) + 6) % 7

  // Wear count for the month
  const wearCountByWatch = new Map<string, { count: number; name: string }>()
  for (const entry of entries) {
    const item = wearCountByWatch.get(entry.watchId) ?? { count: 0, name: watchName(entry) }
    item.count++
    wearCountByWatch.set(entry.watchId, item)
  }
  const wearList = Array.from(wearCountByWatch.entries())
    .map(([watchId, v]) => ({ watchId, ...v }))
    .sort((a, b) => b.count - a.count)
  const maxCount = wearList[0]?.count ?? 1

  const selectedLabel = selectedDate
    ? `${selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'Today · ' : ''}${format(new Date(selectedDate + 'T12:00:00'), 'MMMM d')}`
    : format(currentMonth, 'MMMM yyyy')

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10 lg:pb-16">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[40px]">Wrist Check</h1>
      <p className="mt-2 text-[15px] text-muted">Daily wear log. Pick a day, then the watch you wore.</p>

      {watches.length === 0 && !loading ? (
        <div className="mt-7 flex max-w-2xl flex-col items-center rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-[17px] font-semibold text-ink">No watches to log yet</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted">Once one of your wrist shots is approved, it shows up here so you can log the days you wear it.</p>
          <Link
            href="/upload"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-hover"
          >
            Add a wrist shot
          </Link>
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
          {/* Calendar */}
          <section
            aria-label={format(currentMonth, 'MMMM yyyy')}
            className="min-w-0 rounded-[10px] border border-line bg-surface p-3 sm:p-5 lg:flex-[2_1_520px]"
          >
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">{format(currentMonth, 'MMMM yyyy')}</h2>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => changeMonth(subMonths(currentMonth, 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-subtle"
                  aria-label="Previous month"
                >
                  <ChevronIcon dir="left" />
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(addMonths(currentMonth, 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-subtle"
                  aria-label="Next month"
                >
                  <ChevronIcon dir="right" />
                </button>
              </div>
            </div>

            <div className="mb-1.5 grid grid-cols-7 gap-1 font-mono text-[10px] uppercase tracking-[1px] text-muted sm:gap-1.5 sm:text-[11px]" aria-hidden="true">
              {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
            </div>

            {loading ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-md bg-subtle" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {[...Array(leadingBlanks)].map((_, i) => (
                  <span key={`blank-${i}`} className="aspect-square" />
                ))}
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const entry = entriesByDate.get(dateStr)?.[0]
                  const future = isFuture(day)
                  const selected = selectedDate === dateStr
                  const ring = selected ? 'border-mark' : future ? 'border-canvas' : 'border-line'
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => selectDay(dateStr)}
                      disabled={future}
                      aria-pressed={selected}
                      aria-label={`${format(day, 'MMMM d')}${isToday(day) ? ', today' : ''}${entry ? `, ${watchName(entry)}` : ''}`}
                      className={`relative aspect-square overflow-hidden rounded-md border-2 bg-canvas p-0 text-ink transition-colors ${ring} ${future ? 'cursor-default' : 'hover:border-ink'} ${selected ? 'hover:!border-mark' : ''}`}
                    >
                      {entry && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.thumbnailUrl || entry.url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      <span
                        className={`absolute left-0.5 top-0.5 rounded-sm px-1 py-px font-mono text-[11px] font-medium leading-tight sm:left-1.5 sm:top-[5px] sm:text-xs ${entry ? 'bg-white/90' : ''} ${future ? 'text-faint' : 'text-ink'} ${isToday(day) && !entry ? 'underline decoration-mark decoration-2 underline-offset-2' : ''}`}
                      >
                        {format(day, 'd')}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="flex min-w-0 flex-col gap-5 lg:flex-[1_1_300px]">
            {/* Day picker */}
            <section ref={pickerRef} className="scroll-mt-24 rounded-[10px] border border-line bg-surface p-5">
              <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted">{selectedLabel}</p>
              <h2 className="mb-3.5 mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink">What did you wear?</h2>
              {selectedDate ? (
                <>
                  <div className="grid max-h-[360px] grid-cols-3 gap-2 overflow-y-auto">
                    {watches.map((watch) => {
                      const chosen = selectedEntry?.photoId === watch.photoId
                      return (
                        <button
                          key={watch.photoId}
                          type="button"
                          onClick={() => handlePick(watch)}
                          disabled={saving}
                          aria-pressed={chosen}
                          aria-label={watchName(watch)}
                          title={chosen ? `${watchName(watch)} (tap again to clear)` : watchName(watch)}
                          className={`aspect-square overflow-hidden rounded-md border-2 p-0 transition-colors disabled:opacity-60 ${chosen ? 'border-mark' : 'border-transparent hover:border-ink'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={watch.thumbnailUrl || watch.url} alt="" className="block h-full w-full object-cover" />
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">
                    {selectedEntry ? watchName(selectedEntry) : 'Nothing logged yet'}
                  </p>
                  {selectedEntries.length > 1 && (
                    <p className="mt-1 font-mono text-xs text-muted">+{selectedEntries.length - 1} more logged this day</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">Pick a day on the calendar.</p>
              )}
            </section>

            {/* Wear count */}
            <section className="rounded-[10px] border border-line bg-surface p-5">
              <h2 className="mb-3.5 text-xl font-semibold tracking-[-0.02em] text-ink">Wear Count</h2>
              {wearList.length === 0 ? (
                <p className="text-sm text-muted">Nothing logged in {format(currentMonth, 'MMMM')} yet.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {wearList.map((item, i) => (
                    <li key={item.watchId}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-medium text-ink">{item.name}</span>
                        <span className="shrink-0 font-mono text-ink">{item.count} {item.count === 1 ? 'day' : 'days'}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
                        <div
                          className={`h-full rounded-full ${i === 0 ? 'bg-mark' : 'bg-ink'}`}
                          style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
