import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_PROSE } from '@/components/ui/prose'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Watchems collects, uses, and protects your personal data.',
  alternates: {
    canonical: 'https://watchems.com/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-10 pb-16 sm:pt-14">
      <p className="font-mono text-xs tracking-[1px] uppercase text-muted">Legal</p>
      <h1 className="mt-2.5 text-[36px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-1.8px] text-ink">Privacy Policy</h1>
      <p className="mt-4 mb-12 font-mono text-[11px] tracking-[1px] uppercase text-faint">Last updated: March 26, 2026</p>

      <div className={LEGAL_PROSE}>
        <section>
          <h2>1. Who we are</h2>
          <p>
            Watchems (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) operates the website at{' '}
            <strong>watchems.com</strong>. We are an independently run watch photo gallery. For questions about this policy, email{' '}
            <span className="text-ink">hello@watchems.com</span>.
          </p>
        </section>

        <section>
          <h2>2. What data we collect</h2>
          <p>We collect only what is necessary to operate the platform:</p>

          <h3>Account data</h3>
          <p>
            When you create an account, our authentication provider (Clerk) processes your
            name, email address, and profile image. We do not store passwords directly —
            authentication is handled entirely by Clerk.
          </p>

          <h3>User-generated content</h3>
          <p>
            Photos you upload are stored in our database along with your display name and the date of submission. Photos are
            stored on Vercel Blob storage. Photo metadata is stored on Upstash Redis.
          </p>

          <h3>Analytics and performance data</h3>
          <p>
            We use Google Analytics 4 and Vercel Analytics to understand how the site is
            used. This includes page views, referral sources, device type, and general
            geographic region. We do not enable Google&apos;s advertising features or share
            analytics data with third parties for advertising purposes.
          </p>

          <h3>Technical data</h3>
          <p>
            Our hosting provider (Vercel) automatically logs IP addresses, browser type,
            and request timestamps as part of standard server operations. These logs are
            retained according to Vercel&apos;s data retention policies.
          </p>
        </section>

        <section>
          <h2>3. How we use your data</h2>
          <ul>
            <li>To display your photos in the gallery</li>
            <li>To authenticate your identity when you sign in</li>
            <li>To prevent abuse (spam and malicious uploads)</li>
            <li>To understand site usage and improve the platform</li>
            <li>To respond to support inquiries</li>
          </ul>
          <p>
            We do not sell, rent, or share your personal data with third parties for
            marketing purposes. We do not send marketing emails.
          </p>
        </section>

        <section>
          <h2>4. Third-party services</h2>
          <p>We use the following third-party services to operate the platform:</p>
          <ul>
            <li><strong>Clerk</strong> — authentication and account management</li>
            <li><strong>Vercel</strong> — hosting, image storage (Blob), and analytics</li>
            <li><strong>Upstash</strong> — database for photos and gallery data</li>
            <li><strong>Google Analytics 4</strong> — website analytics</li>
          </ul>
          <p>
            Each service has its own privacy policy governing how it processes data. We
            recommend reviewing their policies if you have specific concerns.
          </p>
        </section>

        <section>
          <h2>5. Cookies</h2>
          <p>We use a minimal number of cookies:</p>
          <ul>
            <li>
              <strong>Authentication cookies</strong> — set by Clerk to maintain your
              signed-in session. These are essential and cannot be disabled while using an
              account.
            </li>
            <li>
              <strong>Analytics cookies</strong> — set by Google Analytics to distinguish
              users and track sessions. You can opt out of Google Analytics by installing
              the{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
              >
                Google Analytics opt-out browser add-on
              </a>.
            </li>
          </ul>
          <p>We do not use advertising cookies or tracking pixels.</p>
        </section>

        <section>
          <h2>6. Data retention</h2>
          <ul>
            <li>
              <strong>Account data</strong> is retained as long as your account exists.
              Delete your account through Clerk to remove it.
            </li>
            <li>
              <strong>Photos</strong> are retained as long as they are
              published. You can request removal by emailing us.
            </li>
            <li>
              <strong>Analytics data</strong> is retained according to Google Analytics
              and Vercel Analytics default retention periods (typically 14 months for GA4).
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Your rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to or restrict certain processing</li>
            <li>Request a copy of your data in a portable format</li>
          </ul>
          <p>
            To exercise any of these rights, email{' '}
            <span className="text-ink">hello@watchems.com</span>. We will respond
            within 30 days.
          </p>
        </section>

        <section>
          <h2>8. Children</h2>
          <p>
            Watchems is not directed at children under 16. We do not knowingly collect
            personal data from children. If you believe a child has provided us with
            personal data, please contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2>9. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this
            page with an updated &quot;Last updated&quot; date. Continued use of the site
            after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            Questions about this privacy policy? Email us at{' '}
            <span className="text-ink">hello@watchems.com</span>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-line">
        <Link href="/terms" className="text-ink hover:text-muted transition-colors text-sm font-medium">
          Read our Terms of Use →
        </Link>
      </div>
    </div>
  )
}
