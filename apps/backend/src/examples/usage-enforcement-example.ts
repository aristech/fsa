/**
 * Example implementation showing how to properly enforce subscription limits
 * and track resource usage in your API endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth';
import { resourceLimitMiddleware, trackResourceUsage, trackResourceReduction } from '../middleware/usage-tracking';
import { Client } from '../models';

// Example: Client CRUD operations with proper limit enforcement
export async function exampleClientRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // CREATE CLIENT - with subscription limit enforcement
  fastify.post(
    '/clients',
    {
      preHandler: [
        // Check if tenant can create another client
        resourceLimitMiddleware.checkClientCreation(1),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenant = (request as any).tenant; // Available from middleware
        const clientData = request.body as any;

        // Create the client
        const client = new Client({
          ...clientData,
          tenantId: tenant._id,
          createdBy: user._id,
        });

        await client.save();

        // Track the usage AFTER successful creation
        await trackResourceUsage(tenant._id.toString(), 'clients', 1);

        fastify.log.info({
          tenantId: tenant._id,
          clientId: client._id,
          currentUsage: tenant.subscription.usage.currentClients + 1,
          limit: tenant.subscription.limits.maxClients
        }, 'Client created and usage tracked');

        return reply.status(201).send({
          success: true,
          message: 'Client created successfully',
          data: client,
        });

      } catch (error) {
        fastify.log.error({ error }, 'Error creating client');
        return reply.status(500).send({
          success: false,
          message: 'Failed to create client'
        });
      }
    }
  );

  // DELETE CLIENT - with usage reduction tracking
  fastify.delete(
    '/clients/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        // Find and delete the client
        const client = await Client.findOneAndUpdate(
          { _id: id, tenantId: user.tenantId },
          { isActive: false, deletedBy: user._id, deletedAt: new Date() },
          { new: true }
        );

        if (!client) {
          return reply.status(404).send({
            success: false,
            message: 'Client not found'
          });
        }

        // Track the usage reduction AFTER successful deletion
        await trackResourceReduction(user.tenantId, 'clients', 1);

        fastify.log.info({
          tenantId: user.tenantId,
          clientId: client._id,
        }, 'Client deleted and usage reduced');

        return reply.send({
          success: true,
          message: 'Client deleted successfully',
        });

      } catch (error) {
        fastify.log.error({ error }, 'Error deleting client');
        return reply.status(500).send({
          success: false,
          message: 'Failed to delete client'
        });
      }
    }
  );

  // BULK CREATE CLIENTS - with proper limit checking
  fastify.post(
    '/clients/bulk',
    {
      preHandler: [
        // This will be dynamically set based on request body
        // See the implementation below for how to handle dynamic counts
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { clients } = request.body as { clients: any[] };

        if (!clients || !Array.isArray(clients) || clients.length === 0) {
          return reply.status(400).send({
            success: false,
            message: 'Invalid clients data'
          });
        }

        // Manual limit check for bulk operations
        const tenant = (request as any).tenant;
        const currentClients = tenant.subscription.usage.currentClients;
        const maxClients = tenant.subscription.limits.maxClients;
        const requestedCount = clients.length;

        // Check if unlimited clients (Enterprise plan)
        if (maxClients !== -1 && (currentClients + requestedCount) > maxClients) {
          return reply.status(403).send({
            success: false,
            message: `Cannot create ${requestedCount} clients. Current: ${currentClients}, Limit: ${maxClients}`,
            code: 'SUBSCRIPTION_LIMIT_EXCEEDED'
          });
        }

        // Create all clients
        const createdClients = [];
        for (const clientData of clients) {
          const client = new Client({
            ...clientData,
            tenantId: tenant._id,
            createdBy: user._id,
          });

          await client.save();
          createdClients.push(client);
        }

        // Track usage for all created clients
        await trackResourceUsage(tenant._id.toString(), 'clients', requestedCount);

        fastify.log.info({
          tenantId: tenant._id,
          createdCount: requestedCount,
          currentUsage: currentClients + requestedCount,
          limit: maxClients
        }, 'Bulk clients created and usage tracked');

        return reply.status(201).send({
          success: true,
          message: `${requestedCount} clients created successfully`,
          data: createdClients,
        });

      } catch (error) {
        fastify.log.error({ error }, 'Error creating bulk clients');
        return reply.status(500).send({
          success: false,
          message: 'Failed to create clients'
        });
      }
    }
  );
}

/**
 * Example: File Upload with storage limit enforcement
 */
export async function exampleFileUploadRoute(fastify: FastifyInstance) {
  fastify.post(
    '/upload',
    {
      preHandler: [
        authenticate,
        // This will check storage limits and prepare file data
        resourceLimitMiddleware.checkFileUpload('workorder_attachment'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const fileData = (request as any).fileData; // From middleware

        // Save file to storage
        const fs = require('fs').promises;
        const path = require('path');

        const uploadDir = path.join(process.cwd(), 'uploads', user.tenantId, 'attachments');
        await fs.mkdir(uploadDir, { recursive: true });

        const filename = `${Date.now()}-${fileData.filename}`;
        const filePath = path.join(uploadDir, filename);

        await fs.writeFile(filePath, fileData.buffer);

        // Track storage usage - this will be handled automatically by trackResourceUsage
        await trackResourceUsage(user.tenantId, 'storage', 1, {
          filename,
          originalName: fileData.filename,
          mimeType: fileData.mimetype,
          size: fileData.size,
          category: 'workorder_attachment',
          filePath: filePath
        });

        return reply.send({
          success: true,
          message: 'File uploaded successfully',
          data: {
            filename,
            originalName: fileData.filename,
            size: fileData.size,
            url: `/uploads/${user.tenantId}/attachments/${filename}`
          }
        });

      } catch (error) {
        fastify.log.error({ error }, 'Error uploading file');
        return reply.status(500).send({
          success: false,
          message: 'Failed to upload file'
        });
      }
    }
  );
}

/**
 * Example: SMS sending with limit enforcement
 */
export async function exampleSmsRoute(fastify: FastifyInstance) {
  fastify.post(
    '/send-sms',
    {
      preHandler: [
        authenticate,
        // Check SMS limits
        resourceLimitMiddleware.checkSmsUsage(1),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { phoneNumber, message } = request.body as { phoneNumber: string; message: string };

        // Send SMS using your SMS service
        // const smsResult = await SmsService.sendSms(phoneNumber, message);

        // Track SMS usage AFTER successful sending
        await trackResourceUsage(user.tenantId, 'sms', 1);

        fastify.log.info({
          tenantId: user.tenantId,
          phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          messageLength: message.length
        }, 'SMS sent and usage tracked');

        return reply.send({
          success: true,
          message: 'SMS sent successfully',
        });

      } catch (error) {
        fastify.log.error({ error }, 'Error sending SMS');
        return reply.status(500).send({
          success: false,
          message: 'Failed to send SMS'
        });
      }
    }
  );
}

/**
 * Key Implementation Principles:
 *
 * 1. ALWAYS use middleware for limit checking BEFORE the operation
 * 2. ALWAYS track usage AFTER successful operations
 * 3. NEVER track usage if the operation fails
 * 4. Handle cleanup in case of failures (especially for file uploads)
 * 5. Log all resource usage for debugging and monitoring
 * 6. Use proper error messages that help users understand their limits
 * 7. For bulk operations, check limits manually before processing
 * 8. Always use the tenant from the middleware (it's already verified)
 */