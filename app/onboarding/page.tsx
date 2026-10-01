'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authClient } from '@/lib/auth-client';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Progress } from "@/components/ui/progress";
import { 
  Building, 
  UserCircle,
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck,
  Mail,
  Phone,
  Search,
  MessageCircle,
  MessageSquare
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { userProfile, loading, refetch } = useUserProfile();
  
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Phone and OTP State
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeOtpType, setActiveOtpType] = useState<null | 'email' | 'phone'>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [profileError, setProfileError] = useState('');

  // B2B Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

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
      if (userProfile.onboardingCompleted || userProfile.onboardingStep >= 3) {
        router.replace('/dashboard/student');
      } else {
        // Step 1: Verification, Step 2: Path Choice
        setCurrentStep(userProfile.onboardingStep || 1);
      }
    }
  }, [userProfile, router, currentStep]);

  // Polling for email verification with exponential backoff
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
        // Create Join Request First
        await fetch('/api/join-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, tenantId })
        });
      }

      // Finalize Onboarding
      await fetch('/api/user/complete-onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          onboardingStep: 3,
          ...(gradeLevel ? { gradeLevel } : {}),
        }),
      });

      // Use router push since we now use React Query to manage state cleanly
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

  if (loading || currentStep === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-blue-900 dark:to-cyan-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const stepsTotal = 2;
  const progress = (currentStep / stepsTotal) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-blue-900 dark:to-cyan-900 p-4 flex flex-col relative overflow-hidden">
      
      {/* Top Navbar for Logout */}
      <div className="w-full flex justify-end p-4 z-20">
        <EnhancedButton variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium" onClick={handleLogout}>
          Log Out
        </EnhancedButton>
      </div>

      <div className="w-full max-w-3xl mx-auto my-auto relative z-10 flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep} of {stepsTotal}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <EnhancedCard variant="glass" className="vg-glass-premium animate-vg-fade-in">
          {/* STEP 1: VERIFICATION */}
          {currentStep === 1 && (
            <>
              <EnhancedCardHeader className="text-center space-y-2">
                <EnhancedCardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                  Secure Your Account
                </EnhancedCardTitle>
                <EnhancedCardDescription>
                  Keep your library safe. We just need to verify your contact details.
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent className="space-y-6">
                
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Email Address</h4>
                        {/* truncate + min-w-0 above: a long email must not push the
                            "Verified" badge past the card edge on a narrow screen. */}
                        <p className="text-sm text-gray-500 truncate">{userProfile?.email}</p>
                      </div>
                    </div>
                    {userProfile?.emailVerified ? (
                      <span className="flex items-center shrink-0 whitespace-nowrap text-green-600 text-sm font-medium"><CheckCircle2 className="w-4 h-4 mr-1"/> Verified</span>
                    ) : (
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center text-amber-500 text-sm font-medium whitespace-nowrap">Pending Verification</span>
                          {activeOtpType !== 'email' && (
                            <EnhancedButton size="sm" variant="outline" onClick={() => handleSendOtp('email')} loading={otpSending && activeOtpType !== 'phone'}>Verify</EnhancedButton>
                          )}
                        </div>
                        {otpError && !activeOtpType && <span className="text-xs text-red-500">{otpError}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile verification suppressed for development phase */}


                {/* Verification Section */}
                {(activeOtpType || (!userProfile?.emailVerified ? 'email' : null)) && (
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 animate-vg-fade-in">
                    <h4 className="font-semibold mb-2">Verify your {activeOtpType || 'email'}</h4>
                    
                    {activeOtpType === 'email' || (!userProfile?.emailVerified && !activeOtpType) ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {activeOtpType === 'email' 
                            ? "Action Required: We sent a secure link to your email. Please click the link to verify your account."
                            : "Your email must be verified to continue."}
                        </p>
                        {(!userProfile?.emailVerified && !activeOtpType) && (
                          <EnhancedButton variant="vg-primary" onClick={() => handleSendOtp('email')} loading={otpSending}>
                            Send Verification Link
                          </EnhancedButton>
                        )}
                        {(activeOtpType === 'email') && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Waiting for verification...
                            </div>
                            <EnhancedButton variant="ghost" onClick={() => setActiveOtpType(null)}>Cancel</EnhancedButton>
                          </div>
                        )}
                        {otpError && <p className="text-sm text-red-500 mt-2">{otpError}</p>}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeOtpType === 'phone' ? (
                          <div className="flex flex-col mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-medium bg-green-100/50 dark:bg-green-900/20 w-fit px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800/60 mb-2">
                              <WhatsappIcon className="w-4 h-4 text-green-600" />
                              <span>We've sent a 6-digit code to your WhatsApp</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400">We've sent a 6-digit code. Please enter it below.</p>
                        )}
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Enter 6-digit code" 
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="max-w-[200px]"
                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                          />
                          <EnhancedButton variant="vg-primary" onClick={handleVerifyOtp} loading={otpVerifying}>
                            Submit
                          </EnhancedButton>
                          <EnhancedButton variant="ghost" onClick={() => setActiveOtpType(null)}>Cancel</EnhancedButton>
                        </div>
                        {activeOtpType === 'phone' && (
                          <p className="text-xs text-muted-foreground mt-3 flex items-center">
                            Didn't get it on WhatsApp?{' '}
                            <button className="ml-1 text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center" onClick={() => handleSendOtp('phone')}>
                              <MessageSquare className="w-3 h-3 mr-1"/> Send via SMS instead
                            </button>
                          </p>
                        )}
                        {otpError && <p className="text-sm text-red-500 mt-2">{otpError}</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <EnhancedButton 
                    variant="vg-primary" 
                    onClick={handleNextStep}
                    disabled={!userProfile?.emailVerified}
                    icon={<ArrowRight className="h-4 w-4" />}
                    iconPosition="right"
                  >
                    Continue
                  </EnhancedButton>
                </div>
              </EnhancedCardContent>
            </>
          )}

          {/* STEP 2: PATH CHOICE */}
          {currentStep === 2 && (
            <>
              <EnhancedCardHeader className="text-center space-y-2">
                <EnhancedCardTitle className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Choose Your Path
                </EnhancedCardTitle>
                <EnhancedCardDescription>
                  Are you learning independently or joining a school/college library?
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent className="space-y-6">
                {showGradePicker ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Which class are you in?</h4>
                      <p className="text-sm text-gray-500">This helps us match content and quizzes to your level. You can't change this later without contacting support.</p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => { setSelectedGrade(grade); setGradeError(''); }}
                          className={`h-12 rounded-lg border-2 font-semibold text-sm transition-all ${
                            selectedGrade === grade
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                    {gradeError && <p className="text-sm text-red-500">{gradeError}</p>}
                    <div className="flex justify-between pt-2">
                      <EnhancedButton variant="ghost" onClick={() => { setShowGradePicker(false); setSelectedGrade(null); setGradeError(''); }}>
                        Back
                      </EnhancedButton>
                      <EnhancedButton variant="vg-primary" onClick={handleConfirmGrade} loading={isCompleting}>
                        Continue
                      </EnhancedButton>
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* B2C Option */}
                  <div className="p-6 rounded-xl border-2 border-transparent hover:border-blue-500 bg-white dark:bg-gray-900 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                       onClick={() => setShowGradePicker(true)}>
                    <div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg inline-block mb-4">
                        <UserCircle className="h-8 w-8 text-blue-600" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Independent Learner</h4>
                      <p className="text-sm text-gray-500">I want to browse the public library and learn on my own.</p>
                    </div>
                    <EnhancedButton className="mt-6 w-full" variant="outline">Select</EnhancedButton>
                  </div>

                  {/* B2B Option */}
                  <div className="p-6 rounded-xl border-2 border-transparent hover:border-teal-500 bg-white dark:bg-gray-900 shadow-sm transition-all flex flex-col justify-between"
                       >
                    <div>
                      <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg inline-block mb-4">
                        <Building className="h-8 w-8 text-teal-600" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join an Institution</h4>
                      <p className="text-sm text-gray-500 mb-4">I belong to a school, college, or organization library.</p>
                      
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Search for your school..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchInstitutions()}
                        />
                        <EnhancedButton variant="vg-primary" onClick={searchInstitutions} loading={searching}>
                          <Search className="h-4 w-4"/>
                        </EnhancedButton>
                      </div>

                      {institutions.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
                          {institutions.map(inst => (
                            <div key={inst.id} className="p-3 flex justify-between items-center rounded-lg border border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                              <span className="font-medium text-sm truncate">{inst.name}</span>
                              <EnhancedButton 
                                size="sm" 
                                onClick={() => handleCompleteOnboarding('INSTITUTIONAL', inst.id)}
                                loading={isCompleting}
                              >
                                Request Join
                              </EnhancedButton>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </EnhancedCardContent>
            </>
          )}

        </EnhancedCard>
      </div>
    </div>
  );
}
