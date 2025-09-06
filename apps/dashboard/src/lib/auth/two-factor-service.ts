import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/database';
import { TwoFactorMethod, RecoveryMethod } from '@prisma/client';

// Constants
const TOTP_WINDOW = 2; // Accept codes 2 intervals before/after current
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;
const SALT_ROUNDS = 10;
const RECOVERY_TOKEN_BYTES = 32;
const RECOVERY_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Encryption settings
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

interface SetupTOTPResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface VerifyTOTPOptions {
  userId: string;
  token: string;
  trustDevice?: boolean;
  deviceId?: string;
}

interface BackupCodeGenerationResult {
  codes: string[];
  hashedCodes: string[];
}

export class TwoFactorService {
  // Encrypt sensitive data
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive data
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Generate backup codes
  private generateBackupCodes(): BackupCodeGenerationResult {
    const codes: string[] = [];
    const hashedCodes: string[] = [];
    
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = crypto.randomBytes(BACKUP_CODE_LENGTH)
        .toString('hex')
        .toUpperCase()
        .substring(0, BACKUP_CODE_LENGTH);
      
      codes.push(code);
      hashedCodes.push(bcrypt.hashSync(code, SALT_ROUNDS));
    }
    
    return { codes, hashedCodes };
  }

  // Setup TOTP for a user
  async setupTOTP(userId: string, appName: string = 'Task Master'): Promise<SetupTOTPResult> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { twoFactorAuth: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new secret
      const secret = speakeasy.generateSecret({
        name: `${appName} (${user.email})`,
        issuer: appName,
        length: 32,
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const { codes, hashedCodes } = this.generateBackupCodes();

      // Store encrypted secret in database (but don't enable yet)
      if (user.twoFactorAuth) {
        // Update existing 2FA settings
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: {
            secret: this.encrypt(secret.base32),
            enabled: false, // Don't enable until verified
            verifiedAt: null,
          },
        });

        // Remove old backup codes
        await prisma.backupCode.deleteMany({
          where: { userId },
        });
      } else {
        // Create new 2FA settings
        await prisma.twoFactorAuth.create({
          data: {
            userId,
            secret: this.encrypt(secret.base32),
            enabled: false,
          },
        });
      }

      // Store hashed backup codes
      await prisma.backupCode.createMany({
        data: hashedCodes.map(code => ({
          userId,
          code,
        })),
      });

      return {
        secret: secret.base32,
        qrCode,
        backupCodes: codes,
      };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  // Verify and enable TOTP
  async verifyAndEnableTOTP(options: VerifyTOTPOptions): Promise<boolean> {
    const { userId, token, trustDevice, deviceId } = options;

    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!twoFactorAuth) {
        throw new Error('Two-factor authentication not set up');
      }

      // Decrypt secret
      const secret = this.decrypt(twoFactorAuth.secret);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: TOTP_WINDOW,
      });

      if (verified) {
        // Enable 2FA
        const updateData: any = {
          enabled: true,
          verifiedAt: twoFactorAuth.verifiedAt || new Date(),
          lastUsedAt: new Date(),
        };

        // Add trusted device if requested
        if (trustDevice && deviceId) {
          const trustedDevices = (twoFactorAuth.trustedDevices as any[]) || [];
          trustedDevices.push({
            id: deviceId,
            addedAt: new Date(),
            lastUsedAt: new Date(),
            userAgent: '', // Can be filled from request headers
          });
          updateData.trustedDevices = trustedDevices;
        }

        await prisma.twoFactorAuth.update({
          where: { userId },
          data: updateData,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }

  // Verify TOTP token
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!twoFactorAuth || !twoFactorAuth.enabled) {
        return false;
      }

      // Decrypt secret
      const secret = this.decrypt(twoFactorAuth.secret);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: TOTP_WINDOW,
      });

      if (verified) {
        // Update last used timestamp
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: { lastUsedAt: new Date() },
        });
      }

      return verified;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }

  // Verify backup code
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const backupCodes = await prisma.backupCode.findMany({
        where: {
          userId,
          usedAt: null, // Only unused codes
        },
      });

      for (const backupCode of backupCodes) {
        const isValid = bcrypt.compareSync(code.toUpperCase(), backupCode.code);
        
        if (isValid) {
          // Mark code as used
          await prisma.backupCode.update({
            where: { id: backupCode.id },
            data: { usedAt: new Date() },
          });

          // Update 2FA last used
          await prisma.twoFactorAuth.update({
            where: { userId },
            data: { lastUsedAt: new Date() },
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  // Check if user has 2FA enabled
  async isEnabled(userId: string): Promise<boolean> {
    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId },
        select: { enabled: true },
      });

      return twoFactorAuth?.enabled || false;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  // Get 2FA status for user
  async getStatus(userId: string) {
    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId },
        select: {
          enabled: true,
          verifiedAt: true,
          preferredMethod: true,
          smsEnabled: true,
          recoveryEmail: true,
          trustedDevices: true,
          lastUsedAt: true,
        },
      });

      if (!twoFactorAuth) {
        return {
          enabled: false,
          configured: false,
        };
      }

      // Count remaining backup codes
      const backupCodeCount = await prisma.backupCode.count({
        where: {
          userId,
          usedAt: null,
        },
      });

      return {
        enabled: twoFactorAuth.enabled,
        configured: true,
        verifiedAt: twoFactorAuth.verifiedAt,
        preferredMethod: twoFactorAuth.preferredMethod,
        smsEnabled: twoFactorAuth.smsEnabled,
        hasRecoveryEmail: !!twoFactorAuth.recoveryEmail,
        backupCodesRemaining: backupCodeCount,
        trustedDeviceCount: (twoFactorAuth.trustedDevices as any[])?.length || 0,
        lastUsedAt: twoFactorAuth.lastUsedAt,
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw new Error('Failed to get 2FA status');
    }
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Check if 2FA is enabled
      const isEnabled = await this.isEnabled(userId);
      if (!isEnabled) {
        throw new Error('Two-factor authentication is not enabled');
      }

      // Remove old backup codes
      await prisma.backupCode.deleteMany({
        where: { userId },
      });

      // Generate new codes
      const { codes, hashedCodes } = this.generateBackupCodes();

      // Store new codes
      await prisma.backupCode.createMany({
        data: hashedCodes.map(code => ({
          userId,
          code,
        })),
      });

      return codes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  // Disable 2FA
  async disable(userId: string, password: string): Promise<boolean> {
    try {
      // Verify user's password first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user || !user.password) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = bcrypt.compareSync(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Delete 2FA settings
      await prisma.twoFactorAuth.delete({
        where: { userId },
      });

      // Delete backup codes
      await prisma.backupCode.deleteMany({
        where: { userId },
      });

      // Delete any recovery attempts
      await prisma.twoFactorRecovery.deleteMany({
        where: { userId },
      });

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return false;
    }
  }

  // Initiate recovery process
  async initiateRecovery(email: string, method: RecoveryMethod = RecoveryMethod.EMAIL): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { twoFactorAuth: true },
      });

      if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
        throw new Error('Two-factor authentication not configured');
      }

      // Generate recovery token
      const token = crypto.randomBytes(RECOVERY_TOKEN_BYTES).toString('hex');

      // Determine destination
      let destination = email;
      if (method === RecoveryMethod.SMS && user.twoFactorAuth.phoneNumber) {
        destination = this.decrypt(user.twoFactorAuth.phoneNumber);
      } else if (method === RecoveryMethod.EMAIL && user.twoFactorAuth.recoveryEmail) {
        destination = user.twoFactorAuth.recoveryEmail;
      }

      // Create recovery record
      await prisma.twoFactorRecovery.create({
        data: {
          userId: user.id,
          token,
          method,
          destination: this.encrypt(destination),
          expiresAt: new Date(Date.now() + RECOVERY_TOKEN_EXPIRY),
        },
      });

      // In production, send recovery code via email/SMS
      // For now, return the token for testing
      return token;
    } catch (error) {
      console.error('Error initiating recovery:', error);
      throw new Error('Failed to initiate recovery');
    }
  }

  // Complete recovery process
  async completeRecovery(token: string, newPassword?: string): Promise<boolean> {
    try {
      const recovery = await prisma.twoFactorRecovery.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!recovery) {
        throw new Error('Invalid recovery token');
      }

      if (recovery.expiresAt < new Date()) {
        throw new Error('Recovery token expired');
      }

      if (recovery.attempts >= recovery.maxAttempts) {
        throw new Error('Too many attempts');
      }

      // Update attempt count
      await prisma.twoFactorRecovery.update({
        where: { id: recovery.id },
        data: { attempts: recovery.attempts + 1 },
      });

      // Disable 2FA temporarily
      await prisma.twoFactorAuth.update({
        where: { userId: recovery.userId },
        data: {
          enabled: false,
          // Clear trusted devices on recovery
          trustedDevices: [],
        },
      });

      // Update password if provided
      if (newPassword) {
        const hashedPassword = bcrypt.hashSync(newPassword, SALT_ROUNDS);
        await prisma.user.update({
          where: { id: recovery.userId },
          data: { password: hashedPassword },
        });
      }

      // Mark recovery as verified
      await prisma.twoFactorRecovery.update({
        where: { id: recovery.id },
        data: { verifiedAt: new Date() },
      });

      // Clean up old recovery attempts
      await prisma.twoFactorRecovery.deleteMany({
        where: {
          userId: recovery.userId,
          id: { not: recovery.id },
        },
      });

      return true;
    } catch (error) {
      console.error('Error completing recovery:', error);
      return false;
    }
  }

  // Check if device is trusted
  async isTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId },
        select: { trustedDevices: true },
      });

      if (!twoFactorAuth) {
        return false;
      }

      const trustedDevices = (twoFactorAuth.trustedDevices as any[]) || [];
      return trustedDevices.some(device => device.id === deviceId);
    } catch (error) {
      console.error('Error checking trusted device:', error);
      return false;
    }
  }

  // Remove trusted device
  async removeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!twoFactorAuth) {
        return false;
      }

      const trustedDevices = ((twoFactorAuth.trustedDevices as any[]) || [])
        .filter(device => device.id !== deviceId);

      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { trustedDevices },
      });

      return true;
    } catch (error) {
      console.error('Error removing trusted device:', error);
      return false;
    }
  }
}

// Export singleton instance
export const twoFactorService = new TwoFactorService();