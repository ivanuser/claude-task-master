import { AuditLog, ResourceType, User } from '@/types/team';
import { AuthService } from './auth.service';

export class AuditService {
  private static auditLogs: AuditLog[] = [];
  private static maxLogsInMemory = 10000;
  private static retentionDays = 90;

  // Log an audit event
  static async log(params: {
    action: string;
    resource: ResourceType;
    resourceId: string;
    changes?: {
      before: Record<string, any>;
      after: Record<string, any>;
    };
    status?: 'success' | 'failure';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    const currentTeam = AuthService.getCurrentTeam();
    
    if (!currentUser || !currentTeam) {
      console.warn('Cannot log audit event without user/team context');
      return;
    }

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      teamId: currentTeam.id,
      userId: currentUser.id,
      user: currentUser,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      changes: params.changes,
      status: params.status || 'success',
      errorMessage: params.errorMessage,
      metadata: {
        ...params.metadata,
        ip: await this.getClientIp(),
        userAgent: this.getUserAgent(),
        location: await this.getLocation(),
      },
      timestamp: new Date().toISOString(),
    };

    // Add to memory store
    this.auditLogs.unshift(auditLog);
    
    // Trim logs if exceeding limit
    if (this.auditLogs.length > this.maxLogsInMemory) {
      this.auditLogs = this.auditLogs.slice(0, this.maxLogsInMemory);
    }

    // In production, also persist to database
    await this.persistToDatabase(auditLog);
    
    // Check for suspicious activity
    await this.checkSuspiciousActivity(auditLog);
  }

  // Get audit logs with filtering
  static async getAuditLogs(params?: {
    teamId?: string;
    userId?: string;
    resource?: ResourceType;
    action?: string;
    status?: 'success' | 'failure';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    let filteredLogs = [...this.auditLogs];

    // Apply filters
    if (params?.teamId) {
      filteredLogs = filteredLogs.filter(log => log.teamId === params.teamId);
    }

    if (params?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === params.userId);
    }

    if (params?.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === params.resource);
    }

    if (params?.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(params.action.toLowerCase())
      );
    }

    if (params?.status) {
      filteredLogs = filteredLogs.filter(log => log.status === params.status);
    }

    if (params?.startDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= params.startDate
      );
    }

    if (params?.endDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= params.endDate
      );
    }

    const total = filteredLogs.length;

    // Apply pagination
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return { logs: paginatedLogs, total };
  }

  // Search audit logs
  static async searchAuditLogs(
    query: string,
    filters?: Parameters<typeof this.getAuditLogs>[0]
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const { logs } = await this.getAuditLogs(filters);
    
    const searchResults = logs.filter(log => {
      const searchableText = [
        log.action,
        log.resource,
        log.resourceId,
        log.user?.name,
        log.user?.email,
        log.errorMessage,
        JSON.stringify(log.changes),
        JSON.stringify(log.metadata),
      ].join(' ').toLowerCase();

      return searchableText.includes(query.toLowerCase());
    });

    return { logs: searchResults, total: searchResults.length };
  }

  // Get audit summary
  static async getAuditSummary(
    teamId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalEvents: number;
    failedEvents: number;
    topActions: Array<{ action: string; count: number }>;
    topUsers: Array<{ user: User; count: number }>;
    resourceBreakdown: Record<ResourceType, number>;
    timeline: Array<{ date: string; count: number; failures: number }>;
  }> {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const { logs } = await this.getAuditLogs({
      teamId,
      startDate,
      endDate: now,
    });

    // Calculate summary statistics
    const totalEvents = logs.length;
    const failedEvents = logs.filter(log => log.status === 'failure').length;

    // Top actions
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    // Top users
    const userCounts = logs.reduce((acc, log) => {
      if (log.user) {
        const key = log.userId;
        if (!acc[key]) {
          acc[key] = { user: log.user, count: 0 };
        }
        acc[key].count++;
      }
      return acc;
    }, {} as Record<string, { user: User; count: number }>);

    const topUsers = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Resource breakdown
    const resourceBreakdown = logs.reduce((acc, log) => {
      acc[log.resource] = (acc[log.resource] || 0) + 1;
      return acc;
    }, {} as Record<ResourceType, number>);

    // Timeline
    const timeline: Array<{ date: string; count: number; failures: number }> = [];
    const dayCount = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLogs = logs.filter(log => 
        log.timestamp.startsWith(dateStr)
      );
      
      timeline.push({
        date: dateStr,
        count: dayLogs.length,
        failures: dayLogs.filter(log => log.status === 'failure').length,
      });
    }

    return {
      totalEvents,
      failedEvents,
      topActions,
      topUsers,
      resourceBreakdown,
      timeline,
    };
  }

  // Export audit logs
  static async exportAuditLogs(
    format: 'csv' | 'json',
    filters?: Parameters<typeof this.getAuditLogs>[0]
  ): Promise<string> {
    const { logs } = await this.getAuditLogs(filters);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Resource',
      'Resource ID',
      'Status',
      'Error Message',
      'IP Address',
      'User Agent',
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.user?.email || 'Unknown',
      log.action,
      log.resource,
      log.resourceId,
      log.status,
      log.errorMessage || '',
      log.metadata?.ip || '',
      log.metadata?.userAgent || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  // Clean up old audit logs
  static async cleanupOldLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const oldLogsCount = this.auditLogs.filter(log => 
      new Date(log.timestamp) < cutoffDate
    ).length;

    this.auditLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    );

    // In production, also clean up database
    await this.cleanupDatabase(cutoffDate);

    return oldLogsCount;
  }

  // Check for suspicious activity patterns
  private static async checkSuspiciousActivity(log: AuditLog): Promise<void> {
    const recentLogs = this.auditLogs
      .filter(l => l.userId === log.userId)
      .slice(0, 100);

    // Check for rapid failed attempts
    const recentFailures = recentLogs.filter(l => 
      l.status === 'failure' &&
      new Date(l.timestamp).getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentFailures.length > 5) {
      console.warn(`Suspicious activity detected for user ${log.userId}: Multiple failed attempts`);
      // In production, trigger security alert
    }

    // Check for unusual access patterns
    const uniqueIPs = new Set(recentLogs.map(l => l.metadata?.ip).filter(Boolean));
    if (uniqueIPs.size > 3) {
      console.warn(`Suspicious activity detected for user ${log.userId}: Access from multiple IPs`);
      // In production, trigger security alert
    }

    // Check for bulk deletions
    const recentDeletions = recentLogs.filter(l => 
      l.action.toLowerCase().includes('delete') &&
      new Date(l.timestamp).getTime() > Date.now() - 60 * 1000 // Last minute
    );

    if (recentDeletions.length > 10) {
      console.warn(`Suspicious activity detected for user ${log.userId}: Bulk deletions`);
      // In production, trigger security alert
    }
  }

  // Helper methods
  private static async getClientIp(): Promise<string> {
    // In production, get from request headers
    return '127.0.0.1';
  }

  private static getUserAgent(): string {
    // In production, get from request headers
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  }

  private static async getLocation(): Promise<string | undefined> {
    // In production, use IP geolocation service
    return undefined;
  }

  private static async persistToDatabase(log: AuditLog): Promise<void> {
    // In production, save to database
    console.log('Persisting audit log to database:', log.id);
  }

  private static async cleanupDatabase(cutoffDate: Date): Promise<void> {
    // In production, delete old logs from database
    console.log('Cleaning up logs older than:', cutoffDate);
  }

  // Compliance helpers
  static async generateComplianceReport(
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: string; end: string };
    summary: Awaited<ReturnType<typeof this.getAuditSummary>>;
    criticalEvents: AuditLog[];
    userActivity: Array<{ user: User; actions: number; lastActive: string }>;
    dataAccess: Array<{ resource: string; accessCount: number; users: string[] }>;
  }> {
    const { logs } = await this.getAuditLogs({
      teamId,
      startDate,
      endDate,
    });

    const summary = await this.getAuditSummary(teamId, 'month');

    // Critical events (failures, deletions, permission changes)
    const criticalEvents = logs.filter(log => 
      log.status === 'failure' ||
      log.action.toLowerCase().includes('delete') ||
      log.resource === 'member' ||
      log.resource === 'team'
    );

    // User activity summary
    const userActivityMap = new Map<string, { 
      user: User; 
      actions: number; 
      lastActive: string;
    }>();

    logs.forEach(log => {
      if (log.user) {
        const existing = userActivityMap.get(log.userId) || {
          user: log.user,
          actions: 0,
          lastActive: log.timestamp,
        };
        
        existing.actions++;
        if (log.timestamp > existing.lastActive) {
          existing.lastActive = log.timestamp;
        }
        
        userActivityMap.set(log.userId, existing);
      }
    });

    const userActivity = Array.from(userActivityMap.values());

    // Data access patterns
    const dataAccessMap = new Map<string, {
      resource: string;
      accessCount: number;
      users: Set<string>;
    }>();

    logs
      .filter(log => log.action.includes('read') || log.action.includes('export'))
      .forEach(log => {
        const key = `${log.resource}-${log.resourceId}`;
        const existing = dataAccessMap.get(key) || {
          resource: key,
          accessCount: 0,
          users: new Set<string>(),
        };
        
        existing.accessCount++;
        existing.users.add(log.userId);
        
        dataAccessMap.set(key, existing);
      });

    const dataAccess = Array.from(dataAccessMap.values())
      .map(item => ({
        resource: item.resource,
        accessCount: item.accessCount,
        users: Array.from(item.users),
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 20);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary,
      criticalEvents,
      userActivity,
      dataAccess,
    };
  }
}