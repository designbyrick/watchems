import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_PROSE } from '@/components/ui/prose'

export const metadata: Metadata = {
  title: 'Copyright Policy',
  description:
    'Copyright policy for Watchems, including DMCA takedown procedure, counter-notice process, and repeat infringer policy.',
  alternates: {
    canonical: 'https://watchems.com/copyright',
  },
}

export default function CopyrightPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-10 pb-16 sm:pt-14">
      <p className="font-mono text-xs tracking-[1px] uppercase text-muted">Legal</p>
      <h1 className="mt-2.5 text-[36px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-1.8px] text-ink">Copyright Policy</h1>
      <p className="mt-4 mb-12 font-mono text-[11px] tracking-[1px] uppercase text-faint">Last updated: April 9, 2026</p>

      <div className={LEGAL_PROSE}>
        <section>
          <h2>The short version</h2>
          <p>
            Watchems is a community gallery for real wrist shots taken by real watch owners.
            We take copyright seriously. If you see something on the site that you believe
            infringes your copyright, tell us and we&apos;ll look into it quickly. If we remove
            content of yours that you think shouldn&apos;t have been removed, you can push back —
            there&apos;s a process for that too.
          </p>
          <p>
            Watchems is operated from Canada and serves a global audience. This policy is
            designed to comply with the U.S. Digital Millennium Copyright Act (DMCA),
            Canada&apos;s Notice-and-Notice regime, and to be compatible with EU and UK copyright
            frameworks.
          </p>
        </section>

        <section>
          <h2>What users can upload</h2>
          <p>
            By uploading a photo to Watchems, you confirm that you took it yourself, or that
            you have the clear right to share it. Press photos, images scraped from other
            sites, photos lifted from Instagram or Reddit without permission, and any other
            content you don&apos;t own are not allowed.
          </p>
          <p>
            We moderate every upload before it goes live, but moderation is not a substitute
            for honest attribution. If you&apos;re not the photographer, don&apos;t upload it.
          </p>
        </section>

        <section>
          <h2>If you&apos;re a rights holder: how to file a takedown notice</h2>
          <p>
            If you believe content on Watchems infringes a copyright you own or represent,
            send a written notice to our designated copyright agent (below) that includes all
            of the following:
          </p>
          <ol>
            <li>
              Your physical or electronic signature (typing your full legal name at the end of
              the email is fine).
            </li>
            <li>
              A clear identification of the copyrighted work you believe has been infringed.
              If there are several, a representative list is fine.
            </li>
            <li>
              The exact URL(s) on watchems.com of the material you want removed, specific
              enough that we can find it without guessing.
            </li>
            <li>
              Your full name, mailing address, telephone number, and an email address where we
              can reach you.
            </li>
            <li>
              A statement that you have a good-faith belief that the use of the material is
              not authorized by the copyright owner, its agent, or the law.
            </li>
            <li>
              A statement, made under penalty of perjury, that the information in your notice
              is accurate and that you are the copyright owner or authorized to act on the
              owner&apos;s behalf.
            </li>
          </ol>
          <p>
            Incomplete notices may be ignored or returned with a request for clarification.
            Notices that are obviously sent in bad faith — for example, to silence criticism
            or remove a competitor&apos;s legitimate content — may be rejected, and the sender may
            face legal consequences under 17 U.S.C. § 512(f).
          </p>
        </section>

        <section>
          <h2>Designated copyright agent</h2>
          <p>
            Send copyright notices to our designated agent. We respond to valid notices
            promptly — usually within a few business days.
          </p>
          <p>
            <strong>Email:</strong> hello@watchems.com
            <br />
            <strong>Location:</strong> Canada
            <br />
            <strong>DMCA Registration:</strong> DMCA-1071343
          </p>
          <p className="text-sm text-faint">
            Email is the fastest way to reach us. Please put &quot;DMCA Notice&quot; or
            &quot;Copyright Claim&quot; in the subject line.
          </p>
        </section>

        <section>
          <h2>What happens after we receive a valid notice</h2>
          <p>
            Once we confirm a notice is valid, we&apos;ll remove or disable access to the
            identified content and notify the user who uploaded it, passing along the
            substance of the complaint. This is how the DMCA safe harbor works in the U.S.
            and it also lines up with Canada&apos;s Notice-and-Notice requirements, under which
            platforms must forward copyright notices to the allegedly infringing user.
          </p>
          <p>
            We do not disclose the uploader&apos;s personal information in response to a takedown
            notice. A separate legal process (such as a court order) would be required for
            that.
          </p>
        </section>

        <section>
          <h2>If your content was removed: counter-notice process</h2>
          <p>
            If we took down one of your photos and you believe it was a mistake — for
            example, the notice named the wrong photo, you actually do own the copyright, or
            your use was authorized — you can send us a counter-notice. Email our copyright
            agent with:
          </p>
          <ol>
            <li>Your physical or electronic signature.</li>
            <li>
              Identification of the content that was removed and the URL where it used to
              appear.
            </li>
            <li>
              A statement under penalty of perjury that you have a good-faith belief the
              content was removed as a result of mistake or misidentification.
            </li>
            <li>
              Your full name, mailing address, and phone number.
            </li>
            <li>
              A statement consenting to the jurisdiction of the federal court for the
              judicial district where you live (or, if you live outside the U.S., any
              judicial district where Watchems may be found), and that you will accept
              service of process from the person who filed the original notice.
            </li>
          </ol>
          <p>
            After we receive a valid counter-notice, we&apos;ll forward it to the original
            complainant. If they don&apos;t file a court action seeking to restrain your content
            within about 10–14 business days, we may restore the content.
          </p>
        </section>

        <section>
          <h2>Repeat infringers</h2>
          <p>
            We terminate the accounts of users who repeatedly upload content that infringes
            someone else&apos;s copyright. &quot;Repeatedly&quot; generally means after multiple
            valid notices, but in egregious cases — for example, a user systematically
            uploading stolen press photos — we may terminate an account after a single
            incident.
          </p>
          <p>
            Termination means the account is closed, existing uploads are removed, and the
            user is not permitted to create a new account. We may also report serious or
            commercial-scale infringement to the relevant authorities.
          </p>
        </section>

        <section>
          <h2>A note for EU and UK users</h2>
          <p>
            Watchems operates as a hosting service. Under the EU Digital Services Act and
            the UK&apos;s equivalent framework, we act on valid notices of illegal content
            — including copyright infringement — and provide a path for affected users to
            contest removals. The takedown and counter-notice processes above apply
            regardless of where you&apos;re located. If you&apos;re in the EU or UK and need a
            different channel, email our copyright agent and we&apos;ll work with you.
          </p>
        </section>

        <section>
          <h2>Questions?</h2>
          <p>
            This page is intentionally short and direct. If something isn&apos;t clear, or your
            situation doesn&apos;t fit neatly into the buckets above, email our copyright agent
            at hello@watchems.com and we&apos;ll help figure it out.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-line flex gap-6">
        <Link href="/terms" className="text-ink hover:text-muted transition-colors text-sm font-medium">
          Terms of Use →
        </Link>
        <Link href="/privacy" className="text-ink hover:text-muted transition-colors text-sm font-medium">
          Privacy Policy →
        </Link>
      </div>
    </div>
  )
}
