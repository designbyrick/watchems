// ISR: rendered on demand, cached up to a day. force-static lets lib/db's no-store fetch run during
// static generation; middleware.ts serves these paths with the nonce-free CSP (isStaticPublicPath).
export const dynamic = 'force-static'
export const revalidate = 86400 // 1 day; writes purge it early via lib/revalidatePublic
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

import type { Metadata } from 'next'
import { brandMetadata, BrandView } from './brandView'

type BrandPageProps = { params: Promise<{ brand: string }> }

export async function generateMetadata(props: BrandPageProps): Promise<Metadata> {
  const { brand } = await props.params
  return brandMetadata(brand)
}

export default async function BrandPage(props: BrandPageProps) {
  const { brand } = await props.params
  return <BrandView brand={brand} />
}
