'use client'

import { useState, useRef } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface CropModalProps {
  imageSrc: string
  onConfirm: (croppedFile: File, croppedDataUrl: string) => void
  onCancel: () => void
}

export default function CropModal({ imageSrc, onConfirm, onCancel }: CropModalProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // When the image loads, compute initial pixel crop from the percentage defaults
  // so "Crop & Use Photo" works even without user interaction
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCompletedCrop({
      unit: 'px',
      x: Math.round(width * (crop.x ?? 0) / 100),
      y: Math.round(height * (crop.y ?? 0) / 100),
      width: Math.round(width * (crop.width ?? 80) / 100),
      height: Math.round(height * (crop.height ?? 80) / 100),
    })
  }

  function handleCrop() {
    if (!imgRef.current || !completedCrop) return

    const img = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Scale factor: completedCrop is in display pixels, but drawImage needs natural image pixels
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    const cropX = completedCrop.x * scaleX
    const cropY = completedCrop.y * scaleY
    const cropW = completedCrop.width * scaleX
    const cropH = completedCrop.height * scaleY

    // Set canvas size to the real crop dimensions
    canvas.width = cropW
    canvas.height = cropH

    // Draw the cropped image using natural pixel coordinates
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    )

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) return

      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

      onConfirm(file, dataUrl)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
      className="fixed inset-0 bg-ink/70 z-[60] flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-surface rounded-[10px] border border-line w-full max-w-sm sm:max-w-lg shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 px-[18px] py-3.5 border-b border-line">
          <p className="font-mono text-xs tracking-[1px] uppercase text-muted">Primary photo</p>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="-mr-2 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-subtle transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="p-[18px]">
          <h2 id="crop-title" className="text-[22px] font-semibold tracking-[-0.4px] text-ink mb-4">Crop your photo</h2>
          <div className="rounded-lg overflow-hidden bg-subtle flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc.startsWith('/') || imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')
                  ? imageSrc
                  : `/api/image-proxy?url=${encodeURIComponent(imageSrc)}`}
                alt="Image to crop"
                onLoad={handleImageLoad}
                style={{ maxHeight: '60vh' }}
                className="w-full object-contain"
              />
            </ReactCrop>
          </div>
        </div>

        <div className="flex gap-2.5 justify-end px-[18px] pb-[18px]">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-5 rounded-full border border-line hover:border-line-strong text-ink text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="h-11 px-5 rounded-full bg-ink hover:bg-ink-hover text-white text-sm font-semibold transition-colors"
          >
            Crop and use photo
          </button>
        </div>
      </div>
    </div>
  )
}
