'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthButton, AuthCard } from '@/components/auth/auth-card';

const SUPPORT_EMAIL = 'support@bookbuddyvpd.com';

/**
 * Public account-deletion request page (the URL listed on the Play Store).
 * If the request endpoint is unavailable we say so and offer email instead of
 * pretending a confirmation link was sent.
 */
export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/v1/auth/request-account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason }),
      });
      if (!res.ok) throw new Error('Failed to submit deletion request.');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Account deletion request')}&body=${encodeURIComponent(
    `Please delete the Book Buddy account for: ${email}\n\nReason (optional): ${reason}`,
  )}`;

  if (status === 'success') {
    return (
      <AuthBackdrop>
        <AuthCard
          icon="mail"
          tone="success"
          title="Request received"
          description="If an account exists for that address, we've emailed a link to confirm the deletion. Nothing is deleted until you confirm."
        >
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </AuthCard>
      </AuthBackdrop>
    );
  }

  return (
    <AuthBackdrop>
      <AuthCard
        title="Delete your account"
        description="Under the DPDP Act 2023 and Google Play policy you can ask us to permanently delete your Book Buddy by VPD account and the personal data linked to it."
        footer={
          <>
            Questions?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-bb-accent-ink hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {status === 'error' && (
            <Alert variant="destructive">
              <Icon name="alert-circle" fillLayer={false} />
              <AlertTitle>We couldn&apos;t submit the request online</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Email us from the address on your account and we&apos;ll handle it by hand.</p>
                <a href={mailto} className="inline-block font-semibold underline">
                  Email {SUPPORT_EMAIL}
                </a>
              </AlertDescription>
            </Alert>
          )}

          <FormField label="Account email address" htmlFor="del-email">
            <Input
              id="del-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.edu"
            />
          </FormField>

          <FormField label="Reason (optional)" htmlFor="del-reason">
            <Textarea
              id="del-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us why you're leaving, if you like."
              rows={4}
            />
          </FormField>

          <Alert variant="warning">
            <Icon name="alert" fillLayer={false} />
            <AlertTitle>This can&apos;t be undone</AlertTitle>
            <AlertDescription>
              Your reading history, bookmarks, personal uploads and active sessions are removed for good.
            </AlertDescription>
          </Alert>

          <AuthButton
            type="submit"
            variant="destructive"
            loading={status === 'submitting'}
            loadingText="Submitting request…"
          >
            Request deletion
          </AuthButton>
        </form>
      </AuthCard>
    </AuthBackdrop>
  );
}
