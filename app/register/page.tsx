'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardFooter, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, GraduationCap, UserPlus, ArrowRight, CheckCircle2, Mail } from '@/components/ui/icons';
import Link from 'next/link';
import { AuthBackdrop, authCardClassName, authLogoHaloClassName } from '@/components/auth/auth-backdrop';
import { MandalaMark } from '@/components/auth/mandala-mark';

// Define the validation schema using Zod
const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  // Add password confirmation later if needed
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

// Infer the type from the schema
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    clearError(); // Clear previous global errors
    setRegisterError(null); // Clear previous local errors
    setRegistrationSuccess(false); // Clear previous success state

    try {
      await registerUser(data.name, data.email, data.password);
      // Registration successful - show success message
      setRegistrationSuccess(true);
      setRegisteredEmail(data.email);

      // Redirect to login page after 5 seconds
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } catch (err: any) {
      setRegisterError(err.message || "An unexpected error occurred during registration.");
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
      setRegisterError('Failed to sign in with Google. Please try again.');
    }
  };

   // If already authenticated, redirect to onboarding (using useEffect to avoid render-phase updates)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/onboarding'); // Use replace to avoid adding register to history
    }
  }, [isAuthenticated, router]);

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
              Join Book Buddy
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-base text-[#5D4037]">
              Create your account to start your learning journey
            </EnhancedCardDescription>
          </div>
        </EnhancedCardHeader>

        <EnhancedCardContent className="relative z-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Display registration success message */}
            {registrationSuccess && (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-vg-fade-in">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100 font-semibold">
                  Registration Successful! 🎉
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200 space-y-2">
                  <p>
                    Your account has been created successfully!
                  </p>
                  <div className="flex items-start gap-2 mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Mail className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Check your email</p>
                      <p className="text-green-700 dark:text-green-300">
                        We've sent a verification link to <strong>{registeredEmail}</strong>.
                        Please verify your email before logging in.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm mt-3 text-green-700 dark:text-green-300">
                    Redirecting to login page in 5 seconds...
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Display registration errors */}
            {(error || registerError) && !registrationSuccess && (
              <Alert variant="destructive" className="animate-vg-shake">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Registration Failed</AlertTitle>
                <AlertDescription>
                  {error || registerError}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold text-[#1A237E]">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                className="h-11 transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm border-amber-200 text-slate-800 placeholder:text-slate-400"
                {...register("name")}
                aria-invalid={errors.name ? "true" : "false"}
                disabled={registrationSuccess}
              />
              {errors.name && (
                <p className="text-sm text-vg-error-500 animate-vg-fade-in">
                  {errors.name.message}
                </p>
              )}
            </div>

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
                disabled={registrationSuccess}
              />
              {errors.email && (
                <p className="text-sm text-vg-error-500 animate-vg-fade-in">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-bold text-[#1A237E]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password (min. 8 characters)"
                className="h-11 transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm border-amber-200 text-slate-800 placeholder:text-slate-400"
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
                disabled={registrationSuccess}
              />
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
              loadingText="Creating account..."
              icon={<UserPlus className="h-5 w-5" />}
              iconPosition="right"
              disabled={registrationSuccess}
            >
              Create Account
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

            {/* Google Sign-In Button */}
            <EnhancedButton
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={registrationSuccess}
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
              Sign up with Google
            </EnhancedButton>
          </form>
        </EnhancedCardContent>

        <EnhancedCardFooter className="flex flex-col space-y-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          <EnhancedButton
            variant="outline"
            size="lg"
            className="w-full"
            asChild
          >
            <Link href="/login" className="flex items-center justify-center gap-2">
              Sign In
              <ArrowRight className="h-4 w-4" />
            </Link>
          </EnhancedButton>
        </EnhancedCardFooter>
      </EnhancedCard>
    </AuthBackdrop>
  );
}