"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { FormField } from "@/components/ui/form-field"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

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
        toast.success("Profile updated successfully!", { icon: <Icon name="check-circle" size={20} /> })
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
        body: JSON.stringify({ type: "email", email: userProfile?.email }),
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

  const tierConfig: Record<string, { label: string; icon: BBIconName }> = {
    FREE: { label: "Free", icon: "read" },
    trial: { label: "Trial", icon: "calendar" },
    BRONZE: { label: "Bronze", icon: "shield-check" },
    SILVER: { label: "Silver", icon: "shield-check" },
    GOLD: { label: "Gold", icon: "crown" },
    DIAMOND: { label: "Diamond", icon: "sparkles" },
  }

  const currentTier = tierConfig[user?.subscriptionTier || "FREE"] || tierConfig.FREE

  // Loading state
  if (profileLoading || isAuthLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-24 rounded-[22px]" />
        <Skeleton className="h-64 rounded-[22px]" />
        <Skeleton className="h-40 rounded-[22px]" />
      </div>
    )
  }

  // Error state
  if (profileError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="alert" className="max-w-md rounded-[22px] bg-bb-danger-soft p-8 text-center text-bb-danger-ink">
          <Icon name="alert" size={40} className="mx-auto mb-4" />
          <h3 className="mb-2 font-display text-lg font-extrabold">Error loading profile</h3>
          <p className="text-sm">{profileError}</p>
        </div>
      </div>
    )
  }

  if (!userProfile) return null

  const joined = new Date(userProfile.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  })

  // Email / phone verification state, shared by both fields.
  const verifyBadge = (pending: string | null | undefined, verified: boolean | null | undefined) =>
    pending ? (
      <StatusBadge status="pending" label={`Pending: ${pending}`} className="h-6 max-w-[220px] truncate text-xs" />
    ) : verified ? (
      <StatusBadge status="returned" label="Verified" className="h-6 text-xs" />
    ) : (
      <Chip className="h-6 text-xs">Unverified</Chip>
    )

  const otpRow = (
    value: string,
    setValue: (v: string) => void,
    onVerify: () => void,
    verifying: boolean,
    countdown: number,
    onResend: () => void,
    sending: boolean,
    label: string
  ) => (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Input
        aria-label={`${label} verification code`}
        value={value}
        onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="h-10 w-36 text-center font-mono text-base tracking-[0.3em]"
        placeholder="------"
        maxLength={6}
        inputMode="numeric"
      />
      <Button size="sm" onClick={onVerify} disabled={verifying || value.length < 4}>
        {verifying ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="check" size={16} />}
        Verify
      </Button>
      {countdown > 0 ? (
        <span className="whitespace-nowrap text-xs text-bb-muted">Resend in {countdown}s</span>
      ) : (
        <button
          onClick={onResend}
          disabled={sending}
          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-bb-accent-ink hover:underline"
        >
          <Icon name="rotate-ccw" size={14} /> Resend
        </button>
      )}
    </div>
  )

  const sectionCard = "rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6"
  const sectionTitle = "font-display text-xl font-extrabold tracking-[-0.02em]"

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="My profile"
        description="Manage your personal information, preferences, and security settings."
      />

      {/* Identity */}
      <section className={`${sectionCard} flex flex-col items-start gap-5 sm:flex-row sm:items-center`}>
        <div className="relative shrink-0">
          <Avatar className="h-24 w-24 shadow-e2">
            <AvatarImage src={userProfile.profileImage || "/placeholder-user.jpg"} />
            <AvatarFallback className="bg-bb-navy text-2xl font-extrabold text-white">
              {userProfile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-bb-primary text-white shadow-gloss focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Icon name="camera" size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">{userProfile.name}</h2>
            <Chip icon={currentTier.icon} selected>{currentTier.label} plan</Chip>
          </div>
          <p className="flex items-center gap-2 text-sm text-bb-muted">
            <Icon name="mail" size={16} /> {userProfile.email}
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-bb-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="profile" size={14} /> {userProfile.studentId}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={14} /> Joined {joined}
            </span>
          </p>
        </div>
      </section>

      {/* Personal information */}
      <section className={`${sectionCard} space-y-5`}>
        <div>
          <h2 className={sectionTitle}>Personal information</h2>
          <p className="text-[13px] text-bb-muted">Update your name, email, and contact number</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Full name" htmlFor="profile-name">
            <Input id="profile-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </FormField>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="profile-email" className="text-[13px] font-semibold">Email address</label>
              {verifyBadge(userProfile.pendingEmail, userProfile.emailVerified)}
            </div>
            <div className="flex gap-2">
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1"
                placeholder="your@email.com"
              />
              {(userProfile.pendingEmail || (!userProfile.emailVerified && email === userProfile.email)) && (
                <Button type="button" onClick={handleSendEmailOtp} disabled={isSendingEmailOtp}>
                  {isSendingEmailOtp ? <Icon name="loader" size={16} className="animate-spin" /> : "Verify"}
                </Button>
              )}
            </div>
            {showEmailOtp &&
              otpRow(emailOtp, setEmailOtp, handleVerifyEmailOtp, isVerifyingEmail, emailOtpCountdown, handleSendEmailOtp, isSendingEmailOtp, "Email")}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="profile-phone" className="text-[13px] font-semibold">Contact number</label>
              {verifyBadge(userProfile.pendingPhone, userProfile.phoneVerified)}
            </div>
            <div className="flex gap-2">
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d+\-\s()]/g, ''))}
                className="flex-1"
                placeholder="+91 98765 43210"
              />
              {(userProfile.pendingPhone || (!userProfile.phoneVerified && phone === userProfile.phone && phone.length >= 10)) && (
                <Button type="button" onClick={handleSendPhoneOtp} disabled={isSendingPhoneOtp}>
                  {isSendingPhoneOtp ? <Icon name="loader" size={16} className="animate-spin" /> : "Verify"}
                </Button>
              )}
            </div>
            {showPhoneOtp &&
              otpRow(phoneOtp, setPhoneOtp, handleVerifyPhoneOtp, isVerifyingPhone, phoneOtpCountdown, handleSendPhoneOtp, isSendingPhoneOtp, "Phone")}
          </div>

          <FormField label="Student ID">
            <Input value={userProfile.studentId || ""} readOnly className="cursor-not-allowed bg-bb-surface-2 text-bb-muted" />
          </FormField>

          <FormField label="Role">
            <Input
              value={(userProfile.role || "student").charAt(0).toUpperCase() + (userProfile.role || "student").slice(1)}
              readOnly
              className="cursor-not-allowed bg-bb-surface-2 text-bb-muted"
            />
          </FormField>

          <FormField label="Member since">
            <Input value={joined} readOnly className="cursor-not-allowed bg-bb-surface-2 text-bb-muted" />
          </FormField>
        </div>
      </section>

      {/* Preferences */}
      <section className={`${sectionCard} space-y-5`}>
        <div>
          <h2 className={sectionTitle}>Preferences</h2>
          <p className="text-[13px] text-bb-muted">Customize notifications and appearance</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Notifications">
            <Select value={notifications} onValueChange={setNotifications}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All notifications</SelectItem>
                <SelectItem value="important">Important only</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Theme">
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System default</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </section>

      {/* Accessibility */}
      <section className={`${sectionCard} space-y-5`}>
        <div>
          <h2 className={sectionTitle}>Accessibility</h2>
          <p className="text-[13px] text-bb-muted">Adjust font size and display contrast for comfortable reading</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Font size">
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="x-large">Extra large</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Contrast">
            <Select value={contrast} onValueChange={setContrast}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High contrast</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </section>

      {/* Security */}
      <section className={`${sectionCard} space-y-5`}>
        <div>
          <h2 className={sectionTitle}>Security</h2>
          <p className="text-[13px] text-bb-muted">Manage your account password</p>
        </div>
        {!showPasswordSection ? (
          <Button variant="outline" onClick={() => setShowPasswordSection(true)}>
            <Icon name="key" size={18} /> Change password
          </Button>
        ) : (
          <div className="space-y-5 rounded-2xl bg-bb-surface-2 p-5">
            <FormField label="Current password" htmlFor="current-password">
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </FormField>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="New password" htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="Confirm new password" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleChangePassword}
                disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {isSavingPassword ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="key" size={16} />}
                Update password
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordSection(false)
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Subscription & account (read-only) */}
      <section className={`${sectionCard} space-y-4`}>
        <h2 className={sectionTitle}>Subscription &amp; account</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-bb-surface-2 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-bb-muted">Current plan</p>
            <div className="mt-2">
              <Chip icon={currentTier.icon} selected>{currentTier.label}</Chip>
            </div>
          </div>
          <div className="rounded-2xl bg-bb-surface-2 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-bb-muted">Status</p>
            <p className="mt-2 text-sm font-semibold capitalize">{user?.subscriptionStatus || "Active"}</p>
          </div>
          <div className="rounded-2xl bg-bb-surface-2 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-bb-muted">Member since</p>
            <p className="mt-2 text-sm font-semibold">{joined}</p>
          </div>
        </div>
      </section>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="sticky bottom-6 z-40 flex justify-end">
          <div className="flex items-center gap-3 rounded-full bg-bb-surface px-5 py-2.5 shadow-e2">
            <span className="hidden text-sm font-medium text-bb-muted sm:block">You have unsaved changes</span>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSaveProfile} disabled={isSaving} className="min-w-[130px]">
              {isSaving ? (
                <>
                  <Icon name="loader" size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Icon name="save" size={16} /> Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
