'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuthProviders } from '@/hooks/use-auth-providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthButton, AuthCard, AuthDivider, GoogleMark, PasswordInput } from '@/components/auth/auth-card';

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const providers = useAuthProviders();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    clearError();
    setRegisterError(null);
    setRegistrationSuccess(false);

    try {
      await registerUser(data.name, data.email, data.password);
      setRegistrationSuccess(true);
      setRegisteredEmail(data.email);

      // Send them to login after 5 seconds
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } catch (err: any) {
      setRegisterError(err.message || "An unexpected error occurred during registration.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard', errorCallbackURL: '/login', requestSignUp: true });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setRegisterError('Failed to sign in with Google. Please try again.');
    }
  };

  // Already signed in: continue to onboarding (in an effect to avoid render-phase updates)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, router]);

  if (registrationSuccess) {
    return (
      <AuthBackdrop>
        <AuthCard
          icon="mail"
          tone="success"
          title="Check your email"
          description={
            <>
              We sent a verification link to <strong className="text-bb-text">{registeredEmail}</strong>. Verify your
              email, then sign in.
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Alert variant="success" role="status">
              <Icon name="check-circle" fillLayer={false} />
              <AlertTitle>Account created</AlertTitle>
              <AlertDescription>Taking you to sign in in a few seconds…</AlertDescription>
            </Alert>
            <Button asChild size="lg" className="w-full">
              <Link href="/login">
                Go to sign in
                <Icon name="arrow-right" fillLayer={false} />
              </Link>
            </Button>
          </div>
        </AuthCard>
      </AuthBackdrop>
    );
  }

  return (
    <AuthBackdrop>
      <AuthCard
        title="Join Book Buddy"
        description="Create your account and start reading."
        footer={
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-bb-accent-ink hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {(error || registerError) && (
            <Alert variant="destructive">
              <Icon name="alert-circle" fillLayer={false} />
              <AlertTitle>Registration failed</AlertTitle>
              <AlertDescription>{error || registerError}</AlertDescription>
            </Alert>
          )}

          <FormField label="Full name" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              {...register("name")}
              aria-invalid={errors.name ? "true" : "false"}
            />
          </FormField>

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

          <FormField label="Password" htmlFor="password" hint="At least 8 characters." error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a password"
              {...register("password")}
              aria-invalid={errors.password ? "true" : "false"}
            />
          </FormField>

          <AuthButton type="submit" loading={isLoading} loadingText="Creating account…" icon="arrow-right">
            Create account
          </AuthButton>

          {/* Only when Google is configured AND the server lets Google create accounts; otherwise it can only sign existing users in (see the login page). */}
          {providers.google && providers.publicSignup && (
            <>
              <AuthDivider>or</AuthDivider>

              <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleGoogleSignIn}>
                <GoogleMark />
                Sign up with Google
              </Button>
            </>
          )}
        </form>
      </AuthCard>
    </AuthBackdrop>
  );
}
