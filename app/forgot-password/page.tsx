'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardFooter, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { AuthBackdrop, authCardClassName, authLogoHaloClassName } from '@/components/auth/auth-backdrop';
import { MandalaMark } from '@/components/auth/mandala-mark';

// Define the validation schema using Zod
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// Infer the type from the schema
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
      
      const response = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
              {success ? 'Check Your Email' : 'Forgot Password?'}
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-base text-[#5D4037]">
              {success 
                ? "We've sent you a password reset link" 
                : "Enter your email and we'll send you a reset link"}
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
                <AlertTitle className="text-green-800 dark:text-green-300">Email Sent!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  If an account exists with that email, you'll receive a password reset link shortly. 
                  Please check your inbox and spam folder.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <EnhancedButton
                  size="lg"
                  className="w-full !bg-gradient-to-r !from-amber-600 !to-amber-500 hover:!from-amber-700 hover:!to-amber-600 !text-white !shadow-[0_8px_30px_rgba(217,119,6,0.2)] hover:!shadow-[0_12px_40px_rgba(217,119,6,0.3)] border-transparent transition-all duration-300"
                  onClick={() => router.push('/login')}
                  icon={<ArrowLeft className="h-5 w-5" />}
                  iconPosition="left"
                >
                  Back to Login
                </EnhancedButton>

                <EnhancedButton
                  variant="vg-outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setSuccess(false)}
                >
                  Send Another Email
                </EnhancedButton>
              </div>
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
                <Label htmlFor="email" className="text-sm font-bold text-[#1A237E]">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="h-11 pl-10 transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/60 backdrop-blur-sm border-amber-200 text-slate-800 placeholder:text-slate-400"
                    {...register("email")}
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-vg-error-500 animate-vg-fade-in">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <EnhancedButton
                type="submit"
                size="lg"
                className="w-full !bg-gradient-to-r !from-amber-600 !to-amber-500 hover:!from-amber-700 hover:!to-amber-600 !text-white !shadow-[0_8px_30px_rgba(217,119,6,0.2)] hover:!shadow-[0_12px_40px_rgba(217,119,6,0.3)] border-transparent transition-all duration-300"
                loading={isLoading}
                loadingText="Sending reset link..."
                icon={<Mail className="h-5 w-5" />}
                iconPosition="right"
              >
                Send Reset Link
              </EnhancedButton>
            </form>
          )}
        </EnhancedCardContent>

        {!success && (
          <EnhancedCardFooter className="flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  Remember your password?
                </span>
              </div>
            </div>

            <Link href="/login" className="w-full">
              <EnhancedButton
                variant="vg-outline"
                size="lg"
                className="w-full"
                icon={<ArrowLeft className="h-5 w-5" />}
                iconPosition="left"
              >
                Back to Login
              </EnhancedButton>
            </Link>
          </EnhancedCardFooter>
        )}
      </EnhancedCard>
    </AuthBackdrop>
  );
}

