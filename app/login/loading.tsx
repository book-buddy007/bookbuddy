import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AuthCardSkeleton } from "@/components/auth/auth-card";

export default function LoginLoading() {
  return (
    <AuthBackdrop>
      <AuthCardSkeleton />
    </AuthBackdrop>
  );
}
