import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GithubProvider from "next-auth/providers/github";
import GitlabProvider from "next-auth/providers/gitlab";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./database";
import { UserRole } from "../../generated/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Demo Credentials Provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@taskmaster.ai" },
        password: { label: "Password", type: "password", placeholder: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // For demo purposes, accept specific test credentials
        if (credentials.email === "demo@taskmaster.ai" && credentials.password === "password") {
          try {
            // Check if demo user exists, create if not
            let user = await prisma.user.findUnique({
              where: { email: credentials.email },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: credentials.email,
                  name: "Demo User",
                  role: UserRole.ADMIN,
                  isActive: true,
                  settings: {
                    theme: "light",
                    notifications: true,
                    timezone: "UTC",
                  },
                },
              });
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
            };
          } catch (error) {
            console.error("Database error during auth:", error);
            return null;
          }
        }

        return null;
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
    GitlabProvider({
      clientId: process.env.GITLAB_CLIENT_ID!,
      clientSecret: process.env.GITLAB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.username,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Store the OAuth account info in the token
      if (account && user) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token, user }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = user?.id || token.sub!;
        if (user && 'role' in user) {
          (session.user as any).role = user.role;
        }
        if (user && 'isActive' in user) {
          (session.user as any).isActive = user.isActive;
        }
        session.accessToken = token.accessToken as string;
        session.provider = token.provider as string;
        session.providerAccountId = token.providerAccountId as string;
      }
      return session;
    },
    async signIn() {
      // Allow sign in
      return true;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};