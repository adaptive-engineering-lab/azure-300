import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';

/**
 * Terms of Service template. NOT legal advice. Before launch:
 *   - Replace every [OPERATOR_*] and [JURISDICTION] placeholder.
 *   - Decide governing law and dispute-resolution (small-claims, arbitration, etc.).
 *   - If you serve EU consumers, EU consumer-protection law may override.
 *   - Have a lawyer review.
 */
export default function TermsOfServicePage() {
  return (
    <article className="mx-auto w-full max-w-2xl prose-sm">
      <Banner />

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-05-18</p>
      </header>

      <Section title="1. About">
        <p>
          AI-300 Study (&ldquo;the Service&rdquo;) is an educational study
          tool for the Microsoft Certified: Machine Learning Operations
          Engineer Associate exam (Exam AI-300). It is operated by{' '}
          <span className="font-mono text-xs">[OPERATOR_NAME]</span>.
        </p>
        <p className="mt-2">
          The Service is <strong>not affiliated with, endorsed by, or
          sponsored by Microsoft</strong>. &ldquo;AI-300&rdquo; and
          &ldquo;Microsoft&rdquo; are trademarks of their respective owners,
          used here only to identify the exam this material targets.
        </p>
        <p className="mt-2">
          By using the Service you agree to these Terms. If you don&rsquo;t
          agree, don&rsquo;t use it.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          You can use most of the Service as a guest (no account). To sync
          progress across devices and unlock Pro features you must create an
          account.
        </p>
        <ul className="list-disc pl-5">
          <li>You must be 16 years or older to create an account.</li>
          <li>You must give us a real email address you control.</li>
          <li>You are responsible for keeping your account secure.</li>
          <li>One account per person. Do not share credentials.</li>
        </ul>
      </Section>

      <Section title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5">
          <li>Scrape or bulk-download the question bank, including via automated tools.</li>
          <li>Republish, sell, or redistribute the question bank in whole or in part.</li>
          <li>Probe the Service for security flaws without permission.</li>
          <li>Interfere with the Service&rsquo;s operation (denial-of-service, rate-limit evasion, etc.).</li>
          <li>Use the Service to harm anyone or break any law that applies to you.</li>
          <li>Impersonate someone else or misrepresent your affiliation.</li>
        </ul>
        <p className="mt-2">
          We may suspend or terminate accounts that violate these rules
          without notice and without refund.
        </p>
      </Section>

      <Section title="4. Free and Pro tiers">
        <p>
          All study content (every question, mode, and domain) is available
          on the free tier. Pro is a cosmetic upgrade only &mdash; extra
          themes, advanced statistics panel, and the exam countdown widget.
        </p>
        <p className="mt-2">
          Pro is billed monthly through Stripe at the price displayed at
          checkout. You can cancel anytime from Settings → Billing → Manage
          subscription. Cancellation takes effect at the end of the current
          billing period; you keep Pro access until then. We do not offer
          refunds for partial periods.
        </p>
        <p className="mt-2">
          We may change Pro pricing or feature scope with 30 days&rsquo;
          notice. Active subscribers keep their existing rate for the
          current period.
        </p>
      </Section>

      <Section title="5. Content accuracy">
        <p>
          Study material is curated and reviewed to align with the
          AI-300 exam objectives at the time of writing. Microsoft updates
          exam objectives and Azure features regularly; we make no
          guarantee that every item perfectly reflects the current state of
          the exam or the underlying products.
        </p>
        <p className="mt-2">
          <strong>Passing the exam is your responsibility.</strong> The
          Service is one study tool among many; we don&rsquo;t guarantee a
          pass, and no part of these Terms creates a refund right based on
          your exam outcome.
        </p>
      </Section>

      <Section title="6. Intellectual property">
        <p>
          The Service&rsquo;s code, design, question bank, explanations,
          and visual identity are owned by the operator (or used under
          license).
        </p>
        <p className="mt-2">
          You retain ownership of your account inputs (display name,
          ratings, notes). By using the Service, you grant us a limited
          licence to process those inputs solely to operate the Service for
          you.
        </p>
      </Section>

      <Section title="7. Privacy">
        <p>
          Our handling of your personal data is governed by the{' '}
          <Link to={ROUTES.privacy} className="text-accent underline">
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference.
        </p>
      </Section>

      <Section title="8. Service availability and changes">
        <p>
          We try to keep the Service available 24/7 but make no uptime
          guarantee. Planned maintenance, hosting outages, or feature
          changes may make parts of the Service temporarily unavailable.
          We may add, change, or remove features at any time.
        </p>
      </Section>

      <Section title="9. Disclaimer of warranties">
        <p className="text-xs">
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
          AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
          OR THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.
        </p>
      </Section>

      <Section title="10. Limitation of liability">
        <p className="text-xs">
          TO THE FULLEST EXTENT PERMITTED BY LAW, THE OPERATOR&rsquo;S TOTAL
          LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATED TO THE SERVICE
          IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU PAID FOR THE
          SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM AROSE, OR (B) USD
          50. THE OPERATOR IS NOT LIABLE FOR INDIRECT, CONSEQUENTIAL,
          INCIDENTAL, OR SPECIAL DAMAGES.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          You can stop using the Service or delete your account at any time
          (Settings → Delete account). We can suspend or terminate accounts
          that violate these Terms. Sections that by their nature should
          survive termination (Sections 6, 9, 10, 12) survive.
        </p>
      </Section>

      <Section title="12. Governing law and disputes">
        <p>
          These Terms are governed by the laws of{' '}
          <span className="font-mono text-xs">[JURISDICTION]</span>{' '}
          without regard to conflict-of-laws rules.
        </p>
        <p className="mt-2">
          Disputes will be resolved through{' '}
          <span className="font-mono text-xs">[DISPUTE_RESOLUTION_MECHANISM]</span>{' '}
          (for example: small-claims court in the operator&rsquo;s home
          jurisdiction, or binding arbitration under specified rules).
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          If you are a consumer resident in the EU/UK, this clause does not
          deprive you of mandatory consumer-protection rights granted by
          your local law.
        </p>
      </Section>

      <Section title="13. Changes to these Terms">
        <p>
          We may change these Terms. We&rsquo;ll announce material changes
          on the home page or by email at least 14 days before they take
          effect. Continued use after the effective date means you accept
          the change. The &ldquo;Last updated&rdquo; date at the top
          always reflects the current version.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these Terms:{' '}
          <span className="font-mono text-xs">[OPERATOR_CONTACT_EMAIL]</span>.
        </p>
      </Section>

      <p className="mt-8 text-xs text-fg-muted">
        See also:{' '}
        <Link to={ROUTES.privacy} className="text-accent underline">
          Privacy Policy
        </Link>
        .
      </p>
    </article>
  );
}

function Banner() {
  return (
    <div className="mb-6 rounded-lg bg-warning/10 p-3 ring-1 ring-warning/40">
      <p className="text-xs font-semibold text-warning">
        TEMPLATE &mdash; remove this banner once the Terms have been
        completed and reviewed by a lawyer.
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        Replace every bracketed placeholder
        (<span className="font-mono">[OPERATOR_NAME]</span>,{' '}
        <span className="font-mono">[OPERATOR_CONTACT_EMAIL]</span>,{' '}
        <span className="font-mono">[JURISDICTION]</span>,{' '}
        <span className="font-mono">[DISPUTE_RESOLUTION_MECHANISM]</span>)
        with your real values. Have a lawyer review before launch &mdash;
        this is not legal advice.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-fg leading-relaxed">{children}</div>
    </section>
  );
}
