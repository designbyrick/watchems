import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Read-only client for ISR routes (sitemaps). The main client in ./index forces
// cache: 'no-store', which makes any route that uses it dynamic. This one lets
// Next cache the query for `revalidate` seconds, so the route can be ISR.
const clients = new Map<number, ReturnType<typeof drizzle<typeof schema>>>()

export function getIsrDb(revalidate: number) {
  const existing = clients.get(revalidate)
  if (existing) return existing
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const client = drizzle(neon(DATABASE_URL, { fetchOptions: { next: { revalidate } } }), { schema })
  clients.set(revalidate, client)
  return client
}
