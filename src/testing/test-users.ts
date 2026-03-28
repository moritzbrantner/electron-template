import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { hashPassword } from "@/lib/password";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";

export const TEST_USERS = [
  {
    email: "admin@example.com",
    password: "admin",
    name: "Test Admin",
    role: "ADMIN" as const,
  },
  {
    email: "manager@example.com",
    password: "manager",
    name: "Test Manager",
    role: "USER" as const,
  },
  {
    email: "user@example.com",
    password: "user",
    name: "Test User",
    role: "USER" as const,
  },
];

export async function seedTestUsers() {
  const db = getDb();

  await db.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" text');

  for (const testUser of TEST_USERS) {
    const passwordHash = await hashPassword(testUser.password);

    const existingUser = await db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.email, testUser.email),
    });

    if (existingUser) {
      await db
        .update(users)
        .set({
          name: testUser.name,
          role: testUser.role,
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));
      continue;
    }

    await db.insert(users).values({
      id: randomUUID(),
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      passwordHash,
    });
  }
}
