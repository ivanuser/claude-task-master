import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/database';
import { ApiKeyType } from '@prisma/client';

// Constants
const API_KEY_PREFIX = 'tm_';
const API_KEY_LENGTH = 32;
const SALT_ROUNDS = 10;

// Available scopes for API keys
export const API_SCOPES = {
  // Read scopes
  READ_PROJECTS: 'read:projects',
  READ_TASKS: 'read:tasks',
  READ_USERS: 'read:users',
  READ_ANALYTICS: 'read:analytics',
  
  // Write scopes
  WRITE_PROJECTS: 'write:projects',
  WRITE_TASKS: 'write:tasks',
  WRITE_USERS: 'write:users',
  
  // Admin scopes
  ADMIN_KEYS: 'admin:keys',
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system',
} as const;

export type ApiScope = typeof API_SCOPES[keyof typeof API_SCOPES];

interface CreateApiKeyOptions {
  userId: string;
  name: string;
  description?: string;
  type?: ApiKeyType;
  scopes?: ApiScope[];
  expiresIn?: number; // Days until expiration
  rateLimit?: number; // Requests per hour
}

interface ApiKeyResult {
  id: string;
  key: string; // Plain text key (only shown once)
  prefix: string;
  name: string;
  expiresAt?: Date;
}

export class ApiKeyService {
  // Generate a cryptographically secure API key
  private generateApiKey(): string {
    const buffer = crypto.randomBytes(API_KEY_LENGTH);
    const key = buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return key;
  }

  // Generate key with prefix
  private generateFullKey(type: ApiKeyType): { key: string; prefix: string } {
    const typePrefix = type === ApiKeyType.APPLICATION ? 'app' : 
                      type === ApiKeyType.SERVICE ? 'svc' : 'live';
    const prefix = `${API_KEY_PREFIX}${typePrefix}_`;
    const key = this.generateApiKey();
    return {
      key: `${prefix}${key}`,
      prefix: `${prefix}${key.substring(0, 8)}`,
    };
  }

  // Hash API key for storage
  private async hashApiKey(key: string): Promise<string> {
    return bcrypt.hash(key, SALT_ROUNDS);
  }

  // Verify API key against hash
  async verifyApiKey(plainKey: string, hashedKey: string): Promise<boolean> {
    return bcrypt.compare(plainKey, hashedKey);
  }

  // Create new API key
  async createApiKey(options: CreateApiKeyOptions): Promise<ApiKeyResult> {
    const {
      userId,
      name,
      description,
      type = ApiKeyType.PERSONAL,
      scopes = [],
      expiresIn,
      rateLimit,
    } = options;

    // Generate the API key
    const { key: fullKey, prefix } = this.generateFullKey(type);
    
    // Hash the key for storage
    const hashedKey = await this.hashApiKey(fullKey);
    
    // Calculate expiration date if specified
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : undefined;

    // Store in database
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        description,
        key: hashedKey,
        prefix,
        type,
        scopes: JSON.stringify(scopes),
        expiresAt,
        rateLimit,
        isActive: true,
      },
    });

    return {
      id: apiKey.id,
      key: fullKey, // Return plain text key (only shown once)
      prefix,
      name,
      expiresAt: apiKey.expiresAt || undefined,
    };
  }

  // Get all API keys for a user (without revealing the actual keys)
  async getUserApiKeys(userId: string) {
    const keys = await prisma.apiKey.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        prefix: true,
        type: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true,
        rateLimit: true,
        _count: {
          select: {
            usage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return keys.map(key => ({
      ...key,
      scopes: JSON.parse(key.scopes as string) as ApiScope[],
      usageCount: key._count.usage,
      isExpired: key.expiresAt ? new Date() > key.expiresAt : false,
    }));
  }

  // Revoke an API key
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    try {
      await prisma.apiKey.update({
        where: {
          id: keyId,
          userId, // Ensure user owns the key
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      return false;
    }
  }

  // Regenerate an API key (revoke old, create new with same settings)
  async regenerateApiKey(keyId: string, userId: string): Promise<ApiKeyResult | null> {
    try {
      // Get existing key details
      const existingKey = await prisma.apiKey.findFirst({
        where: {
          id: keyId,
          userId,
          revokedAt: null,
        },
      });

      if (!existingKey) {
        return null;
      }

      // Revoke the old key
      await this.revokeApiKey(keyId, userId);

      // Create new key with same settings
      const newKey = await this.createApiKey({
        userId,
        name: existingKey.name,
        description: existingKey.description || undefined,
        type: existingKey.type,
        scopes: JSON.parse(existingKey.scopes as string),
        expiresIn: existingKey.expiresAt
          ? Math.ceil((existingKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : undefined,
        rateLimit: existingKey.rateLimit || undefined,
      });

      return newKey;
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
      return null;
    }
  }

  // Validate API key and get associated user/permissions
  async validateApiKey(plainKey: string) {
    try {
      // Extract prefix to help find the key
      const prefix = plainKey.substring(0, plainKey.lastIndexOf('_') + 9);
      
      // Find potential keys with matching prefix
      const potentialKeys = await prisma.apiKey.findMany({
        where: {
          prefix,
          isActive: true,
          revokedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Check each potential key
      for (const apiKey of potentialKeys) {
        const isValid = await this.verifyApiKey(plainKey, apiKey.key);
        
        if (isValid) {
          // Check if expired
          if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
            return { valid: false, reason: 'API key has expired' };
          }

          // Update last used timestamp
          await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          });

          return {
            valid: true,
            apiKey: {
              id: apiKey.id,
              type: apiKey.type,
              scopes: JSON.parse(apiKey.scopes as string) as ApiScope[],
              rateLimit: apiKey.rateLimit,
            },
            user: apiKey.user,
          };
        }
      }

      return { valid: false, reason: 'Invalid API key' };
    } catch (error) {
      console.error('Error validating API key:', error);
      return { valid: false, reason: 'Error validating API key' };
    }
  }

  // Track API key usage
  async trackUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.apiKeyUsage.create({
        data: {
          apiKeyId,
          endpoint,
          method,
          statusCode,
          responseTime,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to track API key usage:', error);
    }
  }

  // Get usage statistics for an API key
  async getUsageStats(keyId: string, userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await prisma.apiKeyUsage.findMany({
      where: {
        apiKeyId: keyId,
        apiKey: {
          userId, // Ensure user owns the key
        },
        timestamp: {
          gte: since,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Calculate statistics
    const totalRequests = usage.length;
    const successfulRequests = usage.filter(u => u.statusCode < 400).length;
    const failedRequests = usage.filter(u => u.statusCode >= 400).length;
    const avgResponseTime = usage.length > 0
      ? usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length
      : 0;

    // Group by endpoint
    const endpointStats = usage.reduce((acc, u) => {
      if (!acc[u.endpoint]) {
        acc[u.endpoint] = { count: 0, avgTime: 0 };
      }
      acc[u.endpoint].count++;
      acc[u.endpoint].avgTime = 
        (acc[u.endpoint].avgTime * (acc[u.endpoint].count - 1) + u.responseTime) / 
        acc[u.endpoint].count;
      return acc;
    }, {} as Record<string, { count: number; avgTime: number }>);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
      endpointStats,
      recentUsage: usage.slice(0, 100), // Last 100 requests
    };
  }

  // Check rate limit for API key
  async checkRateLimit(apiKeyId: string, limit: number): Promise<boolean> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentUsageCount = await prisma.apiKeyUsage.count({
      where: {
        apiKeyId,
        timestamp: {
          gte: oneHourAgo,
        },
      },
    });

    return recentUsageCount < limit;
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();