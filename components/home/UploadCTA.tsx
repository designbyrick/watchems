import Image from 'next/image'
import { CTAButton } from '@/components/CTAButton'
import { Container } from '@/components/ui/Container'
import type { ApprovedPhoto } from '@/lib/photos'

interface UploadCTAProps {
  photos: ApprovedPhoto[]
}

export default function UploadCTA({ photos }: UploadCTAProps) {
  return (
    <section className="bg-gray-50 py-12 md:py-14">
      <Container>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
            Your watch deserves a page.
          </h2>
          <p className="text-muted mb-6">
            Upload a photo. Help other buyers see the real thing.
          </p>

          {/* Example photos */}
          <div className="flex justify-center gap-3 mb-8">
            {photos.length > 0
              ? photos.slice(0, 3).map((photo) => (
                  <div
                    key={photo.id}
                    className="relative w-20 h-20 rounded-sm overflow-hidden border border-line"
                  >
                    <Image
                      src={photo.url}
                      alt="Owner photo"
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 rounded-sm bg-canvas border border-line"
                  />
                ))}
          </div>

          <CTAButton href="/upload" priority="primary" size="lg">
            Upload Your Watch Photo
          </CTAButton>
        </div>
      </Container>
    </section>
  )
}
