import { prisma } from '../database';

export enum SyncErrorCode {
  // Network/Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Repository errors
  REPOSITORY_NOT_FOUND = 'REPOSITORY_NOT_FOUND',
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  
  // Parse errors
  INVALID_JSON = 'INVALID_JSON',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  
  // Sync errors
  SYNC_LOCK_FAILED = 'SYNC_LOCK_FAILED',
  CONFLICT_RESOLUTION_FAILED = 'CONFLICT_RESOLUTION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface SyncError {
  id?: string;
  code: SyncErrorCode;
  message: string;
  context: {
    projectId?: string;
    repositoryId?: string;
    branch?: string;
    file?: string;
    operation?: string;
    userId?: string;
  };
  metadata: {
    timestamp: string;
    stackTrace?: string;
    httpStatus?: number;
    retryCount?: number;
    isRetryable: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  resolution?: {
    suggestion: string;
    autoFixApplied?: boolean;
    requiresManualIntervention: boolean;
  };
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCode: Record<SyncErrorCode, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: SyncError[];
  mostCommonErrors: Array<{ code: SyncErrorCode; count: number; lastOccurrence: string }>;
}

export class SyncErrorHandler {
  private static readonly MAX_RECENT_ERRORS = 50;
  private static readonly ERROR_RETENTION_DAYS = 30;

  // Create and log a sync error
  static async createError(
    error: Omit<SyncError, 'id' | 'metadata'> & { 
      metadata?: Partial<SyncError['metadata']> 
    }
  ): Promise<SyncError> {
    const syncError: SyncError = {
      ...error,
      metadata: {
        timestamp: new Date().toISOString(),
        isRetryable: this.isErrorRetryable(error.code),
        severity: this.getErrorSeverity(error.code),
        ...error.metadata,
      },
    };

    try {
      // Store error in database
      const dbError = await prisma.syncError.create({
        data: {
          code: syncError.code,
          message: syncError.message,
          context: syncError.context,
          metadata: syncError.metadata,
          resolution: syncError.resolution,
          projectId: syncError.context.projectId,
        },
      });

      syncError.id = dbError.id;

      // Log error based on severity
      this.logError(syncError);

      // Check if auto-fix is available
      const autoFix = await this.tryAutoFix(syncError);
      if (autoFix) {
        syncError.resolution = {
          ...syncError.resolution,
          ...autoFix,
        };
      }

      // Notify monitoring systems for critical errors
      if (syncError.metadata.severity === 'critical') {
        await this.notifyMonitoring(syncError);
      }

      return syncError;

    } catch (dbError) {
      // Fallback: log to console if database fails
      console.error('Failed to store sync error in database:', dbError);
      console.error('Original sync error:', syncError);
      return syncError;
    }
  }

  // Handle caught exceptions and convert to sync errors
  static async handleError(
    error: unknown,
    context: SyncError['context'],
    operation?: string
  ): Promise<SyncError> {
    let syncError: Omit<SyncError, 'id' | 'metadata'>;

    if (error instanceof Error) {
      // Map known error types to sync error codes
      const code = this.mapErrorToCode(error, context);
      
      syncError = {
        code,
        message: error.message,
        context: { ...context, operation },
        metadata: {
          stackTrace: error.stack,
        },
      };
    } else if (typeof error === 'string') {
      syncError = {
        code: SyncErrorCode.UNKNOWN_ERROR,
        message: error,
        context: { ...context, operation },
      };
    } else {
      syncError = {
        code: SyncErrorCode.UNKNOWN_ERROR,
        message: 'An unknown error occurred',
        context: { ...context, operation },
        metadata: {
          stackTrace: JSON.stringify(error),
        },
      };
    }

    return this.createError(syncError);
  }

  // Get error statistics for a project or globally
  static async getErrorStats(projectId?: string): Promise<ErrorStats> {
    try {
      const whereClause = projectId ? { projectId } : {};
      const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

      // Get recent errors
      const recentErrors = await prisma.syncError.findMany({
        where: {
          ...whereClause,
          createdAt: { gte: recentCutoff },
        },
        orderBy: { createdAt: 'desc' },
        take: this.MAX_RECENT_ERRORS,
      });

      // Get total error count
      const totalErrors = await prisma.syncError.count({
        where: whereClause,
      });

      // Get error counts by code
      const errorsByCodeRaw = await prisma.syncError.groupBy({
        by: ['code'],
        where: whereClause,
        _count: { code: true },
      });

      const errorsByCode = errorsByCodeRaw.reduce((acc, item) => {
        acc[item.code as SyncErrorCode] = item._count.code;
        return acc;
      }, {} as Record<SyncErrorCode, number>);

      // Get errors by severity (from metadata)
      const errorsBySeverity: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      // Calculate severity distribution from recent errors
      recentErrors.forEach(error => {
        const severity = (error.metadata as any)?.severity || 'medium';
        errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
      });

      // Get most common errors
      const mostCommonErrors = Object.entries(errorsByCode)
        .map(([code, count]) => ({
          code: code as SyncErrorCode,
          count,
          lastOccurrence: recentErrors.find(e => e.code === code)?.createdAt.toISOString() || '',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalErrors,
        errorsByCode,
        errorsBySeverity,
        recentErrors: recentErrors.map(this.mapDbErrorToSyncError),
        mostCommonErrors,
      };

    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        totalErrors: 0,
        errorsByCode: {} as Record<SyncErrorCode, number>,
        errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        recentErrors: [],
        mostCommonErrors: [],
      };
    }
  }

  // Clean up old errors
  static async cleanupOldErrors(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - this.ERROR_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      const result = await prisma.syncError.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      console.log(`🗑️ Cleaned up ${result.count} old sync errors`);
      return result.count;

    } catch (error) {
      console.error('Failed to clean up old errors:', error);
      return 0;
    }
  }

  // Private helper methods

  private static isErrorRetryable(code: SyncErrorCode): boolean {
    const retryableErrors = [
      SyncErrorCode.CONNECTION_FAILED,
      SyncErrorCode.TIMEOUT,
      SyncErrorCode.RATE_LIMITED,
      SyncErrorCode.SERVICE_UNAVAILABLE,
      SyncErrorCode.SYNC_LOCK_FAILED,
    ];
    
    return retryableErrors.includes(code);
  }

  private static getErrorSeverity(code: SyncErrorCode): SyncError['metadata']['severity'] {
    const severityMap: Record<SyncErrorCode, SyncError['metadata']['severity']> = {
      [SyncErrorCode.CONNECTION_FAILED]: 'medium',
      [SyncErrorCode.TIMEOUT]: 'medium',
      [SyncErrorCode.RATE_LIMITED]: 'low',
      [SyncErrorCode.AUTH_FAILED]: 'high',
      [SyncErrorCode.PERMISSION_DENIED]: 'high',
      [SyncErrorCode.TOKEN_EXPIRED]: 'medium',
      [SyncErrorCode.REPOSITORY_NOT_FOUND]: 'high',
      [SyncErrorCode.BRANCH_NOT_FOUND]: 'medium',
      [SyncErrorCode.FILE_NOT_FOUND]: 'low',
      [SyncErrorCode.INVALID_JSON]: 'medium',
      [SyncErrorCode.SCHEMA_VALIDATION_FAILED]: 'medium',
      [SyncErrorCode.UNSUPPORTED_FORMAT]: 'medium',
      [SyncErrorCode.SYNC_LOCK_FAILED]: 'medium',
      [SyncErrorCode.CONFLICT_RESOLUTION_FAILED]: 'high',
      [SyncErrorCode.DATABASE_ERROR]: 'critical',
      [SyncErrorCode.INTERNAL_ERROR]: 'critical',
      [SyncErrorCode.SERVICE_UNAVAILABLE]: 'high',
      [SyncErrorCode.UNKNOWN_ERROR]: 'medium',
    };

    return severityMap[code] || 'medium';
  }

  private static mapErrorToCode(error: Error, context: SyncError['context']): SyncErrorCode {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('timeout') || name.includes('timeout')) {
      return SyncErrorCode.TIMEOUT;
    }
    if (message.includes('connection') || message.includes('network')) {
      return SyncErrorCode.CONNECTION_FAILED;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return SyncErrorCode.RATE_LIMITED;
    }

    // Auth errors
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return SyncErrorCode.AUTH_FAILED;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return SyncErrorCode.PERMISSION_DENIED;
    }
    if (message.includes('token') && message.includes('expired')) {
      return SyncErrorCode.TOKEN_EXPIRED;
    }

    // Repository errors
    if (message.includes('repository not found') || message.includes('repo not found')) {
      return SyncErrorCode.REPOSITORY_NOT_FOUND;
    }
    if (message.includes('branch not found')) {
      return SyncErrorCode.BRANCH_NOT_FOUND;
    }
    if (message.includes('file not found') || message.includes('path not found')) {
      return SyncErrorCode.FILE_NOT_FOUND;
    }

    // Parse errors
    if (message.includes('json') && (message.includes('parse') || message.includes('invalid'))) {
      return SyncErrorCode.INVALID_JSON;
    }
    if (message.includes('validation') || message.includes('schema')) {
      return SyncErrorCode.SCHEMA_VALIDATION_FAILED;
    }

    // Sync errors
    if (message.includes('sync already in progress') || message.includes('lock')) {
      return SyncErrorCode.SYNC_LOCK_FAILED;
    }
    if (message.includes('conflict')) {
      return SyncErrorCode.CONFLICT_RESOLUTION_FAILED;
    }
    if (message.includes('database') || message.includes('prisma')) {
      return SyncErrorCode.DATABASE_ERROR;
    }

    return SyncErrorCode.UNKNOWN_ERROR;
  }

  private static logError(error: SyncError): void {
    const prefix = `🚨 [SYNC ERROR ${error.code}]`;
    const contextStr = Object.entries(error.context)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    switch (error.metadata.severity) {
      case 'critical':
        console.error(`${prefix} CRITICAL: ${error.message}`, { context: contextStr, error });
        break;
      case 'high':
        console.error(`${prefix} HIGH: ${error.message}`, { context: contextStr });
        break;
      case 'medium':
        console.warn(`${prefix} MEDIUM: ${error.message}`, { context: contextStr });
        break;
      case 'low':
        console.log(`${prefix} LOW: ${error.message}`, { context: contextStr });
        break;
    }
  }

  private static async tryAutoFix(error: SyncError): Promise<SyncError['resolution'] | null> {
    switch (error.code) {
      case SyncErrorCode.TOKEN_EXPIRED:
        return {
          suggestion: 'Refresh authentication token and retry sync',
          autoFixApplied: false,
          requiresManualIntervention: true,
        };

      case SyncErrorCode.SYNC_LOCK_FAILED:
        return {
          suggestion: 'Wait for current sync to complete or clear stale lock',
          autoFixApplied: false,
          requiresManualIntervention: false,
        };

      case SyncErrorCode.BRANCH_NOT_FOUND:
        return {
          suggestion: 'Use default branch or update branch configuration',
          autoFixApplied: false,
          requiresManualIntervention: true,
        };

      case SyncErrorCode.RATE_LIMITED:
        return {
          suggestion: 'Implementing exponential backoff retry strategy',
          autoFixApplied: true,
          requiresManualIntervention: false,
        };

      default:
        return null;
    }
  }

  private static async notifyMonitoring(error: SyncError): Promise<void> {
    try {
      // In production, this would send to monitoring services like Sentry, DataDog, etc.
      console.error('🚨 CRITICAL SYNC ERROR DETECTED:', {
        code: error.code,
        message: error.message,
        context: error.context,
        timestamp: error.metadata.timestamp,
      });

      // Could also send webhooks, emails, Slack notifications, etc.
      
    } catch (notifyError) {
      console.error('Failed to notify monitoring systems:', notifyError);
    }
  }

  private static mapDbErrorToSyncError(dbError: any): SyncError {
    return {
      id: dbError.id,
      code: dbError.code,
      message: dbError.message,
      context: dbError.context || {},
      metadata: dbError.metadata || { 
        timestamp: dbError.createdAt.toISOString(),
        isRetryable: false,
        severity: 'medium',
      },
      resolution: dbError.resolution,
    };
  }
}