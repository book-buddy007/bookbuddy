import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AuthCardSkeleton } from "@/components/auth/auth-card";

export default function RegisterLoading() {
  return (
    <AuthBackdrop>
      <AuthCardSkeleton />
    </AuthBackdrop>
  );
}
