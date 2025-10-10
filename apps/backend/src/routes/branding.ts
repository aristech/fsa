import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Tenant } from '../models';
import { requireFeature } from '../middleware/subscription-enforcement';
import { resourceLimitMiddleware, trackResourceUsage } from '../middleware/usage-tracking';
import { FileTrackingService } from '../services/file-tracking-service';

// ----------------------------------------------------------------------


// ----------------------------------------------------------------------

export default async function brandingRoutes(fastify: FastifyInstance) {
  // Get tenant branding settings
  fastify.get('/branding', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({ error: 'User not authenticated' });
      }

      // Get tenant with branding settings
      const tenant = await Tenant.findById(user.tenantId);
      if (!tenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }

      // Return branding settings (including default values if not set)
      const branding = {
        logoUrl: tenant.branding?.logoUrl || null,
        companyInfo: {
          website: tenant.branding?.companyInfo?.website || null,
          description: tenant.branding?.companyInfo?.description || null,
          industry: tenant.branding?.companyInfo?.industry || null,
        },
        canCustomize: tenant.subscription?.plan !== 'free',
      };

      return reply.send({ branding });
    } catch (error) {
      fastify.log.error({ error }, 'Error getting branding settings');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });




  // Upload logo endpoint
  fastify.post(
    '/branding/upload-logo',
    {
      preHandler: [resourceLimitMiddleware.checkFileUpload('logo')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' });
        }

        // Only tenant owners can upload logos
        if (!user.isTenantOwner) {
          return reply.status(403).send({
            error: 'Only tenant owners can upload logos',
            code: 'TENANT_OWNER_REQUIRED',
            debug: {
              userId: user.id,
              userRole: user.role,
              isTenantOwner: user.isTenantOwner
            }
          });
        }

        // Check if user has at least basic plan (not free)
        const tenant = (request as any).tenant;
        if (tenant.subscription.plan === 'free') {
          return reply.status(403).send({
            error: 'Logo upload is available with Basic plan and above. Please upgrade your subscription.',
            code: 'PLAN_UPGRADE_REQUIRED',
            debug: {
              currentPlan: tenant.subscription.plan,
              tenantId: tenant._id
            }
          });
        }

        // Get file data from middleware
        const fileData = (request as any).fileData;
        if (!fileData) {
          return reply.status(400).send({ error: 'No file data found' });
        }

        // Validate file type (only images)
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml'
        ];

        if (!allowedMimeTypes.includes(fileData.mimetype)) {
          return reply.status(400).send({
            error: `Invalid file type: ${fileData.mimetype}. Only image files are allowed.`,
          });
        }

        // Validate file size (max 5MB to match frontend)
        if (fileData.size > 5 * 1024 * 1024) {
          return reply.status(413).send({
            error: 'Logo file too large. Maximum size is 5MB.',
          });
        }

        // Save file to uploads directory
        const fs = require('fs').promises;
        const path = require('path');

        const sanitizedFilename = fileData.filename
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_');

        const filename = `logo-${Date.now()}-${sanitizedFilename}`;
        const baseDir = path.join(process.cwd(), 'uploads', user.tenantId, 'branding', 'logo');

        await fs.mkdir(baseDir, { recursive: true });

        const filePath = path.join(baseDir, filename);
        await fs.writeFile(filePath, fileData.buffer);

        // Generate URL for the logo
        const encodedFilename = encodeURIComponent(filename);
        const logoPath = `/api/v1/uploads/${user.tenantId}/branding/logo/${encodedFilename}`;
        const host = request.headers.host;
        const protocol = (request.headers["x-forwarded-proto"] as string) || request.protocol;
        const logoUrl = `${protocol}://${host}${logoPath}`;

        // Generate token for secure access
        const token = (fastify as any).jwt.sign(
          { tenantId: user.tenantId, userId: user.id },
          { expiresIn: "7d" }
        );
        const logoUrlWithToken = `${logoUrl}?token=${token}`;

        // Delete old logo if it exists
        if (tenant.branding?.logoUrl) {
          try {
            // Extract old filename from URL
            // URL format: http://.../api/v1/uploads/{tenantId}/branding/logo/{filename}?token=...
            const oldLogoUrl = tenant.branding.logoUrl;
            const urlParts = oldLogoUrl.split('/');
            const filenameWithQuery = urlParts[urlParts.length - 1];
            const oldFilename = filenameWithQuery.split('?')[0]; // Remove query params
            const decodedOldFilename = decodeURIComponent(oldFilename);

            if (oldFilename && !oldFilename.includes('http')) {
              // Track old logo deletion
              await FileTrackingService.trackFileDeletion(user.tenantId, decodedOldFilename);

              // Delete old logo file from disk
              const oldLogoPath = path.join(baseDir, decodedOldFilename);
              try {
                await fs.unlink(oldLogoPath);
                fastify.log.info({ oldFilename: decodedOldFilename }, 'Old logo deleted successfully');
              } catch (unlinkError) {
                // File might not exist, log but don't fail
                fastify.log.warn({ error: unlinkError, oldFilename: decodedOldFilename }, 'Old logo file not found on disk');
              }
            }
          } catch (cleanupError) {
            // Log error but don't fail the upload
            fastify.log.error({ error: cleanupError }, 'Error cleaning up old logo');
          }
        }

        // Update tenant branding with new logo URL
        const updatedTenant = await Tenant.findByIdAndUpdate(
          user.tenantId,
          { $set: { 'branding.logoUrl': logoUrlWithToken } },
          { new: true }
        );

        if (!updatedTenant) {
          // Clean up uploaded file if database update failed
          try {
            await fs.unlink(filePath);
          } catch (cleanupError) {
            console.error('Error cleaning up file after DB failure:', cleanupError);
          }
          return reply.status(404).send({ error: 'Tenant not found' });
        }

        // Track file upload in usage statistics
        try {
          await trackResourceUsage(user.tenantId, 'storage', 1, {
            filename,
            originalName: fileData.filename,
            mimeType: fileData.mimetype,
            size: fileData.size,
            category: 'logo',
            filePath
          });
        } catch (trackingError) {
          console.error('Error tracking file upload usage:', trackingError);
          // Don't fail the request if tracking fails
        }

        fastify.log.info({
          tenantId: user.tenantId,
          filename,
          logoUrl: logoUrlWithToken,
          fileSize: fileData.size
        }, 'Logo uploaded, branding updated, and usage tracked');

        return reply.send({
          message: 'Logo uploaded successfully',
          logoUrl: logoUrlWithToken,
          logoPath: logoPath,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error uploading logo');
        return reply.status(500).send({ error: 'Logo upload failed' });
      }
    }
  );

  // Get company information
  fastify.get('/company-info', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({ error: 'User not authenticated' });
      }

      // Get tenant with company information
      const tenant = await Tenant.findById(user.tenantId);
      if (!tenant) {
        return reply.status(404).send({
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND',
          debug: {
            userId: user.id,
            tenantId: user.tenantId,
            endpoint: 'GET /api/v1/company-info'
          }
        });
      }

      const companyInfo = {
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone || '',
        address: {
          street: tenant.address?.street || '',
          city: tenant.address?.city || '',
          state: tenant.address?.state || '',
          zipCode: tenant.address?.zipCode || '',
          country: tenant.address?.country || 'GR',
        },
        website: tenant.branding?.companyInfo?.website || '',
        description: tenant.branding?.companyInfo?.description || '',
        industry: tenant.branding?.companyInfo?.industry || '',
      };

      return reply.send({ companyInfo });
    } catch (error) {
      fastify.log.error({ error }, 'Error getting company information');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update company information
  fastify.put('/company-info', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({ error: 'User not authenticated' });
      }

      // Only tenant owners can update company info
      if (!user.isTenantOwner) {
        return reply.status(403).send({
          error: 'Only tenant owners can update company information',
          code: 'TENANT_OWNER_REQUIRED',
          debug: {
            userId: user.id,
            userRole: user.role,
            isTenantOwner: user.isTenantOwner,
            endpoint: 'PUT /api/v1/company-info'
          }
        });
      }

      const updateSchema = z.object({
        name: z.string().min(1, 'Company name is required').max(100).optional(),
        phone: z.string().max(20).optional(),
        address: z.object({
          street: z.string().max(200).optional(),
          city: z.string().max(100).optional(),
          state: z.string().max(100).optional(),
          zipCode: z.string().max(20).optional(),
          country: z.string().max(100).optional(),
        }).optional(),
        website: z.string().url().optional().or(z.literal('')),
        description: z.string().max(500).optional(),
        industry: z.string().max(100).optional(),
      });

      const validatedData = updateSchema.parse(request.body);

      // Get tenant
      const tenant = await Tenant.findById(user.tenantId);
      if (!tenant) {
        return reply.status(404).send({
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND',
          debug: {
            userId: user.id,
            tenantId: user.tenantId,
            endpoint: 'PUT /api/v1/company-info'
          }
        });
      }

      // Prepare update object
      const updateData: any = {};

      if (validatedData.name !== undefined) {
        updateData.name = validatedData.name;
      }

      if (validatedData.phone !== undefined) {
        updateData.phone = validatedData.phone;
      }

      if (validatedData.address !== undefined) {
        updateData.address = { ...tenant.address, ...validatedData.address };
      }

      if (validatedData.website !== undefined || validatedData.description !== undefined || validatedData.industry !== undefined) {
        updateData['branding.companyInfo'] = {
          ...tenant.branding?.companyInfo,
          ...(validatedData.website !== undefined && { website: validatedData.website }),
          ...(validatedData.description !== undefined && { description: validatedData.description }),
          ...(validatedData.industry !== undefined && { industry: validatedData.industry }),
        };
      }

      // Update tenant
      const updatedTenant = await Tenant.findByIdAndUpdate(
        user.tenantId,
        { $set: updateData },
        { new: true }
      );

      if (!updatedTenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }

      fastify.log.info({ tenantId: user.tenantId }, 'Company information updated successfully');

      const companyInfo = {
        name: updatedTenant.name,
        email: updatedTenant.email,
        phone: updatedTenant.phone || '',
        address: {
          street: updatedTenant.address?.street || '',
          city: updatedTenant.address?.city || '',
          state: updatedTenant.address?.state || '',
          zipCode: updatedTenant.address?.zipCode || '',
          country: updatedTenant.address?.country || 'GR',
        },
        website: updatedTenant.branding?.companyInfo?.website || '',
        description: updatedTenant.branding?.companyInfo?.description || '',
        industry: updatedTenant.branding?.companyInfo?.industry || '',
      };

      return reply.send({
        message: 'Company information updated successfully',
        companyInfo
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.issues,
          debug: {
            endpoint: 'PUT /api/v1/company-info',
            receivedData: request.body
          }
        });
      }

      fastify.log.error({ error }, 'Error updating company information');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}