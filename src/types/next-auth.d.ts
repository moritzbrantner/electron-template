import { DefaultSession } from "next-auth";

import type { AppRole } from "@/lib/authorization";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: AppRole;
    };
  }

  interface User {
    role?: AppRole;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: AppRole;
    image?: string | null;
  }
}
