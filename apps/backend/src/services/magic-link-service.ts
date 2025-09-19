import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MagicLink, IMagicLink } from '../models/MagicLink';
import { config } from '../config';

export interface MagicLinkData {
  email: string;
  tenantId: string;
  type: 'personnel_invitation' | 'tenant_activation' | 'password_reset';
  metadata?: {
    firstName?: string;
    lastName?: string;
    roleId?: string;
    phone?: string;
    companyName?: string;
    tenantSlug?: string;
    [key: string]: any;
  };
  userId?: string;
  expirationHours?: number; // Default 24 hours
}

export interface MagicLinkValidationResult {
  success: boolean;
  data?: {
    email: string;
    tenantId: string;
    userId?: string;
    type: string;
    metadata?: any;
  };
  error?: string;
}

export class MagicLinkService {
  private static readonly DEFAULT_EXPIRATION_HOURS = 24;
  private static readonly TOKEN_LENGTH = 32;

  /**
   * Generate a secure magic link token
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create a magic link and store it in the database
   */
  static async createMagicLink(data: MagicLinkData): Promise<{
    success: boolean;
    magicLink?: string;
    token?: string;
    error?: string;
  }> {
    try {
      // Generate secure token
      const token = this.generateSecureToken();
      
      // Calculate expiration
      const expirationHours = data.expirationHours || this.DEFAULT_EXPIRATION_HOURS;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      // Invalidate any existing unused magic links for this email + tenant + type
      await MagicLink.updateMany(
        {
          email: data.email.toLowerCase(),
          tenantId: data.tenantId,
          type: data.type,
          isUsed: false,
        },
        {
          isUsed: true, // Mark as used to invalidate
        }
      );

      // Create new magic link record
      const magicLinkRecord = new MagicLink({
        token,
        email: data.email.toLowerCase(),
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        metadata: data.metadata,
        isUsed: false,
        expiresAt,
      });

      await magicLinkRecord.save();

      // Generate the magic link URL
      const baseUrl = config.FRONTEND_URL;
      const magicLink = `${baseUrl}/auth/jwt/verify-account?token=${token}`;

      return {
        success: true,
        magicLink,
        token,
      };
    } catch (error) {
      console.error('Error creating magic link:', error);
      return {
        success: false,
        error: 'Failed to create magic link',
      };
    }
  }

  /**
   * Validate and consume a magic link token
   */
  static async validateAndConsumeMagicLink(token: string): Promise<MagicLinkValidationResult> {
    try {
      // Find the magic link
      const magicLinkRecord = await MagicLink.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() }, // Not expired
      });

      if (!magicLinkRecord) {
        return {
          success: false,
          error: 'Invalid or expired magic link',
        };
      }

      // Mark as used (consume the token)
      magicLinkRecord.isUsed = true;
      await magicLinkRecord.save();

      return {
        success: true,
        data: {
          email: magicLinkRecord.email,
          tenantId: magicLinkRecord.tenantId.toString(),
          userId: magicLinkRecord.userId?.toString(),
          type: magicLinkRecord.type,
          metadata: magicLinkRecord.metadata,
        },
      };
    } catch (error) {
      console.error('Error validating magic link:', error);
      return {
        success: false,
        error: 'Failed to validate magic link',
      };
    }
  }

  /**
   * Get magic link information without consuming it (for preview/validation)
   */
  static async getMagicLinkInfo(token: string): Promise<MagicLinkValidationResult> {
    try {
      const magicLinkRecord = await MagicLink.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      if (!magicLinkRecord) {
        return {
          success: false,
          error: 'Invalid or expired magic link',
        };
      }

      return {
        success: true,
        data: {
          email: magicLinkRecord.email,
          tenantId: magicLinkRecord.tenantId.toString(),
          userId: magicLinkRecord.userId?.toString(),
          type: magicLinkRecord.type,
          metadata: magicLinkRecord.metadata,
        },
      };
    } catch (error) {
      console.error('Error getting magic link info:', error);
      return {
        success: false,
        error: 'Failed to get magic link information',
      };
    }
  }

  /**
   * Clean up expired magic links (maintenance function)
   */
  static async cleanupExpiredLinks(): Promise<void> {
    try {
      const result = await MagicLink.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      console.log(`Cleaned up ${result.deletedCount} expired magic links`);
    } catch (error) {
      console.error('Error cleaning up expired magic links:', error);
    }
  }

  /**
   * Revoke all magic links for a specific email and tenant
   */
  static async revokeMagicLinks(email: string, tenantId: string, type?: string): Promise<void> {
    try {
      const filter: any = {
        email: email.toLowerCase(),
        tenantId,
        isUsed: false,
      };

      if (type) {
        filter.type = type;
      }

      await MagicLink.updateMany(filter, { isUsed: true });
    } catch (error) {
      console.error('Error revoking magic links:', error);
    }
  }
}
