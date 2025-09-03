declare namespace NodeJS {
  interface ProcessEnv {
    // Node environment
    NODE_ENV: 'development' | 'production' | 'test'

    // API Configuration
    NEXT_PUBLIC_API_URL?: string
    NEXT_PUBLIC_API_KEY?: string

    // Auth Configuration
    NEXTAUTH_URL?: string
    NEXTAUTH_SECRET?: string

    // GitHub OAuth
    GITHUB_CLIENT_ID?: string
    GITHUB_CLIENT_SECRET?: string

    // GitLab OAuth
    GITLAB_CLIENT_ID?: string
    GITLAB_CLIENT_SECRET?: string

    // Database
    DATABASE_URL?: string

    // Redis
    REDIS_URL?: string

    // Other
    NEXT_PUBLIC_SENTRY_DSN?: string
    NEXT_PUBLIC_GA_TRACKING_ID?: string
  }
}
