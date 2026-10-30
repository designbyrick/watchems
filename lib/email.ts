import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// ---------------------------------------------------------------------------
// Resend template aliases (managed in the Resend dashboard)
// ---------------------------------------------------------------------------
const TEMPLATES = {
  photoApproved: 'watch-photo-live',
  photoRejected: 'photo-rejected',
} as const


// ---------------------------------------------------------------------------
// Rejection email
// ---------------------------------------------------------------------------

interface PhotoRejectionData {
  firstName?: string
  brandName?: string
  modelName?: string
  referenceNumber?: string
  imageUrl?: string
  reasonLabel: string
  reasonDescription: string
  customNote?: string
  /** Total number of photos the user submitted for this watch (used to show context in email) */
  photoCount?: number
}

export async function sendPhotoRejectedEmail(
  to: string,
  data: PhotoRejectionData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] Missing RESEND_API_KEY — skipping rejection email')
    return { success: false, error: 'Resend not configured' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Watchems <onboarding@resend.dev>'
  const watchName = [data.brandName, data.modelName].filter(Boolean).join(' ') || 'your photo'
  const count = data.photoCount ?? 1
  const subject = count > 1
    ? `One of your ${watchName} photos wasn't approved`
    : `Your ${watchName} photo wasn't approved`

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      template: {
        id: TEMPLATES.photoRejected,
        variables: {
          firstName: data.firstName || 'there',
          brand: data.brandName || '',
          model: data.modelName || '',
          reference: data.referenceNumber || '',
          imageUrl: data.imageUrl || '',
          reasonLabel: data.reasonLabel,
          reasonDescription: data.reasonDescription || '',
          customNote: data.customNote || '',
          photoCountNote: count > 1 ? `1 of your ${count} ${watchName} photos was rejected.` : '',
        },
      },
    })
    if (error) {
      console.error(`[Resend] Failed to send rejection email to ${to}:`, error)
      return { success: false, error: error.message }
    }
    console.log(`[Resend] Rejection email sent to ${to}`)
    return { success: true }
  } catch (err) {
    console.error('[Resend] Error sending rejection email:', err)
    return { success: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Approval email — single photo (uses Resend template)
// ---------------------------------------------------------------------------

interface PhotoApprovalData {
  firstName?: string
  brandName?: string
  modelName?: string
  referenceNumber?: string
  slug?: string
  imageUrl?: string
}

export async function sendPhotoApprovedEmail(
  to: string,
  data: PhotoApprovalData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] Missing RESEND_API_KEY — skipping email')
    return { success: false, error: 'Resend not configured' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Watchems <onboarding@resend.dev>'
  const watchName = [data.brandName, data.modelName].filter(Boolean).join(' ') || 'your watch'

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Your ${watchName} photo is live on Watchems!`,
      template: {
        id: TEMPLATES.photoApproved,
        variables: {
          firstName: data.firstName || 'there',
          slug: data.slug || '',
          imageUrl: data.imageUrl || '',
          brand: data.brandName || '',
          model: data.modelName || '',
          reference: data.referenceNumber || '',
        },
      },
    })

    if (error) {
      console.error(`[Resend] Failed to send to ${to}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[Resend] Photo approval email sent to ${to}`)
    return { success: true }
  } catch (err) {
    console.error('[Resend] Error sending email:', err)
    return { success: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Approval email — bulk (multiple photos approved at once)
// ---------------------------------------------------------------------------

interface BulkPhotoApprovalData {
  firstName?: string
  // One entry per watch (grouped). photoCount = total photos approved for that watch.
  photos: Array<{
    brandName?: string
    modelName?: string
    referenceNumber?: string
    slug?: string
    imageUrl?: string   // first photo only
    photoCount?: number
  }>
}

/**
 * Send a single summary email when one or more photos are approved at once.
 * - 1 photo  → uses the Resend managed template (watch-photo-live)
 * - 2+ photos → inline list-style HTML email
 */
export async function sendPhotoBulkApprovedEmail(
  to: string,
  data: BulkPhotoApprovalData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] Missing RESEND_API_KEY — skipping email')
    return { success: false, error: 'Resend not configured' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Watchems <onboarding@resend.dev>'
  const count = data.photos.length

  if (count === 1) {
    return sendPhotoApprovedEmail(to, { ...data.photos[0], firstName: data.firstName })
  }

  const firstName = data.firstName || 'there'

  const photoRows = data.photos
    .map((p) => {
      const name = [p.brandName, p.modelName].filter(Boolean).join(' ') || 'Watch'
      const link = p.slug ? `https://watchems.com/photo/${p.slug}` : 'https://watchems.com'
      const countBadge = (p.photoCount ?? 1) > 1
        ? `<span style="display:inline-block;margin-left:8px;padding:1px 7px;background-color:#f0f9ff;color:#2563eb;font-size:11px;font-weight:700;border-radius:20px;">${p.photoCount} photos</span>`
        : ''
      const thumb = p.imageUrl
        ? `<div style="position:relative;width:68px;height:68px;">
            <img src="${p.imageUrl}" alt="${name}" width="68" height="68" style="border-radius:8px;object-fit:cover;display:block;width:68px;height:68px;" />
            ${(p.photoCount ?? 1) > 1 ? `<div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:10px;">+${(p.photoCount ?? 1) - 1}</div>` : ''}
           </div>`
        : '<div style="width:68px;height:68px;background:#f1f5f9;border-radius:8px;"></div>'
      return `<tr>
        <td style="padding:12px 0;width:76px;vertical-align:top;">${thumb}</td>
        <td style="padding:12px 0 12px 14px;vertical-align:top;">
          <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#0f172a;">${name}${countBadge}</p>
          ${p.referenceNumber ? `<p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">${p.referenceNumber}</p>` : '<p style="margin:0 0 6px;"></p>'}
          <a href="${link}" style="color:#2563eb;font-size:13px;font-weight:600;text-decoration:none;">View on Watchems &#8594;</a>
        </td>
      </tr>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your photos are now live!</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#ffffff;padding:24px 32px;border-radius:12px 12px 0 0;border-bottom:1px solid #e2e8f0;" align="center">
            <a href="https://watchems.com" target="_blank" style="text-decoration:none;">
              <img src="https://www.watchems.com/logo.png" alt="Watchems" width="160" height="26" style="display:block;border:0;outline:none;" />
            </a>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:48px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr>
                <td align="center">
                  <div style="width:64px;height:64px;border-radius:50%;background-color:#dcfce7;text-align:center;line-height:64px;font-size:32px;">&#10003;</div>
                </td>
              </tr>
            </table>
            <h1 style="margin:0 0 8px;text-align:center;font-size:28px;font-weight:700;color:#0f172a;">Your photos are now live!</h1>
            <p style="margin:0 0 32px;text-align:center;font-size:16px;color:#64748b;">Hey ${firstName}, all ${count} of your photos have been approved!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin:0 0 32px;">
              ${photoRows}
            </table>
            <p style="margin:0 0 32px;text-align:center;font-size:16px;line-height:1.6;color:#475569;">
              Your watch photos are now part of the Watchems gallery. Share them with fellow enthusiasts!
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 32px;" />
            <p style="margin:0 0 16px;text-align:center;font-size:15px;font-weight:600;color:#0f172a;">Explore your dashboard</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px;">
              <tr>
                <td style="padding:0 0 10px;">
                  <a href="https://watchems.com/dashboard" target="_blank" style="text-decoration:none;display:block;padding:16px 20px;border:1.5px solid #e2e8f0;border-radius:10px;background-color:#ffffff;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width:44px;vertical-align:middle;"><div style="width:40px;height:40px;border-radius:8px;background-color:#f0f9ff;text-align:center;line-height:40px;font-size:20px;">🖼️</div></td>
                        <td style="padding-left:14px;vertical-align:middle;"><p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a;">My Watches</p><p style="margin:0;font-size:13px;color:#64748b;">See all the watches you've uploaded and their status.</p></td>
                        <td style="width:20px;text-align:right;vertical-align:middle;font-size:16px;color:#94a3b8;">&#8594;</td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 10px;">
                  <a href="https://watchems.com/dashboard/wrist-check" target="_blank" style="text-decoration:none;display:block;padding:16px 20px;border:1.5px solid #e2e8f0;border-radius:10px;background-color:#ffffff;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width:44px;vertical-align:middle;"><div style="width:40px;height:40px;border-radius:8px;background-color:#f0fdf4;text-align:center;line-height:40px;font-size:20px;">⌚</div></td>
                        <td style="padding-left:14px;vertical-align:middle;"><p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a;">Wrist Check</p><p style="margin:0;font-size:13px;color:#64748b;">Track what you're wearing and log daily wrist shots.</p></td>
                        <td style="width:20px;text-align:right;vertical-align:middle;font-size:16px;color:#94a3b8;">&#8594;</td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0;">
                  <a href="https://watchems.com/dashboard/boards" target="_blank" style="text-decoration:none;display:block;padding:16px 20px;border:1.5px solid #e2e8f0;border-radius:10px;background-color:#ffffff;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width:44px;vertical-align:middle;"><div style="width:40px;height:40px;border-radius:8px;background-color:#fefce8;text-align:center;line-height:40px;font-size:20px;">📋</div></td>
                        <td style="padding-left:14px;vertical-align:middle;"><p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a;">Collections</p><p style="margin:0;font-size:13px;color:#64748b;">Organise your favourite watches into themed boards.</p></td>
                        <td style="width:20px;text-align:right;vertical-align:middle;font-size:16px;color:#94a3b8;">&#8594;</td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;text-align:center;font-size:15px;color:#475569;">Got more watches to show off?</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="border:2px solid #e2e8f0;border-radius:8px;">
                  <a href="https://watchems.com/upload" target="_blank" style="display:inline-block;padding:12px 32px;color:#0f172a;font-size:14px;font-weight:600;text-decoration:none;">Upload Another Photo</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;padding:24px 40px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;text-align:center;font-size:13px;color:#94a3b8;">&copy; 2026 Watchems. All rights reserved.</p>
            <p style="margin:8px 0 0;text-align:center;font-size:13px;color:#94a3b8;">
              <a href="https://watchems.com" target="_blank" style="color:#64748b;text-decoration:none;">watchems.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Your ${count} watch photos are live on Watchems!`,
      html,
    })

    if (error) {
      console.error(`[Resend] Failed to send bulk approval to ${to}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[Resend] Bulk approval email (${count} photos) sent to ${to}`)
    return { success: true }
  } catch (err) {
    console.error('[Resend] Error sending bulk approval email:', err)
    return { success: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Ops alert: photo/image delivery health (sent by /api/cron/image-health)
// ---------------------------------------------------------------------------

export interface ImageHealthCheckResult {
  label: string
  url: string
  status: number | null
  error?: string
}

export async function sendImageHealthAlertEmail(
  to: string,
  data: { kind: 'failing' | 'recovered'; checks: ImageHealthCheckResult[]; failingSince?: string }
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) {
    console.warn('[Resend] Missing RESEND_API_KEY — skipping image health alert')
    return { success: false, error: 'Resend not configured' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Watchems <onboarding@resend.dev>'
  const subject = data.kind === 'failing'
    ? '[Watchems] ALERT: photos are not loading (R2 / image optimizer)'
    : '[Watchems] Resolved: photos are loading again'

  const rows = data.checks
    .map((c) => {
      const ok = c.status === 200
      const result = c.status !== null ? `HTTP ${c.status}` : `Error: ${c.error ?? 'unknown'}`
      return `<tr>
        <td style="padding:6px 12px 6px 0;font-weight:700;">${c.label}</td>
        <td style="padding:6px 12px 6px 0;color:${ok ? '#16a34a' : '#dc2626'};font-weight:700;">${result}</td>
        <td style="padding:6px 0;font-size:12px;word-break:break-all;"><a href="${c.url}">${c.url}</a></td>
      </tr>`
    })
    .join('')

  const intro = data.kind === 'failing'
    ? `<p>The image health check could not load a recent approved photo. Visitors are probably seeing alt text instead of photos.</p>
       <p>Likely causes: Cloudflare R2 subscription/billing, the r2.dev public bucket access being disabled, or Vercel image optimization limits.</p>
       <p>Check: <a href="https://dash.cloudflare.com">Cloudflare dashboard → R2</a> and <a href="https://vercel.com/dashboard">Vercel → Usage</a>.</p>`
    : `<p>Photos are loading again${data.failingSince ? ` (failing since ${data.failingSince})` : ''}.</p>`

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;">
    ${intro}
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">${rows}</table>
    <p style="margin-top:16px;color:#64748b;font-size:12px;">Sent by /api/cron/image-health at ${new Date().toISOString()}</p>
  </div>`

  try {
    const { error } = await resend.emails.send({ from: fromEmail, to, subject, html })
    if (error) {
      console.error(`[Resend] Failed to send image health alert to ${to}:`, error)
      return { success: false, error: error.message }
    }
    console.log(`[Resend] Image health alert (${data.kind}) sent to ${to}`)
    return { success: true }
  } catch (err) {
    console.error('[Resend] Error sending image health alert:', err)
    return { success: false, error: (err as Error).message }
  }
}
