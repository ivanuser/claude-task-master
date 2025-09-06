// Re-export Prisma enums for server-side use
// This file should ONLY be imported in server-side code (API routes, server components, services)
export {
  ThemeMode,
  ColorScheme,
  UIDensity,
  FontSize,
  ColorBlindMode,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  TwoFactorMethod,
  RecoveryMethod,
  UserRole
} from '../../generated/prisma';