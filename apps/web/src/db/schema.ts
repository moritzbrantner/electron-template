
import { pgEnum, pgTable, primaryKey, text, timestamp, integer, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("Role", ["ADMIN", "USER"]);

export const users = pgTable(
  "User",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    name: text("name"),
    image: text("image"),
    emailVerified: timestamp("emailVerified", { withTimezone: false, mode: "date" }),
    role: roleEnum("role").notNull().default("USER"),
    passwordHash: text("passwordHash"),
    failedSignInAttempts: integer("failedSignInAttempts").notNull().default(0),
    lockoutUntil: timestamp("lockoutUntil", { withTimezone: false, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("User_email_key").on(table.email), index("User_email_idx").on(table.email), index("User_role_idx").on(table.role)],
);

export const profiles = pgTable(
  "Profile",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    bio: text("bio"),
    locale: text("locale"),
    timezone: text("timezone"),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("Profile_userId_key").on(table.userId)],
);

export const accounts = pgTable(
  "Account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId], name: "Account_pkey" }),
    index("Account_userId_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "Session",
  {
    sessionToken: text("sessionToken").notNull().primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    expires: timestamp("expires", { withTimezone: false, mode: "date" }).notNull(),
  },
  (table) => [index("Session_userId_idx").on(table.userId)],
);

export const verificationTokens = pgTable(
  "VerificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: false, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token], name: "VerificationToken_pkey" }),
    uniqueIndex("VerificationToken_token_key").on(table.token),
  ],
);


export const securityRateLimitCounters = pgTable("SecurityRateLimitCounter", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("resetAt", { withTimezone: false, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
});

export const securityAuditLogs = pgTable(
  "SecurityAuditLog",
  {
    id: text("id").primaryKey(),
    actorId: text("actorId"),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    statusCode: integer("statusCode").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    timestamp: timestamp("timestamp", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("SecurityAuditLog_actorId_idx").on(table.actorId), index("SecurityAuditLog_action_idx").on(table.action)],
);
