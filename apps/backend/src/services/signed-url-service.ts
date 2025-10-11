import * as crypto from 'crypto';
import { config } from '../config';

/**
 * Signed URL Service
 *
 * Provides secure, time-limited access to files without exposing JWT tokens.
 * Uses HMAC-SHA256 signatures to prevent tampering and unauthorized access.
 */

export interface SignedUrlParams {
  tenantId: string;
  scope: string;
  ownerId: string;
  filename: string;
  action?: 'view' | 'download';
  expiresInMinutes?: number;
}

export interface SignedUrlData {
  url: string;
  expiresAt: number;
}

export interface VerifiedSignature {
  valid: boolean;
  expired?: boolean;
  tenantId?: string;
  scope?: string;
  ownerId?: string;
  filename?: string;
  action?: 'view' | 'download';
}

export class SignedUrlService {
  private static readonly DEFAULT_EXPIRY_MINUTES = 60; // 1 hour
  private static readonly DOWNLOAD_EXPIRY_MINUTES = 15; // 15 minutes for downloads
  private static readonly SHARE_EXPIRY_MINUTES = 24 * 60; // 24 hours for sharing

  /**
   * Generate a signed URL for secure file access
   */
  static generateSignedUrl(params: SignedUrlParams): SignedUrlData {
    const {
      tenantId,
      scope,
      ownerId,
      filename,
      action = 'view',
      expiresInMinutes,
    } = params;

    // Determine expiry based on action
    let expiryMinutes = expiresInMinutes;
    if (!expiryMinutes) {
      expiryMinutes =
        action === 'download'
          ? this.DOWNLOAD_EXPIRY_MINUTES
          : this.DEFAULT_EXPIRY_MINUTES;
    }

    const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

    // Create the payload
    const payload = {
      tenantId,
      scope,
      ownerId,
      filename,
      action,
      expiresAt,
    };

    // Generate signature
    const signature = this.sign(payload);

    // Encode the payload and signature
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${encodedPayload}.${signature}`;

    // Generate the URL
    const url = `/api/v1/files/secure/${token}`;

    return {
      url,
      expiresAt,
    };
  }

  /**
   * Verify a signed URL token
   */
  static verifySignedUrl(token: string): VerifiedSignature {
    try {
      // Split token into payload and signature
      const parts = token.split('.');
      if (parts.length !== 2) {
        return { valid: false };
      }

      const [encodedPayload, providedSignature] = parts;

      // Decode payload
      const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson);

      // Verify signature
      const expectedSignature = this.sign(payload);
      if (providedSignature !== expectedSignature) {
        return { valid: false };
      }

      // Check expiry
      if (Date.now() > payload.expiresAt) {
        return {
          valid: false,
          expired: true,
        };
      }

      // Return verified data
      return {
        valid: true,
        tenantId: payload.tenantId,
        scope: payload.scope,
        ownerId: payload.ownerId,
        filename: payload.filename,
        action: payload.action,
      };
    } catch (error) {
      console.error('Error verifying signed URL:', error);
      return { valid: false };
    }
  }

  /**
   * Generate multiple signed URLs for a list of files
   */
  static generateSignedUrls(
    files: Array<{
      tenantId: string;
      scope: string;
      ownerId: string;
      filename: string;
    }>,
    action: 'view' | 'download' = 'view',
    expiresInMinutes?: number
  ): Array<SignedUrlData> {
    return files.map((file) =>
      this.generateSignedUrl({
        ...file,
        action,
        expiresInMinutes,
      })
    );
  }

  /**
   * Generate a signature using HMAC-SHA256
   */
  private static sign(payload: any): string {
    const hmac = crypto.createHmac('sha256', config.JWT_SECRET);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('base64url');
  }

  /**
   * Check if a signed URL has expired
   */
  static isExpired(expiresAt: number): boolean {
    return Date.now() > expiresAt;
  }

  /**
   * Get time remaining for a signed URL (in minutes)
   */
  static getTimeRemaining(expiresAt: number): number {
    const remaining = expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / (60 * 1000)));
  }
}
