export type AuthUser = {
  id: string;
  email: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Replace with your auth provider adapter (NextAuth, Clerk, Auth0, etc.).
  return {
    id: 'user_123',
    email: 'alex@example.com',
  };
}
