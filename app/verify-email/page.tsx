"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Mail } from "@/components/ui/icons";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading");
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      setMessage("No verification token provided. Please check your email for the verification link.");
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setStatus("loading");

      const response = await fetch('/api/user/verify/check-link', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully! You can now access your account.");

        // Redirect to onboarding/dashboard after 3 seconds
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


  const handleResendVerification = async () => {
    // This function is not used in this page anymore
    // Resend functionality is now on the login page
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && (
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            )}
            {status === "error" && (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
            {status === "no-token" && (
              <Mail className="h-16 w-16 text-gray-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === "loading" && "Verifying Your Email"}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
            {status === "no-token" && "Email Verification"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your email address..."}
            {status === "success" && "Your email has been successfully verified"}
            {status === "error" && "We couldn't verify your email address"}
            {status === "no-token" && "Verify your email to access your account"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {message && (
            <Alert variant={status === "success" ? "default" : "destructive"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Redirecting to login page in 3 seconds...
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
              >
                Go to Login Now
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                The verification link may have expired or is invalid.
              </p>
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                variant="outline"
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  "Resend Verification Email"
                )}
              </Button>
              <Button
                onClick={() => router.push("/login")}
                variant="ghost"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          )}

          {status === "no-token" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Please check your email for the verification link we sent you when you registered.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                This may take a few moments...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

