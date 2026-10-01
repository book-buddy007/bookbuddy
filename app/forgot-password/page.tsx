'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthButton, AuthCard } from '@/components/auth/auth-card';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

      const response = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = (
    <Link href="/login" className="font-semibold text-bb-accent-ink hover:underline">
      Back to sign in
    </Link>
  );

  if (success) {
    return (
      <AuthBackdrop>
        <AuthCard
          icon="mail"
          tone="success"
          title="Check your email"
          description="If an account exists for that address, a reset link is on its way. Check your inbox and spam folder."
        >
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/login">
                <Icon name="arrow-left" fillLayer={false} />
                Back to sign in
              </Link>
            </Button>
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setSuccess(false)}>
              Send another email
            </Button>
          </div>
        </AuthCard>
      </AuthBackdrop>
    );
  }

  return (
    <AuthBackdrop>
      <AuthCard
        title="Forgot your password?"
        description="Enter your email and we'll send you a reset link."
        footer={<>Remembered it? {backToLogin}</>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {error && (
            <Alert variant="destructive">
              <Icon name="alert-circle" fillLayer={false} />
              <AlertTitle>Couldn&apos;t send the link</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField label="Email address" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
              aria-invalid={errors.email ? "true" : "false"}
            />
          </FormField>

          <AuthButton type="submit" loading={isLoading} loadingText="Sending reset link…" icon="send">
            Send reset link
          </AuthButton>
        </form>
      </AuthCard>
    </AuthBackdrop>
  );
}
