'use client'

import { useState } from 'react'
import { tb } from '@/lib/styles'

export interface RankEntry {
  rank: number
  brand: string
  model: string
  price: string
  caseSize: string
  thickness: string
  movement: string
  crystal: string
  wr: string
  url?: string
}

interface RankingTableProps {
  rows: RankEntry[]
  initialCount?: number
}

type SortKey = 'rank' | 'model' | 'price' | 'caseSize' | 'thickness' | 'crystal' | 'wr'
type SortDir = 'asc' | 'desc'

function parseMm(val: string): number {
  return parseFloat(val.replace('mm', '')) || 0
}

function parsePrice(val: string): number {
  return parseFloat(val.replace(/[^0-9.]/g, '')) || 0
}

function parseWr(val: string): number {
  return parseFloat(val.replace(/[^0-9.]/g, '')) || 0
}

function sortRows(rows: RankEntry[], key: SortKey, dir: SortDir): RankEntry[] {
  const sorted = [...rows].sort((a, b) => {
    let av: number | string
    let bv: number | string
    if (key === 'rank') { av = a.rank; bv = b.rank }
    else if (key === 'model') { av = a.model.toLowerCase(); bv = b.model.toLowerCase() }
    else if (key === 'price') { av = parsePrice(a.price); bv = parsePrice(b.price) }
    else if (key === 'caseSize') { av = parseMm(a.caseSize); bv = parseMm(b.caseSize) }
    else if (key === 'thickness') { av = parseMm(a.thickness); bv = parseMm(b.thickness) }
    else if (key === 'crystal') { av = a.crystal.toLowerCase(); bv = b.crystal.toLowerCase() }
    else { av = parseWr(a.wr); bv = parseWr(b.wr) }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
  return sorted
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col ml-1 opacity-40 group-hover:opacity-100 transition-opacity">
      <svg className={`w-2.5 h-2.5 -mb-0.5 ${active && dir === 'asc' ? 'opacity-100 text-ink' : ''}`} viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 0L10 6H0z" />
      </svg>
      <svg className={`w-2.5 h-2.5 ${active && dir === 'desc' ? 'opacity-100 text-ink' : ''}`} viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 6L0 0h10z" />
      </svg>
    </span>
  )
}

export function CopyCell({ brand, model }: { brand: string; model: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(model).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="group/copy flex items-center gap-1.5 text-left w-full"
      title={`Copy "${model}"`}
    >
      <span>
        <span className="text-faint font-normal mr-1.5">{brand}</span>
        {model.replace(brand + ' ', '')}
      </span>
      <span className="opacity-0 group-hover/copy:opacity-100 transition-opacity shrink-0">
        {copied ? (
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </span>
    </button>
  )
}

export function RankingTable({ rows, initialCount = 25 }: RankingTableProps) {
  const [expanded, setExpanded] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortRows(rows, sortKey, sortDir)
  const visible = expanded ? sorted : sorted.slice(0, initialCount)
  const remaining = rows.length - initialCount

  function thProps(key: SortKey, className: string) {
    const active = sortKey === key
    return {
      scope: 'col' as const,
      onClick: () => handleSort(key),
      className: `group cursor-pointer select-none ${className} ${active ? 'text-ink' : ''}`,
    }
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-line shadow-sm">
        <table className="w-full text-sm border-collapse bg-surface">
          <caption className="sr-only">Top 20 watches under $500 — community ranking</caption>
          <thead>
            <tr className="bg-canvas border-b border-line">
              <th {...thProps('rank', `px-3 py-3.5 text-center ${tb.header} whitespace-nowrap w-10`)}>
                # <SortIcon active={sortKey === 'rank'} dir={sortDir} />
              </th>
              <th {...thProps('model', `sticky left-0 z-10 bg-canvas px-4 py-3.5 text-left ${tb.header} whitespace-nowrap border-l border-r border-line`)}>
                Brand &amp; Model <SortIcon active={sortKey === 'model'} dir={sortDir} />
              </th>
              <th {...thProps('price', `px-4 py-3.5 text-right ${tb.header} whitespace-nowrap`)}>
                Price <SortIcon active={sortKey === 'price'} dir={sortDir} />
              </th>
              <th {...thProps('caseSize', `px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden sm:table-cell`)}>
                Case <SortIcon active={sortKey === 'caseSize'} dir={sortDir} />
              </th>
              <th {...thProps('thickness', `px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden md:table-cell`)}>
                Thick <SortIcon active={sortKey === 'thickness'} dir={sortDir} />
              </th>
              <th scope="col" className={`px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden lg:table-cell`}>
                Movement
              </th>
              <th {...thProps('crystal', `px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden md:table-cell`)}>
                Crystal <SortIcon active={sortKey === 'crystal'} dir={sortDir} />
              </th>
              <th {...thProps('wr', `px-4 py-3.5 text-left ${tb.header} whitespace-nowrap hidden sm:table-cell`)}>
                WR <SortIcon active={sortKey === 'wr'} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((row) => (
              <tr key={row.rank} className="hover:bg-canvas transition-colors">
                <td className={`px-3 py-3 text-center ${tb.cell} tabular-nums text-faint`}>{row.rank}</td>
                <td className={`sticky left-0 z-10 px-4 py-3 bg-surface hover:bg-canvas transition-colors ${tb.cellStrong} whitespace-nowrap border-l border-r border-line`}>
                  <CopyCell brand={row.brand} model={row.model} />
                </td>
                <td className={`px-4 py-3 ${tb.cellStrong} whitespace-nowrap tabular-nums text-right`}>{row.price}</td>
                <td className={`px-4 py-3 ${tb.cell} hidden sm:table-cell whitespace-nowrap`}>{row.caseSize}</td>
                <td className={`px-4 py-3 ${tb.cell} hidden md:table-cell whitespace-nowrap tabular-nums`}>{row.thickness}</td>
                <td className={`px-4 py-3 ${tb.cell} hidden lg:table-cell`}>{row.movement}</td>
                <td className={`px-4 py-3 ${tb.cell} hidden md:table-cell whitespace-nowrap`}>{row.crystal}</td>
                <td className={`px-4 py-3 ${tb.cell} hidden sm:table-cell whitespace-nowrap`}>{row.wr}</td>
              </tr>
            ))}
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
