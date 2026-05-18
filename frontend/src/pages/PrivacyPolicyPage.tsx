import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';

/**
 * Privacy Policy template. This is NOT legal advice. Before launch:
 *   - Replace every [OPERATOR_*] placeholder with your real values.
 *   - Confirm the storage region matches your Supabase project (az-103 is
 *     "West EU (Ireland)" → covered by the EU disclosure).
 *   - If you serve EU residents, GDPR applies regardless of where you live.
 *   - If you serve California residents, CCPA / CPRA applies.
 *   - Have a lawyer review before you onboard real users.
 */
export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl prose-sm">
      <Banner />

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-05-18</p>
      </header>

      <Section title="1. Who we are">
        <p>
          AI-300 Study (the &ldquo;Service&rdquo;) is operated by{' '}
          <span className="font-mono text-xs">[OPERATOR_NAME]</span>
          {' ('}
          <span className="font-mono text-xs">[OPERATOR_LEGAL_ENTITY_OR_INDIVIDUAL]</span>
          {'). You can reach us at '}
          <span className="font-mono text-xs">[OPERATOR_CONTACT_EMAIL]</span>.
        </p>
        <p className="mt-2">
          This policy explains what personal data we collect when you use the
          Service, why we collect it, where it&rsquo;s stored, and your rights
          over it.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p>We only collect what we need to run the study app:</p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Account data</strong> &mdash; if you sign in: your email
            address and the display name you choose. Authentication is handled
            by Supabase Auth; we never see your password.
          </li>
          <li>
            <strong>Study data</strong> &mdash; per-question ratings (correct,
            almost, missed), the next scheduled review date, session
            summaries (mode, score percentage, duration, completion
            timestamp), streak and XP totals.
          </li>
          <li>
            <strong>Billing data</strong> &mdash; if you upgrade to Pro: a
            Stripe customer identifier and subscription status mirrored from
            Stripe. We do <em>not</em> see your card number; Stripe handles
            payment data directly.
          </li>
          <li>
            <strong>Technical data</strong> &mdash; minimal browser and
            connection metadata your browser sends with every HTTP request
            (IP address, user agent). Supabase logs this for abuse prevention
            and operational diagnostics for a short retention window.
          </li>
        </ul>
        <p className="mt-2">
          As a guest (signed out), all of the above except the email/display
          name is kept only in your browser&rsquo;s localStorage. Nothing is
          uploaded until you sign in.
        </p>
      </Section>

      <Section title="3. Why we collect it">
        <ul className="list-disc pl-5">
          <li>Provide the study features you requested (progress tracking, spaced repetition, daily review).</li>
          <li>Sync your progress across the devices you sign in on.</li>
          <li>Operate Pro billing if you choose to upgrade.</li>
          <li>Detect and respond to abuse, error rates, and outages.</li>
        </ul>
        <p className="mt-2">
          We do <strong>not</strong> sell your data, share it with
          advertisers, or use it to train AI models.
        </p>
      </Section>

      <Section title="4. Where it's stored">
        <p>
          The Service uses Supabase (a Postgres-backed BaaS) as its primary
          data store. Our Supabase project is hosted in{' '}
          <span className="font-mono text-xs">[SUPABASE_REGION]</span>{' '}
          (currently &ldquo;West EU &mdash; Ireland&rdquo; for the active
          deployment).
        </p>
        <p className="mt-2">
          Billing data, when applicable, is stored by Stripe under their own
          privacy policy at{' '}
          <a
            href="https://stripe.com/privacy"
            className="text-accent underline"
            target="_blank"
            rel="noreferrer"
          >
            stripe.com/privacy
          </a>
          .
        </p>
        <p className="mt-2">
          Static frontend assets are served by Netlify (CDN). Netlify
          processes IP addresses for routing and DDoS protection.
        </p>
      </Section>

      <Section title="5. Who else can access it">
        <p>
          Only the Service operator(s) and our infrastructure providers
          (Supabase, Stripe, Netlify) have access to your data, each under
          their own contractual confidentiality and security obligations. We
          never give your data to a third party for marketing, advertising,
          or model training.
        </p>
        <p className="mt-2">
          We will disclose data when legally required (court order, subpoena,
          regulatory request). We will tell you if we receive such a request
          unless legally prohibited from doing so.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <ul className="list-disc pl-5">
          <li>Your account data is kept while your account exists.</li>
          <li>Study data is kept while your account exists.</li>
          <li>
            When you delete your account from Settings, we delete your auth
            record. The Postgres cascade removes your profile, progress,
            sessions, and subscription rows in the same transaction.
          </li>
          <li>
            Stripe retains billing records under its own retention policy.
            Deletion of the Service account does not by itself cancel an
            active Stripe subscription &mdash; cancel from the Customer
            Portal first (Billing → Manage subscription).
          </li>
          <li>
            Server logs are kept up to 30 days for operational diagnostics.
          </li>
        </ul>
      </Section>

      <Section title="7. Your rights">
        <p>
          Depending on where you live, you may have the right to:
        </p>
        <ul className="list-disc pl-5">
          <li><strong>Access</strong> a copy of your personal data.</li>
          <li><strong>Correct</strong> data that&rsquo;s wrong.</li>
          <li><strong>Delete</strong> your data &mdash; available directly from <Link to={ROUTES.settings} className="text-accent underline">Settings → Delete account</Link>.</li>
          <li><strong>Export</strong> your data in a portable format.</li>
          <li><strong>Withdraw consent</strong> at any time by deleting your account or signing out.</li>
          <li><strong>Complain</strong> to your local data protection authority.</li>
        </ul>
        <p className="mt-2">
          For access, correction, or export requests, email{' '}
          <span className="font-mono text-xs">[OPERATOR_CONTACT_EMAIL]</span>{' '}
          and we&rsquo;ll respond within 30 days.
        </p>
      </Section>

      <Section title="8. Cookies and local storage">
        <p>
          We use first-party cookies and browser storage for these purposes
          only:
        </p>
        <ul className="list-disc pl-5">
          <li>Keep you signed in (Supabase Auth session token).</li>
          <li>Remember your preferences (theme, default session length).</li>
          <li>Hold your guest progress until you sign in.</li>
          <li>Cache the app shell for offline use (service worker / IndexedDB).</li>
        </ul>
        <p className="mt-2">
          We do not use third-party tracking cookies, analytics that build
          cross-site profiles, or advertising pixels.
        </p>
      </Section>

      <Section title="9. Children">
        <p>
          The Service is intended for users aged 16 and over. We do not
          knowingly collect personal data from anyone under 16. If you
          believe a child has signed up, contact{' '}
          <span className="font-mono text-xs">[OPERATOR_CONTACT_EMAIL]</span>{' '}
          and we&rsquo;ll delete the account.
        </p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will
          be announced on the home page or by email at least 14 days before
          taking effect. The &ldquo;Last updated&rdquo; date at the top will
          always reflect the current version.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Questions, requests, complaints:{' '}
          <span className="font-mono text-xs">[OPERATOR_CONTACT_EMAIL]</span>.
        </p>
      </Section>

      <p className="mt-8 text-xs text-fg-muted">
        See also: <Link to={ROUTES.terms} className="text-accent underline">Terms of Service</Link>.
      </p>
    </article>
  );
}

function Banner() {
  return (
    <div className="mb-6 rounded-lg bg-warning/10 p-3 ring-1 ring-warning/40">
      <p className="text-xs font-semibold text-warning">
        TEMPLATE &mdash; remove this banner once the policy has been filled in
        and reviewed by a lawyer.
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        Replace every bracketed placeholder
        (<span className="font-mono">[OPERATOR_NAME]</span>,{' '}
        <span className="font-mono">[OPERATOR_CONTACT_EMAIL]</span>, etc.)
        with your real values. Confirm the Supabase region. Have a lawyer
        review before launch &mdash; this is not legal advice.
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
