import type { Metadata } from 'next';
import { LegalPage, Section, Fill, DraftNotice } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy — Book Buddy',
  description: 'What Book Buddy collects, why, and who it is shared with.',
};

/**
 * DRAFT. The data flows described here were read out of this codebase, so they
 * are accurate to what the system does. The legal framing is NOT a substitute
 * for review by a qualified adviser, and every <Fill> below needs a real value
 * before this page is fit to publish.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="22 August 2026" current="/privacy">
      <DraftNotice>
        The processing described
        below reflects how the software actually behaves, but the highlighted
        values must be completed and the whole document reviewed by a qualified
        adviser before it is relied upon.
      </DraftNotice>

      <Section heading="Who we are">
        <p>
          Book Buddy is a digital library and reading platform operated by{' '}
          <Fill>[registered entity name]</Fill>, <Fill>[registered address]</Fill>.
          For any privacy question, contact <Fill>[privacy contact email]</Fill>.
        </p>
      </Section>

      <Section heading="What we collect">
        <p>We hold the following, and nothing beyond it:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account details</strong> — your name, email address, and
            (where you supply them) a phone number, avatar and student
            identifier. Passwords are stored only as a bcrypt hash.
          </li>
          <li>
            <strong>Institution membership</strong> — which institution you
            belong to, your role there, and any join requests you submit.
          </li>
          <li>
            <strong>Reading activity</strong> — the books you borrow, your
            position in them, time spent per page, daily reading totals and
            streaks.
          </li>
          <li>
            <strong>Study content you create</strong> — highlights, notes,
            bookmarks, flashcards, saved vocabulary and uploaded personal files.
          </li>
          <li>
            <strong>AI interactions</strong> — questions you ask Varta, the
            answers returned, quiz attempts, and per-concept mastery estimates
            derived from them.
          </li>
          <li>
            <strong>Technical data</strong> — session tokens, login attempts
            (including failures, for account-lockout protection), device push
            tokens if you use the mobile app, and error reports.
          </li>
        </ul>
      </Section>

      <Section heading="Why we process it">
        <p>
          To provide the service you signed up for: authenticating you, showing
          the right catalogue for your institution, restoring your reading
          position, answering your questions about a book, and adapting study
          material to what you have and haven&apos;t mastered. Login-attempt
          records exist to protect your account against brute-force access.
          Aggregate reading statistics may be shown to your institution&apos;s
          administrators in a form that does not identify individual passages
          you read.
        </p>
      </Section>

      <Section heading="Who it is shared with">
        <p>
          We do not sell personal data. It is shared only with the processors
          that make the product work:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Resend</strong> — transactional email delivery.</li>
          <li><strong>OpenAI</strong> — generating embeddings and answers for AI study features. Your questions are sent as part of that request.</li>
          <li><strong>Object storage and CDN</strong> (<Fill>[Cloudflare R2 / AWS]</Fill>) — storing book files and your uploads.</li>
          <li><strong>Expo</strong> — mobile push notification delivery.</li>
          <li><strong>Self-hosted error monitoring</strong> — crash and error reports, on infrastructure we operate.</li>
          <li><strong>Linked applications</strong> — where you use a linked account, identity and shared course content are exchanged with the connected partner applications you choose to link.</li>
        </ul>
      </Section>

      <Section heading="Retention">
        <p>
          Account and study data is retained while your account is open. You can
          ask to delete your account at any time from Settings or at /delete-account;
          we email a link to confirm, and confirming removes your personal data, the
          study content attached to it and the files you uploaded. AI conversation
          history can be cleared separately without deleting the account.
          Retention periods for backups and audit logs are{' '}
          <Fill>[retention period]</Fill>.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can access, correct, export or delete your personal data. Downloading
          a copy of your data (Settings → Data &amp; privacy), account deletion and
          AI-history deletion are self-service; for anything else,
          write to <Fill>[privacy contact email]</Fill> and we will respond
          within <Fill>[response window]</Fill>.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          The platform is used in schools. Where a student is below the age of
          consent in their jurisdiction, the institution acts as the controller
          for that account and is responsible for obtaining any consent
          required. <Fill>[Confirm this framing with your adviser.]</Fill>
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          Material changes to this policy will be notified in-app before they
          take effect.
        </p>
      </Section>
    </LegalPage>
  );
}
