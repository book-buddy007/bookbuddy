import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // No baseURL = relative fetch paths, works on any domain (localhost, tunnel, production)
  plugins: [
    organizationClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization,
} = authClient;
