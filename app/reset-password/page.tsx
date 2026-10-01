'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthButton, AuthCard, AuthCardSkeleton, PasswordInput } from '@/components/auth/auth-card';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const MISSING_TOKEN = 'Invalid or missing reset token. Please request a new password reset link.';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!token) setError(MISSING_TOKEN);
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError(MISSING_TOKEN);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

      const response = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset password');
      }

      setSuccess(true);

      // Send them to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthBackdrop>
        <AuthCard
          icon="check-circle"
          tone="success"
          title="Password updated"
          description="You can now sign in with your new password. Taking you there now…"
        >
          <Button asChild size="lg" className="w-full">
            <Link href="/login">
              Go to sign in
              <Icon name="arrow-right" fillLayer={false} />
            </Link>
          </Button>
        </AuthCard>
      </AuthBackdrop>
    );
  }

  return (
    <AuthBackdrop>
      <AuthCard
        title="Set a new password"
        description="Choose a password you haven't used here before."
        footer={
          <>
            Remembered it?{' '}
            <Link href="/login" className="font-semibold text-bb-accent-ink hover:underline">
              Back to sign in
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {error && (
            <Alert variant="destructive">
              <Icon name="alert-circle" fillLayer={false} />
              <AlertTitle>Couldn&apos;t reset your password</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{error}</p>
                {!token && (
                  <Link href="/forgot-password" className="inline-block font-semibold underline">
                    Request a new link
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}

          <FormField
            label="New password"
            htmlFor="password"
            hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
            error={errors.password?.message}
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="New password"
              {...register("password")}
              aria-invalid={errors.password ? "true" : "false"}
            />
          </FormField>

          <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Repeat the new password"
              {...register("confirmPassword")}
              aria-invalid={errors.confirmPassword ? "true" : "false"}
            />
          </FormField>

          <AuthButton type="submit" loading={isLoading} loadingText="Saving password…" icon="lock" disabled={!token}>
            Reset password
          </AuthButton>
        </form>
      </AuthCard>
    </AuthBackdrop>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthBackdrop><AuthCardSkeleton /></AuthBackdrop>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
