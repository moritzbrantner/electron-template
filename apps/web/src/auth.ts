import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { authorizeCredentials } from "@/src/auth/credentials";
import { getDb } from "@/src/db/client";
import { accounts, sessions, users, verificationTokens } from "@/src/db/schema";
import type { AppRole } from "@/lib/authorization";
import { buildProfileImageUrl } from "@/src/profile/object-storage";

const credentialsProvider = Credentials({
  name: "Email and Password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  authorize: (credentials, request) => authorizeCredentials(credentials, undefined, request),
});

const githubProvider =
  process.env.GITHUB_ID && process.env.GITHUB_SECRET
    ? [
        GitHub({
          clientId: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
        }),
      ]
    : [];

const hasDatabase = Boolean(process.env.DATABASE_URL);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? "local-build-secret",
  ...(hasDatabase
    ? {
        adapter: DrizzleAdapter(getDb(), {
          usersTable: users,
          accountsTable: accounts,
          sessionsTable: sessions,
          verificationTokensTable: verificationTokens,
        }),
      }
    : {}),
  session: {
    strategy: "jwt",
  },
  providers: [credentialsProvider, ...githubProvider],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: AppRole }).role ?? "USER";
        token.name = user.name ?? null;
        token.image = buildProfileImageUrl(user.image) ?? null;
      }

      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        const userId = user?.id ?? (typeof token.userId === "string" ? token.userId : undefined);
        if (userId) {
          session.user.id = userId;
        }

        session.user.role = (user?.role as AppRole | undefined) ?? (token.role as AppRole | undefined) ?? "USER";
        session.user.name = user?.name ?? (typeof token.name === "string" ? token.name : session.user.name ?? null);
        session.user.image = buildProfileImageUrl(user?.image) ?? (typeof token.image === "string" ? token.image : session.user.image ?? null);
      }

      return session;
    },
  },
};
