import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'

type Call = { method: string; args: unknown[] }

/** One recorded query: the builder op (`select`, `update`, ...) plus every chained call. */
export type RecordedQuery = { op: string; calls: Call[] }

const queries: RecordedQuery[] = []
const results: unknown[] = []

/**
 * Starts a fake Drizzle builder. Every chained method is recorded and returns the
 * same chain; awaiting it resolves to the next queued result (or `[]`).
 */
function start(op: string) {
  return (...args: unknown[]) => {
    const query: RecordedQuery = { op, calls: [{ method: op, args }] }
    queries.push(query)
    let settled: Promise<unknown> | null = null
    const chain: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            settled ??= Promise.resolve(results.length > 0 ? results.shift() : [])
            return settled.then.bind(settled)
          }
          return (...callArgs: unknown[]) => {
            query.calls.push({ method: String(prop), args: callArgs })
            return chain
          }
        },
      }
    )
    return chain
  }
}

/** Shared fake used by `vi.mock('@/lib/db', ...)` factories and by the tests. */
export const fakeDb = {
  db: {
    select: start('select'),
    insert: start('insert'),
    update: start('update'),
    delete: start('delete'),
  },
  queries,
  /** Queue the result of the next awaited query, in await order. */
  queueResult(result: unknown) {
    results.push(result)
  },
  reset() {
    queries.length = 0
    results.length = 0
  },
  /** First argument of the first `method` call on a query. */
  arg(query: RecordedQuery | undefined, method: string): unknown {
    return query?.calls.find((c) => c.method === method)?.args[0]
  },
}

const dialect = new PgDialect()

/** Renders a Drizzle SQL fragment (e.g. a `where` condition) to `{ sql, params }`. */
export function renderSql(fragment: unknown) {
  return dialect.sqlToQuery(fragment as SQL)
}
