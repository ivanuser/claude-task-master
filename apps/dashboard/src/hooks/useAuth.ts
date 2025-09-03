import { useSession, signIn, signOut } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
    signIn,
    signOut,
    accessToken: session?.accessToken,
    provider: session?.provider,
    providerAccountId: session?.providerAccountId,
  };
}