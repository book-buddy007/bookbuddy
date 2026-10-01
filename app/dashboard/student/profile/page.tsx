"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { Input } from "@/components/ui/input"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  User, Mail, IdCard, Calendar, Settings, Shield, Bell, Palette, Type, Eye,
  Camera, Save, Loader2, CheckCircle2, Crown, Sparkles, BookOpen, Clock, TrendingUp,
  KeyRound, AlertTriangle, Phone, BadgeCheck, SendHorizontal, RotateCcw
} from "@/components/ui/icons"
import adminStyles from "@/app/admin.module.css"

export default function StudentProfilePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore()
  const { userProfile, loading: profileLoading, error: profileError } = useUserProfile()

  // Editable form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notifications, setNotifications] = useState("all")
  const [theme, setTheme] = useState("system")
  const [fontSize, setFontSize] = useState("normal")
  const [contrast, setContrast] = useState("normal")

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // OTP verification state
  const [emailOtp, setEmailOtp] = useState("")
  const [phoneOtp, setPhoneOtp] = useState("")
  const [showEmailOtp, setShowEmailOtp] = useState(false)
  const [showPhoneOtp, setShowPhoneOtp] = useState(false)
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false)
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0)
  const [phoneOtpCountdown, setPhoneOtpCountdown] = useState(0)

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate form when profile loads
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "")
      setEmail(userProfile.email || "")
      setPhone(userProfile.phone || "")
      setNotifications(userProfile.preferences?.notifications || "all")
      setTheme(userProfile.preferences?.theme || "system")
      setFontSize(userProfile.preferences?.fontSize || "normal")
      setContrast(userProfile.preferences?.contrast || "normal")
    }
  }, [userProfile])

  // Track changes
  useEffect(() => {
    if (!userProfile) return
    const changed =
      name !== (userProfile.name || "") ||
      email !== (userProfile.email || "") ||
      phone !== (userProfile.phone || "") ||
      notifications !== (userProfile.preferences?.notifications || "all") ||
      theme !== (userProfile.preferences?.theme || "system") ||
      fontSize !== (userProfile.preferences?.fontSize || "normal") ||
      contrast !== (userProfile.preferences?.contrast || "normal")
    setHasChanges(changed)
  }, [name, email, phone, notifications, theme, fontSize, contrast, userProfile])

  // Countdown timers for OTP resend
  useEffect(() => {
    if (emailOtpCountdown > 0) {
      const timer = setTimeout(() => setEmailOtpCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [emailOtpCountdown])

  useEffect(() => {
    if (phoneOtpCountdown > 0) {
      const timer = setTimeout(() => setPhoneOtpCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [phoneOtpCountdown])

  const handleSaveProfile = async () => {
    if (!hasChanges) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          phone,
          preferences: { notifications, theme, fontSize, contrast },
        }),
      })

      if (res.ok) {
        toast.success("Profile updated successfully!", { icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> })
        setHasChanges(false)
        // Invalidate cache so next load gets fresh data
        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Failed to update profile")
      }
    } catch (error) {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill all password fields")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setIsSavingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (res.ok) {
        toast.success("Password changed successfully!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setShowPasswordSection(false)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Failed to change password")
      }
    } catch (error) {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleCancel = () => {
    if (userProfile) {
      setName(userProfile.name || "")
      setEmail(userProfile.email || "")
      setPhone(userProfile.phone || "")
      setNotifications(userProfile.preferences?.notifications || "all")
      setTheme(userProfile.preferences?.theme || "system")
      setFontSize(userProfile.preferences?.fontSize || "normal")
      setContrast(userProfile.preferences?.contrast || "normal")
    }
    setHasChanges(false)
  }

  // ===== OTP Verification Handlers =====
  const handleSendEmailOtp = async () => {
    setIsSendingEmailOtp(true)
    try {
      const res = await fetch("/api/user/verify/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "email", email: userProfile.email }),
      })
      if (res.ok) {
        toast.success("Verification code sent to your email!")
        setShowEmailOtp(true)
        setEmailOtpSent(true)
        setEmailOtpCountdown(60)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Failed to send verification code")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsSendingEmailOtp(false)
    }
  }

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length < 4) {
      toast.error("Please enter the verification code")
      return
    }
    setIsVerifyingEmail(true)
    try {
      const res = await fetch("/api/user/verify/check-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "email", otp: emailOtp }),
      })
      if (res.ok) {
        toast.success("Email verified successfully!")
        setShowEmailOtp(false)
        setEmailOtp("")
        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Invalid verification code")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsVerifyingEmail(false)
    }
  }

  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number first and save your profile")
      return
    }
    setIsSendingPhoneOtp(true)
    try {
      const res = await fetch("/api/user/verify/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "phone", phone }),
      })
      if (res.ok) {
        toast.success("Verification code sent via SMS!")
        setShowPhoneOtp(true)
        setPhoneOtpSent(true)
        setPhoneOtpCountdown(60)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Failed to send SMS code")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsSendingPhoneOtp(false)
    }
  }

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length < 4) {
      toast.error("Please enter the verification code")
      return
    }
    setIsVerifyingPhone(true)
    try {
      const res = await fetch("/api/user/verify/check-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "phone", otp: phoneOtp }),
      })
      if (res.ok) {
        toast.success("Phone verified successfully!")
        setShowPhoneOtp(false)
        setPhoneOtp("")
        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Invalid verification code")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  const tierConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    FREE: { label: "Free", color: "bg-slate-100 text-slate-700 border-slate-200", icon: <BookOpen className="h-3.5 w-3.5" /> },
    trial: { label: "Trial", color: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3.5 w-3.5" /> },
    BRONZE: { label: "Bronze", color: "bg-orange-50 text-orange-700 border-orange-200", icon: <Shield className="h-3.5 w-3.5" /> },
    SILVER: { label: "Silver", color: "bg-slate-50 text-slate-600 border-slate-300", icon: <Shield className="h-3.5 w-3.5" /> },
    GOLD: { label: "Gold", color: "bg-yellow-50 text-yellow-700 border-yellow-300", icon: <Crown className="h-3.5 w-3.5" /> },
    DIAMOND: { label: "Diamond", color: "bg-amber-50 text-amber-700 border-amber-300", icon: <Sparkles className="h-3.5 w-3.5" /> },
  }

  const currentTier = tierConfig[user?.subscriptionTier || "FREE"] || tierConfig.FREE

  // Loading state
  if (profileLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 border-4 border-amber-100 dark:border-amber-900/30 rounded-full" />
            <div className="h-14 w-14 border-4 border-transparent border-t-amber-600 rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-bb-accent">
            Loading your profile...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (profileError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <h3 className="font-bold text-red-800 dark:text-red-200 text-lg mb-2">Error Loading Profile</h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{profileError}</p>
        </div>
      </div>
    )
  }

  if (!userProfile) return null

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10 max-w-5xl mx-auto">

      {/* ===== Page Header ===== */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
          <User className="h-9 w-9 text-amber-600 dark:text-amber-400" />
          My Profile
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg">
          Manage your personal information, preferences, and security settings
        </p>
      </div>

      {/* ===== Profile Header Card ===== */}
      <EnhancedCard variant="elevated" className={`${adminStyles.scallopedArch} overflow-hidden`}>
        <div className={adminStyles.archMotif} />
        {/* Gradient banner */}
        <div className="h-32 md:h-40 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-950" />
        </div>

        <div className="px-6 md:px-8 pb-8 -mt-16 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-28 w-28 md:h-32 md:w-32 ring-4 ring-white dark:ring-slate-900 shadow-2xl border-2 border-amber-200/50">
                <AvatarImage src={userProfile.profileImage || "/placeholder-user.jpg"} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  {userProfile.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
            </div>

            {/* Name + Meta */}
            <div className="flex-1 space-y-1.5 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                  {userProfile.name}
                </h2>
                <Badge variant="outline" className={`${currentTier.color} gap-1.5 text-xs font-semibold px-3 py-1`}>
                  {currentTier.icon}
                  {currentTier.label} Plan
                </Badge>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                {userProfile.email}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5" />
                  {userProfile.studentId}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(userProfile.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric"
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </EnhancedCard>

      {/* ===== Personal Information ===== */}
      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
            <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Personal Information
          </EnhancedCardTitle>
          <EnhancedCardDescription className="text-slate-500 dark:text-slate-400">
            Update your name, email, and contact number
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10 space-y-5 pt-2">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="profile-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" /> Full Name
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-11 rounded-xl border-amber-200/40 dark:border-amber-900/30 focus:border-amber-500 transition-colors"
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-500" /> Email Address
                {userProfile.pendingEmail ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pending: {userProfile.pendingEmail}
                  </span>
                ) : userProfile.emailVerified ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/20 px-2 py-0.5 rounded-full">
                    Unverified
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 flex-1 rounded-xl border-amber-200/40 dark:border-amber-900/30 focus:border-amber-500 transition-colors"
                  placeholder="your@email.com"
                />
                {(userProfile.pendingEmail || (!userProfile.emailVerified && email === userProfile.email)) && (
                   <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={isSendingEmailOtp}
                    className="h-11 px-4 inline-flex items-center justify-center gap-1 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSendingEmailOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </button>
                )}
              </div>
              {/* Email OTP Inline */}
              {showEmailOtp && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-9 w-32 rounded-lg border-amber-300/50 text-center tracking-[0.3em] font-mono text-base"
                    placeholder="------"
                    maxLength={6}
                  />
                  <EnhancedButton
                    size="sm"
                    onClick={handleVerifyEmailOtp}
                    disabled={isVerifyingEmail || emailOtp.length < 4}
                    className="text-xs h-9 gap-1"
                  >
                    {isVerifyingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Verify
                  </EnhancedButton>
                  {emailOtpCountdown > 0 ? (
                    <span className="text-xs text-slate-400 whitespace-nowrap">Resend in {emailOtpCountdown}s</span>
                  ) : (
                    <button onClick={handleSendEmailOtp} disabled={isSendingEmailOtp} className="text-xs text-amber-600 hover:underline flex items-center gap-1 whitespace-nowrap">
                      <RotateCcw className="h-3 w-3" /> Resend
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="profile-phone" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-500" /> Contact Number
                {userProfile.pendingPhone ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pending: {userProfile.pendingPhone}
                  </span>
                ) : userProfile.phoneVerified ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/20 px-2 py-0.5 rounded-full">
                    Unverified
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d+\-\s()]/g, ''))}
                  className="h-11 flex-1 rounded-xl border-amber-200/40 dark:border-amber-900/30 focus:border-amber-500 transition-colors"
                  placeholder="+91 98765 43210"
                />
                {((userProfile.pendingPhone) || (!userProfile.phoneVerified && phone === userProfile.phone && phone.length >= 10)) && (
                   <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={isSendingPhoneOtp}
                    className="h-11 px-4 inline-flex items-center justify-center gap-1 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSendingPhoneOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </button>
                )}
              </div>
              {/* Phone OTP Inline */}
              {showPhoneOtp && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={phoneOtp}
                    onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-9 w-32 rounded-lg border-amber-300/50 text-center tracking-[0.3em] font-mono text-base"
                    placeholder="------"
                    maxLength={6}
                  />
                  <EnhancedButton
                    size="sm"
                    onClick={handleVerifyPhoneOtp}
                    disabled={isVerifyingPhone || phoneOtp.length < 4}
                    className="text-xs h-9 gap-1"
                  >
                    {isVerifyingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Verify
                  </EnhancedButton>
                  {phoneOtpCountdown > 0 ? (
                    <span className="text-xs text-slate-400 whitespace-nowrap">Resend in {phoneOtpCountdown}s</span>
                  ) : (
                    <button onClick={handleSendPhoneOtp} disabled={isSendingPhoneOtp} className="text-xs text-amber-600 hover:underline flex items-center gap-1 whitespace-nowrap">
                      <RotateCcw className="h-3 w-3" /> Resend
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <IdCard className="h-4 w-4 text-slate-400" /> Student ID
              </label>
              <Input
                value={userProfile.studentId || ""}
                readOnly
                className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-400" /> Role
              </label>
              <Input
                value={(userProfile.role || "student").charAt(0).toUpperCase() + (userProfile.role || "student").slice(1)}
                readOnly
                className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> Member Since
              </label>
              <Input
                value={new Date(userProfile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                readOnly
                className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      {/* ===== Preferences ===== */}
      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
            <Settings className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Preferences
          </EnhancedCardTitle>
          <EnhancedCardDescription className="text-slate-500 dark:text-slate-400">
            Customize notifications and appearance
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10 space-y-5 pt-2">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" /> Notifications
              </label>
              <select
                value={notifications}
                onChange={e => setNotifications(e.target.value)}
                className="h-11 w-full rounded-xl border border-amber-200/40 dark:border-amber-900/30 bg-white dark:bg-slate-900 px-4 text-sm font-medium focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              >
                <option value="all">All Notifications</option>
                <option value="important">Important Only</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-500" /> Theme
              </label>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="h-11 w-full rounded-xl border border-amber-200/40 dark:border-amber-900/30 bg-white dark:bg-slate-900 px-4 text-sm font-medium focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              >
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      {/* ===== Accessibility ===== */}
      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
            <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Accessibility
          </EnhancedCardTitle>
          <EnhancedCardDescription className="text-slate-500 dark:text-slate-400">
            Adjust font size and display contrast for comfortable reading
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10 space-y-5 pt-2">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Type className="h-4 w-4 text-amber-500" /> Font Size
              </label>
              <select
                value={fontSize}
                onChange={e => setFontSize(e.target.value)}
                className="h-11 w-full rounded-xl border border-amber-200/40 dark:border-amber-900/30 bg-white dark:bg-slate-900 px-4 text-sm font-medium focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="x-large">Extra Large</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-500" /> Contrast
              </label>
              <select
                value={contrast}
                onChange={e => setContrast(e.target.value)}
                className="h-11 w-full rounded-xl border border-amber-200/40 dark:border-amber-900/30 bg-white dark:bg-slate-900 px-4 text-sm font-medium focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              >
                <option value="normal">Normal</option>
                <option value="high">High Contrast</option>
              </select>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      {/* ===== Security ===== */}
      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Security
          </EnhancedCardTitle>
          <EnhancedCardDescription className="text-slate-500 dark:text-slate-400">
            Manage your account password
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10 space-y-5 pt-2">
          {!showPasswordSection ? (
            <EnhancedButton
              onClick={() => setShowPasswordSection(true)}
              className="bg-white/50 hover:bg-white/80 text-amber-700 border-amber-200 gap-2"
            >
              <KeyRound className="h-4 w-4" /> Change Password
            </EnhancedButton>
          ) : (
            <div className="space-y-5 p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="h-11 rounded-xl border-amber-200/40 dark:border-amber-900/30"
                  placeholder="Enter current password"
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="h-11 rounded-xl border-amber-200/40 dark:border-amber-900/30"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="h-11 rounded-xl border-amber-200/40 dark:border-amber-900/30"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <EnhancedButton
                  onClick={handleChangePassword}
                  disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="shadow-lg hover:shadow-xl border-transparent gap-2"
                >
                  {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Update Password
                </EnhancedButton>
                <EnhancedButton
                  onClick={() => {
                    setShowPasswordSection(false)
                    setCurrentPassword("")
                    setNewPassword("")
                    setConfirmPassword("")
                  }}
                  className="bg-white/50 hover:bg-white/80 text-slate-700 border-slate-200"
                >
                  Cancel
                </EnhancedButton>
              </div>
            </div>
          )}
        </EnhancedCardContent>
      </EnhancedCard>

      {/* ===== Account Info (Read-Only) ===== */}
      <EnhancedCard variant="elevated" className={`${adminStyles.scallopedArch} border-amber-200/30 dark:border-amber-900/20`}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription & Account
          </EnhancedCardTitle>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10 pt-2">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Current Plan</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${currentTier.color} gap-1 text-xs font-semibold`}>
                  {currentTier.icon}
                  {currentTier.label}
                </Badge>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Status</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">
                {user?.subscriptionStatus || "Active"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Member Since</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {new Date(userProfile.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </p>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      {/* ===== Sticky Save Bar ===== */}
      {hasChanges && (
        <div className="sticky bottom-6 z-40 flex justify-end">
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-amber-200/50 dark:border-amber-800/50 shadow-2xl shadow-amber-500/10">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 hidden sm:block">
              You have unsaved changes
            </span>
            <EnhancedButton
              onClick={handleCancel}
              className="bg-white/50 hover:bg-white/80 text-slate-700 border-slate-200"
            >
              Discard
            </EnhancedButton>
            <EnhancedButton
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="shadow-lg hover:shadow-xl border-transparent gap-2 min-w-[130px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </EnhancedButton>
          </div>
        </div>
      )}
    </div>
  )
}
