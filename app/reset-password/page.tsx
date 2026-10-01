'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardFooter, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GraduationCap, Lock, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { AuthBackdrop, authCardClassName, authLogoHaloClassName } from '@/components/auth/auth-backdrop';
import { MandalaMark } from '@/components/auth/mandala-mark';

// Define the validation schema using Zod
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

// Infer the type from the schema
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
      
      const response = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: token,
          password: data.password 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset password');
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
              {success ? 'Password Reset!' : 'Reset Password'}
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-base text-[#5D4037]">
              {success 
                ? "Your password has been successfully reset" 
                : "Enter your new password below"}
            </EnhancedCardDescription>
          </div>
        </EnhancedCardHeader>

        <EnhancedCardContent className="relative z-10">
          {success ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">Success!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Your password has been reset successfully. You can now log in with your new password.
                  Redirecting to login page...
                </AlertDescription>
              </Alert>

              <EnhancedButton
                size="lg"
                className="w-full !bg-gradient-to-r !from-amber-600 !to-amber-500 hover:!from-amber-700 hover:!to-amber-600 !text-white !shadow-[0_8px_30px_rgba(217,119,6,0.2)] hover:!shadow-[0_12px_40px_rgba(217,119,6,0.3)] border-transparent transition-all duration-300"
                onClick={() => router.push('/login')}
                icon={<ArrowRight className="h-5 w-5" />}
                iconPosition="right"
              >
                Go to Login
              </EnhancedButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-vg-fade-in">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-[#1A237E]">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="h-11 pl-10 pr-10 transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm border-amber-200 text-slate-800 placeholder:text-slate-400"
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-vg-error-500 animate-vg-fade-in">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-bold text-[#1A237E]">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="h-11 pl-10 pr-10 transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm border-amber-200 text-slate-800 placeholder:text-slate-400"
                    {...register("confirmPassword")}
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-vg-error-500 animate-vg-fade-in">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <EnhancedButton
                type="submit"
                size="lg"
                className="w-full !bg-gradient-to-r !from-amber-600 !to-amber-500 hover:!from-amber-700 hover:!to-amber-600 !text-white !shadow-[0_8px_30px_rgba(217,119,6,0.2)] hover:!shadow-[0_12px_40px_rgba(217,119,6,0.3)] border-transparent transition-all duration-300"
                loading={isLoading}
                loadingText="Resetting password..."
                icon={<Lock className="h-5 w-5" />}
                iconPosition="right"
                disabled={!token}
              >
                Reset Password
              </EnhancedButton>
            </form>
          )}
        </EnhancedCardContent>

        {!success && (
          <EnhancedCardFooter className="flex flex-col space-y-4 relative z-10">
            <div className="text-center text-sm text-[#5D4037]">
              Remember your password?{' '}
              <Link href="/login" className="text-amber-600 hover:text-amber-800 hover:underline font-semibold">
                Back to Login
              </Link>
            </div>
          </EnhancedCardFooter>
        )}
      </EnhancedCard>
    </AuthBackdrop>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FFFCF3]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

