import type { Metadata } from 'next';
import { LegalPage, Section, Fill, DraftNotice } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Cookie Policy — Book Buddy',
  description: 'The cookies and local storage Book Buddy uses, and why.',
};

/**
 * DRAFT. The storage described here was read out of the codebase: the app
 * currently sets a session cookie and uses localStorage for reader preferences.
 * It runs no advertising or analytics trackers, which is why there is no
 * consent banner — add one here if that ever changes.
 */
export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="22 August 2026" current="/cookies">
      <DraftNotice>
        Accurate to the current
        build; confirm before relying on it.
      </DraftNotice>

      <Section heading="What we use">
        <p>
          Book Buddy uses the minimum storage needed to keep you signed in and to
          remember how you like to read. <strong>There are no advertising,
          profiling or third-party analytics cookies</strong>, which is why you
          are not asked to accept anything on arrival.
        </p>
      </Section>

      <Section heading="Strictly necessary">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Session cookie</strong> — issued at sign-in and required to
            keep you authenticated. It is HTTP-only, so page scripts cannot read
            it. Removing it signs you out.
          </li>
          <li>
            <strong>Active institution</strong> — remembers which institution
            you are currently acting within, if you belong to more than one.
          </li>
        </ul>
      </Section>

      <Section heading="Preferences (stored on your device)">
        <p>
          Held in your browser&apos;s local storage rather than sent to us:
          reader font size, line height, typeface, margins, theme, colour
          temperature and contrast; bookmarks and reading position held for
          offline use; and any locally-drafted notes not yet synced. Clearing
          site data removes these and resets the reader to its defaults.
        </p>
      </Section>

      <Section heading="Error monitoring">
        <p>
          We run self-hosted error monitoring to catch crashes. It records
          technical details of a failure — not your reading — and stores them on
          infrastructure we operate rather than a third-party analytics service.
        </p>
      </Section>

      <Section heading="Managing storage">
        <p>
          You can clear cookies and site data from your browser settings at any
          time. Blocking the session cookie will prevent sign-in, since it is
          what authenticates each request.
        </p>
        <p>
          Questions: <Fill>[privacy contact email]</Fill>.
        </p>
      </Section>
    </LegalPage>
  );
}
