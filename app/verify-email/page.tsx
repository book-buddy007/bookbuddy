"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AuthCard, AuthCardSkeleton } from "@/components/auth/auth-card";

type Status = "loading" | "success" | "error" | "no-token";

function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      setMessage("Open the verification link from the email we sent when you registered.");
      return;
    }

    verifyEmail(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setStatus("loading");

      const response = await fetch("/api/user/verify/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setStatus("success");
        setMessage(data.message || "Email verified. You can now use your account.");

        // Continue to onboarding after 3 seconds
        setTimeout(() => {
          router.push("/onboarding");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || data.message || "Failed to verify email. The link may have expired.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred while verifying your email. Please try again.");
      console.error("Email verification error:", error);
    }
  };

  if (status === "loading") {
    return (
      <AuthCard icon="loader" title="Verifying your email" description="This only takes a moment…">
        <div className="h-1.5 overflow-hidden rounded-full bg-bb-surface-2">
          <div className="h-full w-1/3 animate-[bb-loader_1.2s_ease-in-out_infinite] rounded-full bg-bb-accent" />
        </div>
      </AuthCard>
    );
  }

  if (status === "success") {
    return (
      <AuthCard icon="check-circle" tone="success" title="Email verified" description={`${message} Taking you to setup…`}>
        <Button size="lg" className="w-full" onClick={() => router.push("/onboarding")}>
          Continue
          <Icon name="arrow-right" fillLayer={false} />
        </Button>
      </AuthCard>
    );
  }

  if (status === "error") {
    return (
      <AuthCard icon="x-circle" tone="danger" title="Verification failed" description={message}>
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-bb-muted">
            Links expire. Sign in with your email and password and we&apos;ll offer to send a fresh one.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon="mail" title="Verify your email" description={message}>
      <Button asChild size="lg" className="w-full">
        <Link href="/login">Go to sign in</Link>
      </Button>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthBackdrop>
      <Suspense fallback={<AuthCardSkeleton />}>
        <VerifyEmail />
      </Suspense>
    </AuthBackdrop>
  );
}
