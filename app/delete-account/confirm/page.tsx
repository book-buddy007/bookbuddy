'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthButton, AuthCard, AuthCardSkeleton } from '@/components/auth/auth-card';

const SUPPORT_EMAIL = 'support@bookbuddyvpd.com';

/**
 * Opened from the account-deletion email. Following the link deletes nothing; the
 * button does, so email security scanners that pre-fetch links can't delete anyone.
 */
function ConfirmDeletion() {
  const token = useSearchParams().get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'working' | 'deleted' | 'invalid' | 'error'>(token ? 'idle' : 'invalid');

  const confirm = async () => {
    setStatus('working');
    try {
      const res = await fetch('/api/v1/auth/confirm-account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      if (data.status === 'deleted') {
        // The session (if any) belonged to the deleted user; clear it locally.
        await authClient.signOut().catch(() => undefined);
        setStatus('deleted');
      } else {
        setStatus('invalid');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'deleted') {
    return (
      <AuthCard icon="check-circle" tone="success" title="Your account has been deleted" description="Your profile, reading history, notes and uploaded files have been removed. Thank you for reading with Book Buddy.">
        <Button asChild size="lg" className="w-full">
          <Link href="/">Go to the home page</Link>
        </Button>
      </AuthCard>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthCard icon="alert-circle" tone="danger" title="This link can't be used" description="It may have expired (links last 24 hours), already been used, or been copied incompletely.">
        <Button asChild size="lg" className="w-full">
          <Link href="/delete-account">Request a new link</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon="trash"
      tone="danger"
      title="Delete your account?"
      description="This permanently removes your account and everything in it."
      footer={<>Changed your mind? <Link href="/" className="font-semibold text-bb-accent-ink hover:underline">Keep my account</Link></>}
    >
      <div className="flex flex-col gap-5">
        <ul className="space-y-2 rounded-bb-md bg-bb-danger-soft p-4 text-sm text-bb-danger-ink">
          {['Your profile and sign-in', 'Reading history, bookmarks and progress', 'Notes, highlights, flashcards and quiz results', 'Varta conversations', 'Files you uploaded to My Shelf'].map((item) => (
            <li key={item} className="flex items-center gap-2"><Icon name="close" size={14} fillLayer={false} />{item}</li>
          ))}
        </ul>

        {status === 'error' && (
          <Alert variant="destructive">
            <Icon name="alert-circle" fillLayer={false} />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              Nothing was deleted. Try again, or email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion`} className="font-semibold underline">{SUPPORT_EMAIL}</a>.
            </AlertDescription>
          </Alert>
        )}

        <AuthButton type="button" variant="destructive" loading={status === 'working'} loadingText="Deleting…" onClick={confirm}>
          Delete my account
        </AuthButton>
      </div>
    </AuthCard>
  );
}

export default function ConfirmDeletionPage() {
  return (
    <AuthBackdrop>
      <Suspense fallback={<AuthCardSkeleton />}>
        <ConfirmDeletion />
      </Suspense>
    </AuthBackdrop>
  );
}
