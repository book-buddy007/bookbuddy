'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authClient } from '@/lib/auth-client';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthCardSkeleton } from '@/components/auth/auth-card';
import { cn } from '@/lib/utils';

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const STEPS = ['Verify your email', 'Choose your path'];

function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Setup progress" className="mb-5 flex items-center gap-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-3" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                done && 'bg-bb-success text-white',
                active && 'bg-bb-primary text-white shadow-gloss',
                !done && !active && 'bg-white/10 text-bb-dim',
              )}
            >
              {done ? <Icon name="check" size={16} fillLayer={false} /> : n}
            </span>
            <span className={cn('text-sm font-semibold', active || done ? 'text-white' : 'text-bb-dim')}>{label}</span>
            {n < STEPS.length && <span aria-hidden className="h-px flex-1 bg-bb-night-line-2" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-bb-xl bg-bb-surface p-6 text-bb-text shadow-e2 animate-in fade-in-0 slide-in-from-bottom-2 duration-bb-ui sm:p-10">
      <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]">{title}</h1>
      <p className="mt-2 text-[15px] text-bb-muted">{description}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function IconTile({ name, className }: { name: BBIconName; className?: string }) {
  return (
    <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-bb-md bg-bb-accent-soft text-bb-accent-ink', className)}>
      <Icon name={name} size={24} />
    </span>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { userProfile, loading, refetch } = useUserProfile();

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Phone and OTP state
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeOtpType, setActiveOtpType] = useState<null | 'email' | 'phone'>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [profileError, setProfileError] = useState('');

  // B2B search state
  const [searchQuery, setSearchQuery] = useState('');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  // B2C grade self-report — independent students have no Vidyaverse Class/Section
  // to resolve this from, so it's asked here, once, before completing onboarding.
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [gradeError, setGradeError] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (userProfile && currentStep === null) {
      if (userProfile.onboardingCompleted || (userProfile.onboardingStep ?? 0) >= 3) {
        router.replace('/dashboard/student');
      } else {
        // Step 1: verification, step 2: path choice
        setCurrentStep(userProfile.onboardingStep || 1);
      }
    }
  }, [userProfile, router, currentStep]);

  // Poll for email verification with exponential backoff
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let pollInterval = 3000;
    const maxInterval = 30000;

    const poll = async () => {
      try {
        const res = await fetch('/api/user/profile', { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          if (data.emailVerified) {
            refetch();
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      pollInterval = Math.min(pollInterval * 1.5, maxInterval);
      timeoutId = setTimeout(poll, pollInterval);
    };

    if (activeOtpType === 'email') {
      timeoutId = setTimeout(poll, pollInterval);
    }

    return () => clearTimeout(timeoutId);
  }, [activeOtpType, refetch]);

  useEffect(() => {
    if (userProfile?.phone && !editingPhone) {
      setPhoneNumber(userProfile.phone);
    }
  }, [userProfile?.phone, editingPhone]);

  // Phone capture is kept for when mobile verification is switched back on.
  const handleSavePhone = async () => {
    if (!phoneNumber) return;
    setProfileError('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });
      if (!res.ok) {
        const data = await res.json();
        setProfileError(data.error || 'Failed to save phone');
        return;
      }
      setEditingPhone(false);
      refetch();
    } catch (e) {
      console.error(e);
      setProfileError('Failed to save phone');
    }
  };

  const handleSendOtp = async (type: 'email' | 'phone') => {
    setOtpError('');
    setOtpSending(true);
    try {
      const endpoint = type === 'email' ? '/api/user/verify/send-link' : '/api/user/verify/send-otp';
      const body = type === 'email' ? undefined : JSON.stringify({ type });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body && { body })
      });

      if (!res.ok) {
        const data = await res.json();
        setOtpError(data.error || `Failed to send ${type === 'email' ? 'link' : 'OTP'}`);
      } else {
        const data = await res.json();
        setActiveOtpType(type);
        if (type === 'phone' && data.devOtp) {
          setOtpCode(data.devOtp);
        } else if (type === 'email' && data.devToken) {
          console.log('[DEV] Verification Token:', data.devToken);
        }
      }
    } catch (e) {
      setOtpError(`Failed to send ${type === 'email' ? 'link' : 'OTP'}`);
    }
    setOtpSending(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) return;
    setOtpError('');
    setOtpVerifying(true);
    try {
      const res = await fetch('/api/user/verify/check-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeOtpType || 'email', otp: otpCode })
      });
      if (!res.ok) {
        const data = await res.json();
        setOtpError(data.error || 'Invalid OTP');
      } else {
        setActiveOtpType(null);
        setOtpCode('');
        refetch();
      }
    } catch (e) {
      setOtpError('Failed to verify OTP');
    }
    setOtpVerifying(false);
  };

  const searchInstitutions = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/institutions/browse?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setInstitutions(data.data || []);
      setSearchedFor(searchQuery);
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const handleCompleteOnboarding = async (
    accountType: 'INDEPENDENT' | 'INSTITUTIONAL',
    tenantId?: string,
    gradeLevel?: number,
  ) => {
    setIsCompleting(true);
    try {
      if (accountType === 'INSTITUTIONAL' && tenantId) {
        // Create the join request first
        await fetch('/api/join-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, tenantId })
        });
      }

      // Finalise onboarding
      await fetch('/api/user/complete-onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          onboardingStep: 3,
          ...(gradeLevel ? { gradeLevel } : {}),
        }),
      });

      router.push('/dashboard/student');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsCompleting(false);
    }
  };

  const handleConfirmGrade = () => {
    if (!selectedGrade) {
      setGradeError('Please select your class to continue.');
      return;
    }
    setGradeError('');
    handleCompleteOnboarding('INDEPENDENT', undefined, selectedGrade);
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Save partial progression
      await fetch('/api/user/complete-onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingStep: 2 }),
      });
      setCurrentStep(2);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = '/login';
  };

  const signOut = (
    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 dark:text-white" onClick={handleLogout}>
      <Icon name="logout" fillLayer={false} />
      Sign out
    </Button>
  );

  if (loading || currentStep === null) {
    return (
      <AuthBackdrop>
        <AuthCardSkeleton />
      </AuthBackdrop>
    );
  }

  const spinner = <Icon name="loader" fillLayer={false} className="animate-spin" />;
  const emailVerified = !!userProfile?.emailVerified;
  const showVerifyPanel = !!(activeOtpType || (!emailVerified ? 'email' : null));

  return (
    <AuthBackdrop wide actions={signOut}>
      <Stepper current={currentStep} />

      {/* STEP 1: VERIFICATION */}
      {currentStep === 1 && (
        <StepCard title="Secure your account" description="We just need to confirm your email address before you start reading.">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 rounded-bb-lg border border-bb-border p-4">
              <IconTile name="mail" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Email address</p>
                {/* truncate + min-w-0: a long email must not push the badge off a narrow card */}
                <p className="truncate text-sm text-bb-muted">{userProfile?.email}</p>
              </div>
              {emailVerified ? (
                <StatusBadge status="success" label="Verified" />
              ) : (
                <StatusBadge status="warning" label="Pending" />
              )}
            </div>

            {/* Mobile verification suppressed for the development phase */}

            {showVerifyPanel && (
              <div className="rounded-bb-lg bg-bb-surface-2 p-5 animate-in fade-in-0 duration-bb-ui">
                {activeOtpType === 'email' || (!emailVerified && !activeOtpType) ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-bb-muted">
                      {activeOtpType === 'email'
                        ? 'We sent a secure link to your inbox. Open it to verify; this page updates by itself.'
                        : 'Your email must be verified to continue.'}
                    </p>
                    {!emailVerified && !activeOtpType && (
                      <Button className="self-start" onClick={() => handleSendOtp('email')} disabled={otpSending}>
                        {otpSending ? spinner : <Icon name="send" fillLayer={false} />}
                        {otpSending ? 'Sending…' : 'Send verification link'}
                      </Button>
                    )}
                    {activeOtpType === 'email' && (
                      <div className="flex flex-wrap items-center gap-3">
                        <span role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-bb-cobalt dark:text-bb-periwinkle">
                          {spinner}
                          Waiting for verification…
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setActiveOtpType(null)}>Cancel</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {activeOtpType === 'phone' ? (
                      <p className="inline-flex w-fit items-center gap-2 rounded-full bg-bb-success-soft px-3 py-1.5 text-sm font-semibold text-bb-success-ink">
                        <WhatsappIcon className="h-4 w-4" />
                        We&apos;ve sent a 6-digit code to your WhatsApp
                      </p>
                    ) : (
                      <p className="text-sm text-bb-muted">We&apos;ve sent a 6-digit code. Enter it below.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Input
                        aria-label="6-digit code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="6-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="max-w-[200px] bg-bb-surface"
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                      />
                      <Button onClick={handleVerifyOtp} disabled={otpVerifying}>
                        {otpVerifying && spinner}
                        Submit
                      </Button>
                      <Button variant="ghost" onClick={() => setActiveOtpType(null)}>Cancel</Button>
                    </div>
                    {activeOtpType === 'phone' && (
                      <p className="text-xs text-bb-muted">
                        Didn&apos;t get it on WhatsApp?{' '}
                        <button className="inline-flex items-center gap-1 font-semibold text-bb-accent-ink hover:underline" onClick={() => handleSendOtp('phone')}>
                          <Icon name="chat" size={12} fillLayer={false} /> Send by SMS instead
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {(otpError || profileError) && (
              <Alert variant="destructive">
                <Icon name="alert-circle" fillLayer={false} />
                <AlertDescription>{otpError || profileError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end pt-2">
              <Button size="lg" onClick={handleNextStep} disabled={!emailVerified}>
                Continue
                <Icon name="arrow-right" fillLayer={false} />
              </Button>
            </div>
          </div>
        </StepCard>
      )}

      {/* STEP 2: PATH CHOICE */}
      {currentStep === 2 && (
        showGradePicker ? (
          <StepCard
            title="Which class are you in?"
            description="We use it to match books and quizzes to your level. Changing it later needs a word with support."
          >
            <div role="radiogroup" aria-label="Class" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  role="radio"
                  aria-checked={selectedGrade === grade}
                  onClick={() => { setSelectedGrade(grade); setGradeError(''); }}
                  className={cn(
                    'h-12 rounded-bb-md border-[1.5px] font-display text-base font-bold transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus',
                    selectedGrade === grade
                      ? 'border-bb-accent bg-bb-accent-soft text-bb-accent-ink'
                      : 'border-bb-border text-bb-text hover:border-bb-accent/40',
                  )}
                >
                  {grade}
                </button>
              ))}
            </div>
            {gradeError && <p role="alert" className="mt-3 text-[13px] text-bb-danger-ink">{gradeError}</p>}
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => { setShowGradePicker(false); setSelectedGrade(null); setGradeError(''); }}>
                <Icon name="arrow-left" fillLayer={false} />
                Back
              </Button>
              <Button size="lg" onClick={handleConfirmGrade} disabled={isCompleting}>
                {isCompleting && spinner}
                Finish setup
              </Button>
            </div>
          </StepCard>
        ) : (
          <StepCard title="Choose your path" description="Are you reading on your own, or joining your school or college library?">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* B2C */}
              <button
                type="button"
                onClick={() => setShowGradePicker(true)}
                className="group flex flex-col items-start rounded-bb-lg border-[1.5px] border-bb-border p-6 text-left transition-[border-color,transform,box-shadow] duration-bb-ui hover:border-bb-accent motion-safe:hover:-translate-y-0.5 hover:shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
              >
                <IconTile name="profile" />
                <span className="mt-4 font-display text-xl font-bold">Independent learner</span>
                <span className="mt-1 text-sm text-bb-muted">Browse the public library and learn at your own pace.</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-bb-accent-ink">
                  Choose this
                  <Icon name="arrow-right" size={16} fillLayer={false} className="transition-transform duration-bb-micro group-hover:translate-x-0.5" />
                </span>
              </button>

              {/* B2B */}
              <div className="flex flex-col rounded-bb-lg border-[1.5px] border-bb-border p-6">
                <IconTile name="institution" className="bg-bb-info-soft text-bb-info-ink" />
                <h2 className="mt-4 font-display text-xl font-bold">Join an institution</h2>
                <p className="mt-1 text-sm text-bb-muted">You belong to a school, college or organisation library.</p>

                <form
                  className="mt-5 flex gap-2"
                  role="search"
                  onSubmit={(e) => { e.preventDefault(); searchInstitutions(); }}
                >
                  <Input
                    aria-label="Search institutions"
                    placeholder="Search for your school…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" size="icon-md" aria-label="Search" disabled={searching}>
                    {searching ? spinner : <Icon name="search" fillLayer={false} />}
                  </Button>
                </form>

                {institutions.length > 0 ? (
                  <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {institutions.map((inst) => (
                      <li key={inst.id} className="flex items-center justify-between gap-3 rounded-bb-md bg-bb-surface-2 p-3">
                        <span className="truncate text-sm font-semibold">{inst.name}</span>
                        <Button size="sm" onClick={() => handleCompleteOnboarding('INSTITUTIONAL', inst.id)} disabled={isCompleting}>
                          {isCompleting && spinner}
                          Request to join
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : searchedFor !== null && !searching ? (
                  <p className="mt-4 text-sm text-bb-muted">
                    No institutions match &ldquo;{searchedFor}&rdquo;. Check the spelling, or ask your librarian for the exact name.
                  </p>
                ) : null}
              </div>
            </div>
          </StepCard>
        )
      )}
    </AuthBackdrop>
  );
}
