'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthButton, AuthCard, AuthDivider, GoogleMark, PasswordInput } from '@/components/auth/auth-card';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    clearError();
    setLoginError(null);
    setShowResendVerification(false);
    setResendSuccess(false);
    try {
      const result = await login(data.email, data.password);
      const loggedUser = result?.user as any;
      if (loggedUser) {
        if (loggedUser.role === 'STUDENT') router.push('/dashboard/student');
        else if (loggedUser.role === 'SUPER_ADMIN') router.push('/dashboard/super-admin');
        else if (loggedUser.role === 'ADMIN') router.push('/dashboard/admin');
        else if (loggedUser.role === 'LIBRARIAN') router.push('/dashboard/librarian');
        else if (loggedUser.role === 'TEACHER') router.push('/dashboard/teacher');
        else router.push('/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err?.message || "An unexpected error occurred during login.";
      setLoginError(errorMessage);

      // Unverified email: offer to resend the verification link
      if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('verif')) {
        setShowResendVerification(true);
        setResendEmail(data.email);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail) {
      setResendError('Please enter your email address');
      return;
    }

    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        setResendSuccess(true);
        setResendError(null);
      } else {
        setResendError(data.error || 'Failed to resend verification email');
        setResendSuccess(false);
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      setResendError('An error occurred. Please try again.');
      setResendSuccess(false);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setLoginError('Failed to sign in with Google. Please try again.');
    }
  };

  // Federated sign-in via Vidyaverse. Only shown when the env flag is on and the
  // genericOAuth plugin is registered server-side (NEXT_PUBLIC_FEDERATION_ENABLED).
  const federationEnabled = process.env.NEXT_PUBLIC_FEDERATION_ENABLED === 'true';
  const handleVidyaverseSignIn = async () => {
    try {
      const oauthClient = authClient as unknown as {
        signIn: { oauth2: (args: { providerId: string; callbackURL?: string }) => Promise<unknown> };
      };
      await oauthClient.signIn.oauth2({ providerId: 'vidyaverse', callbackURL: '/dashboard' });
    } catch (error) {
      console.error('Vidyaverse sign-in error:', error);
      setLoginError('Failed to sign in with your institution account. Please try again.');
    }
  };

  // NOTE: an authenticated user visiting /login is redirected by middleware.ts
  // server-side. No client-side redirect here (it caused an infinite loop).

  return (
    <AuthBackdrop>
      <AuthCard
        title="Welcome back"
        description="Sign in to pick up where you left off."
        footer={
          <>
            New to Book Buddy?{' '}
            <Link href="/register" className="font-semibold text-bb-accent-ink hover:underline">
              Create an account
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {(error || loginError) && (
            <Alert variant="destructive">
              <Icon name="alert-circle" fillLayer={false} />
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{error || loginError}</AlertDescription>
            </Alert>
          )}

          {showResendVerification && (
            <Alert variant="warning" className="animate-in fade-in-0 duration-bb-ui">
              <Icon name="mail" fillLayer={false} />
              <AlertTitle>Email not verified</AlertTitle>
              <AlertDescription className="space-y-3">
                {resendSuccess ? (
                  <p>Verification email sent. Check your inbox.</p>
                ) : (
                  <>
                    <p>Verify your email address to sign in. We can send the link again.</p>
                    {resendError && <p className="font-semibold text-bb-danger-ink">{resendError}</p>}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="email"
                        aria-label="Email for verification link"
                        placeholder="you@example.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="bg-bb-surface"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="shrink-0"
                      >
                        {resendLoading && <Icon name="loader" fillLayer={false} className="animate-spin" />}
                        {resendLoading ? 'Sending…' : 'Resend email'}
                      </Button>
                    </div>
                  </>
                )}
              </AlertDescription>
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

          <div className="flex flex-col gap-2">
            <FormField label="Password" htmlFor="password" error={errors.password?.message}>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Your password"
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
              />
            </FormField>
            <Link
              href="/forgot-password"
              className="self-end rounded text-[13px] font-semibold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
            >
              Forgot password?
            </Link>
          </div>

          <AuthButton type="submit" loading={isLoading} loadingText="Signing in…" icon="arrow-right">
            Sign in
          </AuthButton>

          <AuthDivider>or</AuthDivider>

          <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleGoogleSignIn}>
            <GoogleMark />
            Continue with Google
          </Button>

          {federationEnabled && (
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleVidyaverseSignIn}>
              <Icon name="institution" />
              Sign in with institution SSO
            </Button>
          )}
        </form>
      </AuthCard>
    </AuthBackdrop>
  );
}
