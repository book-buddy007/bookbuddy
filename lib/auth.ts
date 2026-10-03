import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { bearer } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { syncFederatedSession, retireLocalCredential } from "@/lib/federation/jit";
import { normaliseEmail } from "@/lib/email-normalise";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth-cookies";
import { FEDERATION_PROVIDER_IDS } from "@/lib/federation/types";

// Federation is opt-in via FEDERATION_ENABLED so existing email/password +
// Google sign-in paths are unchanged when the flag is off. See
// Vidyaverse Pro/docs/identity-federation-design.md §7.
const FEDERATION_ENABLED = process.env.FEDERATION_ENABLED === "true";
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3001";

// Google social sign-in is inert until its credentials are present, matching
// the federation pattern below — so the web build never breaks when unset.
// Better Auth registers the callback at `${BETTER_AUTH_URL}/api/auth/callback/google`,
// which is the redirect URI that must be authorised in Google Cloud Console.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Whether Google may CREATE accounts (as opposed to signing in people who already have one, which
// it always may: it links to the account with the same verified email). On when
// GOOGLE_SIGNUP_ENABLED=true, or when PUBLIC_SIGNUP_ENABLED=true (the broader switch the NestJS
// backend also reads). Google-created accounts are plain students: role and the other privileged
// fields are server-side defaults (see `input: false` on the extra user fields below).
export const GOOGLE_SIGNUP_ENABLED =
  process.env.GOOGLE_SIGNUP_ENABLED === "true" || process.env.PUBLIC_SIGNUP_ENABLED === "true";

// Email + password sign-up is closed on the web (accounts come from an administrator or the
// identity provider; sign-in stays enabled). Exported so the register page can hide a form that
// could only ever fail.
export const EMAIL_SIGNUP_ENABLED = false as boolean;

const socialProviders =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          disableSignUp: !GOOGLE_SIGNUP_ENABLED,
        },
      }
    : {};

// Two-trio federation: Book Buddy is a shared service layer for BOTH control planes.
// Each provider is registered independently and is inert until its env vars are
// present, so enabling VDL never disturbs the Vidyaverse trio (and vice versa).
// See Vidyaverse Pro/docs/two-trio-federation-design.md.
type ControlPlaneConfig = { providerId: "vidyaverse" | "vdl"; issuer?: string; clientId?: string; clientSecret?: string };

const CONTROL_PLANES: ControlPlaneConfig[] = [
  {
    providerId: "vidyaverse",
    issuer: process.env.VIDYAVERSE_ISSUER,
    clientId: process.env.VIDYAVERSE_CLIENT_ID,
    clientSecret: process.env.VIDYAVERSE_CLIENT_SECRET,
  },
  {
    providerId: "vdl",
    issuer: process.env.VDL_ISSUER,
    clientId: process.env.VDL_CLIENT_ID,
    clientSecret: process.env.VDL_CLIENT_SECRET,
  },
];

const oauthConfigs = CONTROL_PLANES.filter(
  (cp): cp is Required<ControlPlaneConfig> => Boolean(cp.issuer && cp.clientId && cp.clientSecret),
).map((cp) => ({
  providerId: cp.providerId,
  clientId: cp.clientId,
  clientSecret: cp.clientSecret,
  discoveryUrl: `${cp.issuer.replace(/\/$/, "")}/api/auth/.well-known/openid-configuration`,
  issuer: cp.issuer,
  scopes: ["openid", "profile", "email", "offline_access", "memberships", "entitlements"],
  pkce: true,
  redirectURI: `${BETTER_AUTH_URL}/api/auth/oauth2/callback/${cp.providerId}`,
  mapProfileToUser: (profile: Record<string, unknown>) => {
    // email_verified is what makes linking-by-email safe (see accountLinking
    // below). Refuse the sign-in outright rather than provisioning an account on
    // an address the IdP hasn't proven belongs to whoever is signing in.
    if (!profile.email_verified) {
      throw new Error("This email address has not been verified with Vidyaverse.");
    }
    return {
      email: profile.email as string,
      name: (profile.name as string) ?? "",
      image: (profile.picture as string) ?? null,
      emailVerified: true,
    };
  },
}));

const federationPlugins =
  FEDERATION_ENABLED && oauthConfigs.length > 0 ? [genericOAuth({ config: oauthConfigs })] : [];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  user: {
    // SECURITY: every field here is `input: false`. These are declared so they appear on
    // session.user, but without `input: false` Better Auth also accepts them from the client on
    // POST /api/auth/update-user, which let any signed-in user set their own `role` to
    // SUPER_ADMIN (verified). They are written only by server code (Prisma / the NestJS backend).
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
      },
      accountType: {
        type: "string",
        required: false,
        input: false,
      },
      onboardingCompleted: {
        type: "boolean",
        required: false,
        input: false,
      },
      onboardingStep: {
        type: "number",
        required: false,
        input: false,
      },
      // Surfaced so the client can gate the "Start free trial" button and the
      // trial-expiry banner on real state, and so a just-activated trial is
      // visible on the very next session read. Without these three here,
      // better-auth omits them from session.user and the UI sees undefined —
      // which is why the trial banner never fired before.
      subscriptionTier: {
        type: "string",
        required: false,
        input: false,
      },
      subscriptionStatus: {
        type: "string",
        required: false,
        input: false,
      },
      trialEndsAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },

  socialProviders,

  // A user who already signed up here directly and later arrives via Vidyaverse
  // must land on the SAME account, not a duplicate — otherwise their library,
  // annotations and subscription are stranded on an orphaned row. Linking by
  // email is only safe because these providers are the trio's own IdPs and any
  // identity they haven't verified is rejected above.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["vidyaverse", "vdl"],
      allowDifferentEmails: false,
      // Better Auth otherwise refuses to link onto a local account whose email
      // isn't verified — a sensible default, but local sign-up here has no
      // verification step at all, so that account can never become verified and
      // the user would be stuck on account_not_linked forever. The protection it
      // provides (a stranger squatting an address you don't own) is instead handled
      // by retiring the unproven local password at link time; see the account
      // databaseHook below.
      requireLocalEmailVerified: false,
    },
  },

  emailAndPassword: {
    enabled: true,
    // OIDC-via-Vidyaverse is now the only account-creation path (2026-08-06
    // identity reset). Sign-IN stays enabled -- the super-admin's break-glass
    // recovery path and any future password-reset-issued credential still
    // need it -- only new local sign-ups are blocked. (Google sign-up is a
    // separate, deliberate exception: GOOGLE_SIGNUP_ENABLED above.)
    disableSignUp: !EMAIL_SIGNUP_ENABLED,
    requireEmailVerification: false,
    password: {
      hash: async (password: string): Promise<string> => {
        return bcrypt.hash(password, 12);
      },
      verify: async ({ hash, password }: { hash: string; password: string }): Promise<boolean> => {
        if (!hash) return false;
        if (hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
          return bcrypt.compare(password, hash);
        }
        try {
          return await bcrypt.compare(password, hash);
        } catch {
          return false;
        }
      },
    },
  },

  advanced: {
    // Distinct per app across the trio. While cookies stay host-scoped the default
    // shared prefix is harmless, but single logout needs all three served under a
    // common parent domain, where three identically-named cookies would collide.
    // Read everywhere via lib/auth-cookies.ts — keep the two in step.
    cookiePrefix: AUTH_COOKIE_PREFIX,
  },

  // Throttle credential-stuffing and email-bomb abuse on the auth endpoints.
  // requireEmailVerification is off here, so an unthrottled sign-up is an open
  // account-creation firehose — clamp it. Per-IP, in-memory (per instance); the
  // client IP must arrive via X-Forwarded-For behind the proxy.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 900, max: 5 },
      "/reset-password": { window: 900, max: 8 },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,     // 7 days
    updateAge: 60 * 60 * 24,          // Refresh if older than 1 day
    cookieCache: {
      enabled: false,
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Store the address canonically. Harmless on MySQL (already case-insensitive
        // by collation) and load-bearing on Postgres, where a mixed-case row would
        // make link-by-email miss and duplicate the account instead of linking it.
        // See lib/email-normalise.ts.
        before: async (user) => {
          const email = normaliseEmail((user as { email: string }).email);
          return { data: { ...user, email } };
        },
      },
    },
    account: {
      create: {
        // Fires the instant a federated Account row appears, which is exactly when
        // a link happens — the only moment the unproven local password can be
        // retired unambiguously.
        after: async (account) => {
          if (!FEDERATION_ENABLED) return;
          if (!FEDERATION_PROVIDER_IDS.includes(account.providerId as never)) return;
          try {
            await retireLocalCredential(account.userId);
          } catch (err) {
            console.error("[federation] retireLocalCredential failed:", err);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          if (!FEDERATION_ENABLED) return;
          try {
            await syncFederatedSession(session.userId);
          } catch (err) {
            console.error("[federation] syncFederatedSession failed:", err);
          }
        },
      },
    },
  },

  plugins: [
    ...federationPlugins,
    bearer(),
    organization({
      roles: {
        admin: {
          permissions: ["*"],
        },
        librarian: {
          permissions: [
            "books:create", "books:update", "books:delete", "books:read",
            "members:read", "members:invite", "members:update",
            "assignments:create", "assignments:update", "assignments:delete",
            "analytics:read",
          ],
        },
        teacher: {
          permissions: [
            "books:read",
            "assignments:create", "assignments:update", "assignments:read",
            "members:read",
            "analytics:read",
          ],
        },
        student: {
          permissions: [
            "books:read",
            "assignments:read",
            "annotations:create", "annotations:update", "annotations:delete", "annotations:read",
            "flashcards:create", "flashcards:update", "flashcards:delete", "flashcards:read",
            "progress:read", "progress:create", "progress:update",
          ],
        },
      },
      allowUserToCreateOrganization: false,
      organizationLimit: 1,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      schema: {
        organization: { modelName: "Tenant" },
        member: { modelName: "UserTenantMembership" },
      },
    }),
  ],

  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3333",
    "https://vinstitution.com",
    "https://bookbuddy.vinstitution.com",
    "https://api.bookbuddy.vinstitution.com",
    ...(process.env.VIDYAVERSE_ISSUER ? [process.env.VIDYAVERSE_ISSUER] : []),
    ...(process.env.VDL_ISSUER ? [process.env.VDL_ISSUER] : []),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;