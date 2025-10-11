import { Tenant } from '../models/Tenant';
import { FastifyRequest } from 'fastify';
import path from 'path';
import fs from 'fs';

// ----------------------------------------------------------------------

export interface FileMetadata {
  tenantId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number; // in bytes
  category: 'logo' | 'workorder_attachment' | 'client_document' | 'material_image' | 'subtask_attachment' | 'other';
  uploadDate: Date;
  filePath: string;
}

export interface UsageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeGB: number;
  filesByCategory: Record<string, number>;
  sizeByCategory: Record<string, number>;
}

// ----------------------------------------------------------------------

export class FileTrackingService {
  /**
   * Track a new file upload and update tenant usage
   */
  static async trackFileUpload(
    tenantId: string,
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    category: FileMetadata['category'],
    filePath: string
  ): Promise<void> {
    try {
      // Validate size is a valid number
      if (typeof size !== 'number' || !isFinite(size) || size < 0) {
        throw new Error(`Invalid file size: ${size}`);
      }

      // Convert size to GB
      const sizeGB = size / (1024 * 1024 * 1024);

      // Update tenant storage usage
      await Tenant.findByIdAndUpdate(
        tenantId,
        {
          $inc: {
            'subscription.usage.storageUsedGB': sizeGB,
            'subscription.usage.totalFiles': 1,
          },
          $push: {
            'fileMetadata': {
              filename,
              originalName,
              mimeType,
              size,
              category,
              uploadDate: new Date(),
              filePath,
            }
          }
        },
        { new: true }
      );

      console.log(`File tracked: ${filename}, Size: ${sizeGB.toFixed(6)}GB, Category: ${category}`);
    } catch (error) {
      console.error('Error tracking file upload:', error);
      throw error;
    }
  }

  /**
   * Track file deletion and update tenant usage
   * @throws Error if tenant not found or file not in metadata
   */
  static async trackFileDeletion(tenantId: string, filename: string): Promise<{ tracked: boolean; reason?: string }> {
    try {
      // Find the tenant and file metadata
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Find file metadata
      const fileMetadata = (tenant as any).fileMetadata?.find(
        (file: FileMetadata) => file.filename === filename
      );

      if (!fileMetadata) {
        // File not in metadata - could be from before tracking was implemented
        // or manually added file. Log as warning but don't throw.
        const warningMsg = `File ${filename} not found in tenant metadata. Cannot update quota. File may have been uploaded before tracking was implemented or manually added.`;
        console.warn(`⚠️  ${warningMsg}`);
        return { tracked: false, reason: 'File not found in metadata' };
      }

      const sizeGB = fileMetadata.size / (1024 * 1024 * 1024);

      // Update tenant storage usage
      await Tenant.findByIdAndUpdate(
        tenantId,
        {
          $inc: {
            'subscription.usage.storageUsedGB': -sizeGB,
            'subscription.usage.totalFiles': -1,
          },
          $pull: {
            'fileMetadata': { filename }
          }
        },
        { new: true }
      );

      console.log(`✅ File deletion tracked: ${filename}, Size: ${sizeGB.toFixed(6)}GB`);
      return { tracked: true };
    } catch (error) {
      console.error('❌ Error tracking file deletion:', error);
      throw error;
    }
  }

  /**
   * Check if tenant can upload file based on storage limits
   */
  static async canUploadFile(
    tenantId: string,
    fileSizeBytes: number
  ): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return { allowed: false, reason: 'Tenant not found' };
      }

      const currentUsageGB = tenant.subscription.usage.storageUsedGB || 0;
      const maxStorageGB = tenant.subscription.limits.maxStorageGB;
      const newFileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);

      // Check if unlimited storage (Enterprise plan)
      if (maxStorageGB === -1) {
        return { allowed: true };
      }

      // Check if adding this file would exceed limit
      const totalAfterUpload = currentUsageGB + newFileSizeGB;
      const canUpload = totalAfterUpload <= maxStorageGB;

      return {
        allowed: canUpload,
        reason: canUpload ? undefined : `Storage limit exceeded. Adding this file would use ${totalAfterUpload.toFixed(2)}GB of ${maxStorageGB}GB limit.`,
        currentUsage: currentUsageGB,
        limit: maxStorageGB,
      };
    } catch (error) {
      console.error('Error checking file upload permissions:', error);
      return { allowed: false, reason: 'Error checking storage limits' };
    }
  }

  /**
   * Get current usage statistics for a tenant
   */
  static async getUsageStats(tenantId: string): Promise<UsageStats | null> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return null;
      }

      const fileMetadata = (tenant as any).fileMetadata || [];
      const stats: UsageStats = {
        totalFiles: fileMetadata.length,
        totalSizeBytes: 0,
        totalSizeGB: 0,
        filesByCategory: {},
        sizeByCategory: {},
      };

      // Calculate stats from file metadata
      fileMetadata.forEach((file: FileMetadata) => {
        stats.totalSizeBytes += file.size;

        // Count by category
        stats.filesByCategory[file.category] = (stats.filesByCategory[file.category] || 0) + 1;
        stats.sizeByCategory[file.category] = (stats.sizeByCategory[file.category] || 0) + file.size;
      });

      stats.totalSizeGB = stats.totalSizeBytes / (1024 * 1024 * 1024);

      return stats;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }

  /**
   * Clean up orphaned files (files that exist on disk but not in DB)
   */
  static async cleanupOrphanedFiles(tenantId: string): Promise<{ cleaned: number; errors: string[] }> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return { cleaned: 0, errors: ['Tenant not found'] };
      }

      const fileMetadata = (tenant as any).fileMetadata || [];
      const uploadsDir = path.join(process.cwd(), 'uploads', tenantId);

      if (!fs.existsSync(uploadsDir)) {
        return { cleaned: 0, errors: [] };
      }

      const dbFiles = new Set(fileMetadata.map((f: FileMetadata) => f.filename));
      let cleaned = 0;
      const errors: string[] = [];

      // Recursively check all files in uploads directory
      const checkDirectory = (dirPath: string) => {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
          const fullPath = path.join(dirPath, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            checkDirectory(fullPath);
          } else {
            // Check if this file is tracked in database
            if (!dbFiles.has(file)) {
              try {
                fs.unlinkSync(fullPath);
                cleaned++;
                console.log(`Cleaned orphaned file: ${fullPath}`);
              } catch (error) {
                errors.push(`Failed to delete ${fullPath}: ${error}`);
              }
            }
          }
        });
      };

      checkDirectory(uploadsDir);

      return { cleaned, errors };
    } catch (error) {
      console.error('Error cleaning orphaned files:', error);
      return { cleaned: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Recalculate usage for a tenant (useful for fixing inconsistencies)
   * @param tenantId - The tenant ID to recalculate usage for
   * @param cooldownMinutes - Minimum minutes between recalculations (default: 60)
   * @returns Object indicating if recalculation was performed and the results
   */
  static async recalculateUsage(
    tenantId: string,
    cooldownMinutes: number = 60
  ): Promise<{ recalculated: boolean; reason?: string; stats?: UsageStats }> {
    try {
      // Check if recalculation was recently run
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return { recalculated: false, reason: 'Tenant not found' };
      }

      const lastRecalc = (tenant as any).subscription?.usage?.lastQuotaRecalculation;
      if (lastRecalc) {
        const minutesSinceLastRecalc = (Date.now() - new Date(lastRecalc).getTime()) / (1000 * 60);
        if (minutesSinceLastRecalc < cooldownMinutes) {
          console.log(`⏭️  Skipping quota recalculation for tenant ${tenantId} (last run ${minutesSinceLastRecalc.toFixed(0)} minutes ago)`);
          return {
            recalculated: false,
            reason: `Cooldown period active (${minutesSinceLastRecalc.toFixed(0)} minutes since last run)`,
          };
        }
      }

      // Get current stats from file metadata
      const stats = await this.getUsageStats(tenantId);
      if (!stats) {
        throw new Error('Could not get usage stats');
      }

      // Update tenant with recalculated values AND timestamp
      await Tenant.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            'subscription.usage.storageUsedGB': stats.totalSizeGB,
            'subscription.usage.totalFiles': stats.totalFiles,
            'subscription.usage.lastQuotaRecalculation': new Date(),
          }
        },
        { new: true }
      );

      console.log(`✅ Recalculated usage for tenant ${tenantId}: ${stats.totalFiles} files, ${stats.totalSizeGB.toFixed(2)}GB`);
      return { recalculated: true, stats };
    } catch (error) {
      console.error('❌ Error recalculating usage:', error);
      throw error;
    }
  }
}