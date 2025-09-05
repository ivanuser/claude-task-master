import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GithubProvider from "next-auth/providers/github";
import GitlabProvider from "next-auth/providers/gitlab";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./database";
import { UserRole } from "../../generated/prisma";

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Not needed for JWT sessions
  providers: [
    // Credentials Provider for email/password authentication
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              image: true,
              role: true,
              isActive: true,
            },
          });

          if (!user || !user.password) {
            throw new Error("Invalid email or password");
          }

          // Temporary: use plaintext comparison (not secure, for testing only)
          const isPasswordValid = credentials.password === user.password;

          if (!isPasswordValid) {
            throw new Error("Invalid email or password");
          }

          if (!user.isActive) {
            throw new Error("Account is not active. Please contact support.");
          }

          // Return user object (password excluded)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
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
    async jwt({ token, user, account, trigger }) {
      // Clear token on signout
      if (trigger === "signout") {
        return {};
      }
      
      // Store user info in the token on sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        if ('role' in user) {
          token.role = user.role;
        }
      }
      // Store the OAuth account info in the token
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client from JWT token
      if (token && session.user) {
        session.user.id = token.id as string || token.sub || '';
        session.user.email = token.email as string || '';
        session.user.name = token.name as string || '';
        session.user.image = token.image as string || '';
        if (token.role) {
          (session.user as any).role = token.role;
        }
        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
        }
        if (token.provider) {
          session.provider = token.provider as string;
        }
        if (token.providerAccountId) {
          session.providerAccountId = token.providerAccountId as string;
        }
      }
      return session;
    },
    async signIn() {
      // Allow sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return url;
      } catch {
        // Invalid URL
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours (shorter for testing)
    updateAge: 30 * 60, // 30 minutes
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 // 2 hours
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};