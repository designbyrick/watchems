// ISR: rendered on demand, cached up to a day. force-static lets lib/db's no-store fetch run during
// static generation; middleware.ts serves these paths with the nonce-free CSP (isStaticPublicPath).
export const dynamic = 'force-static'
export const revalidate = 86400 // 1 day; writes purge it early via lib/revalidatePublic
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

// Internal target of /brand/[brand]?model=… — middleware.ts rewrites the query string to this
// path so each model filter gets its own cache entry. The public URL keeps ?model=, and the
// canonical stays /brand/[brand].
import type { Metadata } from 'next'
import { brandMetadata, BrandView } from '../../brandView'

type BrandModelPageProps = { params: Promise<{ brand: string; model: string }> }

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function generateMetadata(props: BrandModelPageProps): Promise<Metadata> {
  const { brand } = await props.params
  return brandMetadata(brand)
}

export default async function BrandModelPage(props: BrandModelPageProps) {
  const { brand, model } = await props.params
  return <BrandView brand={brand} requestedModel={safeDecode(model)} />
}
