import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Tenant } from '../models';
import { requireFeature } from '../middleware/subscription-enforcement';

// ----------------------------------------------------------------------

// Branding update schema
const BrandingUpdateSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  companyInfo: z.object({
    website: z.string().url().optional(),
    description: z.string().max(500).optional(),
    industry: z.string().max(100).optional(),
  }).optional(),
});

// ----------------------------------------------------------------------

// Helper function to lighten a hex color
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

// Helper function to darken a hex color
function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
    (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
    (B > 255 ? 255 : B < 0 ? 0 : B))
    .toString(16).slice(1);
}

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
        primaryColor: tenant.branding?.primaryColor || '#1976d2',
        secondaryColor: tenant.branding?.secondaryColor || '#ed6c02',
        companyInfo: {
          website: tenant.branding?.companyInfo?.website || null,
          description: tenant.branding?.companyInfo?.description || null,
          industry: tenant.branding?.companyInfo?.industry || null,
        },
        canCustomize: tenant.subscription?.limits?.features?.customBranding || false,
      };

      return reply.send({ branding });
    } catch (error) {
      fastify.log.error({ error }, 'Error getting branding settings');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update tenant branding settings
  fastify.put(
    '/branding',
    {
      preHandler: [requireFeature('custom_branding')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' });
        }

        // Only tenant owners can update branding
        if (!user.isTenantOwner) {
          return reply.status(403).send({ error: 'Only tenant owners can update branding settings' });
        }

        // Validate request body
        const validatedData = BrandingUpdateSchema.parse(request.body);

        // Get tenant
        const tenant = await Tenant.findById(user.tenantId);
        if (!tenant) {
          return reply.status(404).send({ error: 'Tenant not found' });
        }

        // Prepare update object
        const updateData: any = {};

        if (validatedData.logoUrl !== undefined) {
          updateData['branding.logoUrl'] = validatedData.logoUrl;
        }

        if (validatedData.primaryColor !== undefined) {
          updateData['branding.primaryColor'] = validatedData.primaryColor;
        }

        if (validatedData.secondaryColor !== undefined) {
          updateData['branding.secondaryColor'] = validatedData.secondaryColor;
        }

        if (validatedData.companyInfo !== undefined) {
          if (validatedData.companyInfo.website !== undefined) {
            updateData['branding.companyInfo.website'] = validatedData.companyInfo.website;
          }
          if (validatedData.companyInfo.description !== undefined) {
            updateData['branding.companyInfo.description'] = validatedData.companyInfo.description;
          }
          if (validatedData.companyInfo.industry !== undefined) {
            updateData['branding.companyInfo.industry'] = validatedData.companyInfo.industry;
          }
        }

        // Update tenant branding
        const updatedTenant = await Tenant.findByIdAndUpdate(
          user.tenantId,
          { $set: updateData },
          { new: true }
        );

        if (!updatedTenant) {
          return reply.status(404).send({ error: 'Tenant not found' });
        }

        fastify.log.info({ tenantId: user.tenantId }, 'Tenant branding updated successfully');

        // Return updated branding settings
        const branding = {
          logoUrl: updatedTenant.branding?.logoUrl || null,
          primaryColor: updatedTenant.branding?.primaryColor || '#1976d2',
          secondaryColor: updatedTenant.branding?.secondaryColor || '#ed6c02',
          companyInfo: {
            website: updatedTenant.branding?.companyInfo?.website || null,
            description: updatedTenant.branding?.companyInfo?.description || null,
            industry: updatedTenant.branding?.companyInfo?.industry || null,
          },
          canCustomize: updatedTenant.subscription?.limits?.features?.customBranding || false,
        };

        return reply.send({
          message: 'Branding settings updated successfully',
          branding
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation error',
            details: error.issues,
          });
        }

        fastify.log.error({ error }, 'Error updating branding settings');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Reset branding settings to defaults
  fastify.delete(
    '/branding/reset',
    {
      preHandler: [requireFeature('custom_branding')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' });
        }

        // Only tenant owners can reset branding
        if (!user.isTenantOwner) {
          return reply.status(403).send({ error: 'Only tenant owners can reset branding settings' });
        }

        // Reset branding to defaults
        const updatedTenant = await Tenant.findByIdAndUpdate(
          user.tenantId,
          {
            $unset: {
              'branding.logoUrl': '',
              'branding.companyInfo.website': '',
              'branding.companyInfo.description': '',
              'branding.companyInfo.industry': '',
            },
            $set: {
              'branding.primaryColor': '#1976d2',
              'branding.secondaryColor': '#ed6c02',
            },
          },
          { new: true }
        );

        if (!updatedTenant) {
          return reply.status(404).send({ error: 'Tenant not found' });
        }

        fastify.log.info({ tenantId: user.tenantId }, 'Tenant branding reset to defaults');

        // Return reset branding settings
        const branding = {
          logoUrl: null,
          primaryColor: '#1976d2',
          secondaryColor: '#ed6c02',
          companyInfo: {
            website: null,
            description: null,
            industry: null,
          },
          canCustomize: updatedTenant.subscription?.limits?.features?.customBranding || false,
        };

        return reply.send({
          message: 'Branding settings reset to defaults',
          branding
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error resetting branding settings');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Get branding theme CSS variables (for frontend styling)
  fastify.get('/branding/theme', async (request: FastifyRequest, reply: FastifyReply) => {
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

      // Generate CSS variables for theme
      const primaryColor = tenant.branding?.primaryColor || '#1976d2';
      const secondaryColor = tenant.branding?.secondaryColor || '#ed6c02';

      const cssVariables = {
        '--primary-color': primaryColor,
        '--secondary-color': secondaryColor,
        '--primary-color-light': lightenColor(primaryColor, 10),
        '--primary-color-dark': darkenColor(primaryColor, 10),
        '--secondary-color-light': lightenColor(secondaryColor, 10),
        '--secondary-color-dark': darkenColor(secondaryColor, 10),
      };

      return reply.send({
        cssVariables,
        logoUrl: tenant.branding?.logoUrl || null,
        companyName: tenant.name,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error getting branding theme');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Upload logo endpoint
  fastify.post(
    '/branding/upload-logo',
    {
      preHandler: [requireFeature('custom_branding')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' });
        }

        // Only tenant owners can upload logos
        if (!user.isTenantOwner) {
          return reply.status(403).send({ error: 'Only tenant owners can upload logos' });
        }

        // Process multipart upload
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({ error: 'No file uploaded' });
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

        if (!allowedMimeTypes.includes(data.mimetype)) {
          return reply.status(400).send({
            error: `Invalid file type: ${data.mimetype}. Only image files are allowed.`,
          });
        }

        // Validate file size (max 2MB)
        const buffer = await data.toBuffer();
        if (buffer.length > 2 * 1024 * 1024) {
          return reply.status(413).send({
            error: 'Logo file too large. Maximum size is 2MB.',
          });
        }

        // Save file to uploads directory
        const fs = require('fs').promises;
        const path = require('path');

        const sanitizedFilename = data.filename
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_');

        const filename = `logo-${Date.now()}-${sanitizedFilename}`;
        const baseDir = path.join(process.cwd(), 'uploads', user.tenantId, 'branding', 'logo');

        await fs.mkdir(baseDir, { recursive: true });

        const filePath = path.join(baseDir, filename);
        await fs.writeFile(filePath, buffer);

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

        // Update tenant branding with new logo URL
        const updatedTenant = await Tenant.findByIdAndUpdate(
          user.tenantId,
          { $set: { 'branding.logoUrl': logoUrlWithToken } },
          { new: true }
        );

        if (!updatedTenant) {
          return reply.status(404).send({ error: 'Tenant not found' });
        }

        fastify.log.info({
          tenantId: user.tenantId,
          filename,
          logoUrl: logoUrlWithToken
        }, 'Logo uploaded and branding updated');

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
}