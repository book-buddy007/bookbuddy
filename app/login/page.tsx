'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/store/useAuthStore';
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardFooter, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, GraduationCap, LogIn, ArrowRight, Mail, CheckCircle2, Eye, EyeOff } from '@/components/ui/icons';
import Link from 'next/link';
import { AuthBackdrop, authCardClassName, authLogoHaloClassName } from '@/components/auth/auth-backdrop';
import { MandalaMark } from '@/components/auth/mandala-mark';

// Define the validation schema using Zod
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Infer the type from the schema
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    clearError(); // Clear previous global errors
    setLoginError(null); // Clear previous local errors
    setShowResendVerification(false); // Hide resend verification section
    setResendSuccess(false); // Clear resend success message
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

      // Check if error is related to email verification
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard'
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setLoginError('Failed to sign in with Google. Please try again.');
    }
  };

  // Federated sign-in via Vidyaverse (Phase 3). Only shown when the env flag
  // is on and the genericOAuth plugin is registered server-side. Pulled at
  // build time via NEXT_PUBLIC_FEDERATION_ENABLED.
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

  // NOTE: If user is already authenticated and visits /login, middleware.ts
  // redirects them to the correct dashboard server-side. No client-side
  // redirect here — this is what was causing the infinite loop.

  return (
    <AuthBackdrop>
      <EnhancedCard className={`animate-vg-fade-in border-0 ${authCardClassName}`}>
        <EnhancedCardHeader className="text-center space-y-4 relative z-10">
          {/* Logo */}
          <div className="flex justify-center">
            <MandalaMark size={64} />
          </div>

          <div className="space-y-2">
            <EnhancedCardTitle className="text-3xl font-bold bg-gradient-to-r from-[#1A237E] to-[#4A148C] bg-clip-text text-transparent">
              Welcome Back
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-base text-[#5D4037]">
              Sign in to access your digital library
            </EnhancedCardDescription>
          </div>
        </EnhancedCardHeader>

        <EnhancedCardContent className="relative z-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Display login errors */}
            {(error || loginError) && (
              <Alert variant="destructive" className="animate-vg-shake">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>
                  {error || loginError}
                </AlertDescription>
              </Alert>
            )}

            {/* Resend Verification Email Section - Customized to aesthetic */}
            {showResendVerification && (
              <div className="space-y-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl animate-vg-fade-in">
                <div className="flex items-start gap-2">
                  <Mail className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#1A237E] mb-1">
                      Email Not Verified
                    </h4>
                    <p className="text-xs text-[#5D4037] mb-3">
                      Please verify your email address to log in. Click below to resend the verification email.
                    </p>

                    {resendSuccess ? (
                      <Alert className="bg-emerald-50 border-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-emerald-800">
                          Verification email sent! Please check your inbox.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        {resendError && (
                          <Alert variant="destructive" className="mb-3">
                            <AlertDescription>{resendError}</AlertDescription>
                          </Alert>
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            className="h-9 text-sm focus:ring-amber-500 focus:border-amber-500"
                          />
                          <EnhancedButton
                            type="button"
                            size="sm"
                            onClick={handleResendVerification}
                            loading={resendLoading}
                            loadingText="Sending..."
                            className="whitespace-nowrap bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white border-0 shadow-sm"
                          >
                            Resend Email
                          </EnhancedButton>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-[#1A237E]">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-11 transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm border-amber-200 text-slate-800 placeholder:text-slate-400"
                {...register("email")}
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && (
                <p className="text-sm text-vg-error-500 animate-vg-fade-in">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold text-[#1A237E]">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-amber-600 hover:text-amber-800 hover:underline transition-colors font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="h-11 pr-10 transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm border-amber-200 text-slate-800"
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-vg-error-500 animate-vg-fade-in">
                  {errors.password.message}
                </p>
              )}
            </div>

            <EnhancedButton
              type="submit"
              size="lg"
              className="w-full !bg-gradient-to-r !from-amber-600 !to-amber-500 hover:!from-amber-700 hover:!to-amber-600 !text-white !shadow-[0_8px_30px_rgba(217,119,6,0.2)] hover:!shadow-[0_12px_40px_rgba(217,119,6,0.3)] border-transparent transition-all duration-300"
              loading={isLoading}
              loadingText="Signing in..."
              icon={<LogIn className="h-5 w-5" />}
              iconPosition="right"
            >
              Sign In
            </EnhancedButton>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <EnhancedButton
              type="button"
              variant="outline"
              size="lg"
              className="w-full border-amber-200 bg-white/80 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition-all duration-300 shadow-sm"
              onClick={handleGoogleSignIn}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </EnhancedButton>

            {federationEnabled && (
              <EnhancedButton
                type="button"
                variant="outline"
                size="lg"
                className="w-full border-indigo-200 bg-white/80 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 transition-all duration-300 shadow-sm"
                onClick={handleVidyaverseSignIn}
              >
                <GraduationCap className="h-5 w-5 mr-2 text-indigo-600" />
                Sign in with Institution SSO
              </EnhancedButton>
            )}
          </form>
        </EnhancedCardContent>

        <EnhancedCardFooter className="flex flex-col space-y-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                New to Book Buddy?
              </span>
            </div>
          </div>

          <EnhancedButton
            variant="outline"
            size="lg"
            className="w-full border-amber-200 bg-white/80 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition-all duration-300 shadow-sm"
            asChild
          >
            <Link href="/register" className="flex items-center justify-center gap-2 font-semibold">
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </EnhancedButton>
        </EnhancedCardFooter>
      </EnhancedCard>
    </AuthBackdrop>
  );
}