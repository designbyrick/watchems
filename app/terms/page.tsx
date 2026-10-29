import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms and conditions for using Watchems, including user content, moderation, and liability.',
  alternates: {
    canonical: 'https://watchems.com/terms',
  },
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-4xl font-bold text-ink mb-2">Terms of Use</h1>
      <p className="text-faint text-sm mb-10">Last updated: April 9, 2026</p>

      <div className="prose-custom space-y-8">
        <section>
          <h2>1. Acceptance</h2>
          <p>
            By accessing or using Watchems (&quot;the Site&quot;), you agree to these
            Terms of Use. If you do not agree, do not use the Site. We may update these
            terms at any time — continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2>2. What we provide</h2>
          <p>
            Watchems is a community watch photo gallery where enthusiasts upload and
            browse real photos of watches. All content is for informational purposes only
            and does not constitute professional advice.
          </p>
          <p>
            Watch specifications are sourced from official manufacturer documentation and
            trusted secondary sources. While we strive for accuracy, we do not guarantee
            that all specifications are current or error-free. Prices are approximate
            retail ranges and may not reflect actual market availability.
          </p>
        </section>

        <section>
          <h2>3. Accounts</h2>
          <p>
            Some features (submitting reviews, uploading photos, voting) require an
            account. You are responsible for maintaining the security of your account
            credentials. You agree to provide accurate information and to not create
            accounts for fraudulent or deceptive purposes.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2>4. User-generated content</h2>
          <p>
            When you submit content to Watchems — including reviews, ratings, and
            photos — the following applies:
          </p>

          <h3>Ownership</h3>
          <p>
            <strong>You own the photos you upload.</strong> Watchems makes no claim of
            ownership over any photograph you submit. Copyright in the photos you take
            remains with you, the photographer. We do not sell, license, or transfer your
            photos to third parties.
          </p>
          <p>
            By submitting content to Watchems, you grant us a worldwide, non-exclusive,
            royalty-free, perpetual license to display, reproduce, distribute, and create
            derivative versions (such as thumbnails and resized copies) of your content
            solely in connection with operating and promoting the platform — for example,
            showing your photo in the public gallery, on the watch detail page, in our image
            sitemap for search engines, and in site-related social media posts that credit
            you. This license exists only so we can actually show your photo on the site;
            it does not give us any other rights. You can request removal of your photos at
            any time by emailing{' '}
            <span className="text-ink">hello@watchems.com</span>.
          </p>

          <h3>Your responsibilities</h3>
          <p>When submitting content, you agree that:</p>
          <ul>
            <li>The content is your own original work, or you have permission to share it</li>
            <li>Photos you upload are images you took yourself or have the right to use</li>
            <li>Reviews reflect your genuine experience with the watch</li>
            <li>Content does not contain spam, malware, or misleading information</li>
            <li>Content does not infringe on any third party&apos;s intellectual property, privacy, or other rights</li>
            <li>Content does not contain hate speech, harassment, threats, or illegal material</li>
          </ul>

          <h3>Moderation</h3>
          <p>
            Every photo submitted to Watchems is reviewed by a human before it goes live.
            Our review is a <strong>relevance check</strong>, not editorial curation. The
            only question we ask is: &quot;Is this a photograph of a watch?&quot; If the
            answer is yes, we approve it. If the answer is no — because the photo is blurry
            beyond recognition, unrelated to watches, spam, or obviously abusive — we
            reject it.
          </p>
          <p>
            We do not edit, enhance, caption, rewrite, or creatively shape user photos. We
            do not select photos based on artistic merit, brand preference, or editorial
            agenda. The gallery is what users upload, in the order they upload it.
          </p>

          <h3>What moderation is not</h3>
          <p>
            Because our review is limited to relevance, a few things follow — and we want
            to be explicit about them:
          </p>
          <ul>
            <li>
              <strong>We do not verify copyright.</strong> We cannot tell by looking
              whether you actually took a photo. You are solely responsible for making
              sure you have the right to share every photo you upload. If you didn&apos;t
              take it, don&apos;t upload it.
            </li>
            <li>
              <strong>Approval is not an endorsement.</strong> When we approve a photo,
              we are confirming it shows a watch. We are not endorsing the photographer,
              the watch, the brand, or any opinion expressed in the caption. We are not
              claiming the photo is accurate, authentic, or representative of the model.
            </li>
            <li>
              <strong>Approval does not transfer ownership.</strong> Copyright in a photo
              stays with the photographer regardless of whether we approve it. Watchems
              makes no claim of ownership over user photos. See Section 4 for the full
              ownership terms.
            </li>
            <li>
              <strong>Moderation is not editorial control for copyright purposes.</strong>{' '}
              The relevance check we perform is a narrow, automated-in-spirit filter that
              does not involve selecting, modifying, or curating content on the basis of
              what it expresses. Watchems acts as a hosting service for user-generated
              content under 17 U.S.C. § 512 (the DMCA), Canada&apos;s Notice-and-Notice
              regime, and the equivalent EU and UK hosting safe harbors. We rely on those
              safe harbors and do not waive them by operating a relevance filter.
            </li>
          </ul>

          <h3>When we remove content</h3>
          <p>
            We will remove content when:
          </p>
          <ul>
            <li>It fails the relevance check (not a watch photo)</li>
            <li>We receive a valid copyright takedown notice — see our{' '}
              <Link href="/copyright" className="text-ink hover:text-ink-hover underline">
                Copyright Policy
              </Link>
            </li>
            <li>It contains spam, malware, hate speech, harassment, threats, or illegal material</li>
            <li>It violates any other term of this agreement</li>
            <li>The uploader requests its removal</li>
          </ul>
          <p>
            We do not remove content simply because someone disagrees with the watch
            pictured, the price shown, or the uploader&apos;s taste. Gallery disagreement is
            not grounds for removal.
          </p>
        </section>

        <section>
          <h2>5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Site for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the Site or its systems</li>
            <li>Scrape, crawl, or harvest data from the Site in a manner that degrades performance or circumvents rate limits</li>
            <li>Submit automated or bot-generated reviews, votes, or content</li>
            <li>Impersonate another person or misrepresent your identity</li>
            <li>Manipulate voting systems or review scores</li>
            <li>Upload files containing viruses or malicious code</li>
          </ul>
        </section>

        <section>
          <h2>6. Intellectual property</h2>
          <p>
            The Watchems name, logo, site design, and comparison data
            editorial content, and code are owned by Watchems and protected by
            applicable intellectual property laws. You may not reproduce, distribute, or
            create derivative works from our content without written permission.
          </p>
          <p>
            Watch names, brand names, logos, and product images remain the property of
            their respective manufacturers. Their use on this site is for informational
            and comparison purposes only and does not imply endorsement or affiliation.
          </p>
        </section>

        <section>
          <h2>7. Disclaimer of warranties</h2>
          <p>
            The Site is provided &quot;as is&quot; and &quot;as available&quot; without
            warranties of any kind, whether express or implied. We do not warrant that:
          </p>
          <ul>
            <li>The Site will be available without interruption</li>
            <li>Watch specifications, prices, or comparisons are complete or error-free</li>
            <li>User-generated reviews or ratings are accurate or reliable</li>
            <li>The Site will meet your specific requirements</li>
          </ul>
          <p>
            You use the Site and rely on its content at your own risk. Watch purchasing
            decisions should be informed by multiple sources, including authorized dealers
            and official manufacturer specifications.
          </p>
        </section>

        <section>
          <h2>8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Watchems and its operators shall
            not be liable for any indirect, incidental, special, consequential, or punitive
            damages arising from your use of the Site. This includes but is not limited to
            damages from purchasing decisions made based on information found on the Site,
            loss of data, or unauthorized access to your account.
          </p>
          <p>
            Our total liability for any claim arising from your use of the Site shall not
            exceed the amount you have paid to us in the 12 months preceding the claim
            (which, for most users, is zero, as the Site is free to use).
          </p>
        </section>

        <section>
          <h2>9. DMCA and copyright claims</h2>
          <p>
            If you believe content on Watchems infringes your copyright, see our{' '}
            <Link href="/copyright" className="text-ink hover:text-ink-hover underline">
              Copyright Policy
            </Link>{' '}
            for the full takedown and counter-notice procedure, including the contact
            information for our designated copyright agent.
          </p>
        </section>

        <section>
          <h2>10. Termination</h2>
          <p>
            We may suspend or terminate your access to the Site at any time, for any
            reason, without prior notice. Upon termination, your right to use the Site
            ceases immediately. Content you previously submitted may remain on the platform
            per the license granted in Section 4.
          </p>
        </section>

        <section>
          <h2>11. Governing law</h2>
          <p>
            These terms are governed by and construed in accordance with applicable law.
            Any disputes arising from these terms or your use of the Site shall be resolved
            through good-faith negotiation first. If negotiation fails, disputes shall be
            submitted to binding arbitration or the courts of competent jurisdiction.
          </p>
        </section>

        <section>
          <h2>12. Contact</h2>
          <p>
            Questions about these terms? Email us at{' '}
            <span className="text-ink">hello@watchems.com</span>.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-line">
        <Link href="/privacy" className="text-ink hover:text-ink-hover text-sm font-medium">
          Read our Privacy Policy →
        </Link>
      </div>
    </div>
  )
}
