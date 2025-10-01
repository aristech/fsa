/**
 * Enhanced Subscription Usage Examples
 *
 * This file demonstrates how to migrate from the old subscription system
 * to the new enhanced system with automatic usage tracking for both
 * creation and deletion.
 *
 * Key improvements:
 * 1. Environment-based configuration
 * 2. Automatic usage decrease on deletion
 * 3. Centralized tracking service
 * 4. Better error handling and logging
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Personnel, Client, WorkOrder, User } from "../models";
import EnhancedSubscriptionMiddleware, { updateUsageAfterAction } from "../middleware/enhanced-subscription-middleware";
import { CentralizedUsageService } from "../services/centralized-usage-service";
import { HttpErrorLogUtils } from "../utils/http-error-logger";

// ============== BEFORE (Old Way) ==============

import { subscriptionMiddleware, updateUsageAfterAction as oldUpdateUsage } from "../middleware/subscription-enforcement";

export function setupOldPersonnelRoutes(fastify: FastifyInstance) {
  // ❌ OLD WAY: Manual usage tracking, no deletion tracking

  // Create personnel - old way
  fastify.post("/personnel", {
    preHandler: [
      // ❌ Old middleware
      subscriptionMiddleware.checkUserLimit(1)
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenant = (request as any).tenant;
      const personnelData = request.body as any;

      // Create personnel
      const personnel = await Personnel.create({
        ...personnelData,
        tenantId: tenant._id
      });

      // ❌ Manual usage tracking after creation
      await oldUpdateUsage(tenant._id.toString(), 'create_user', 1);

      return reply.send({
        success: true,
        data: personnel
      });

    } catch (error: any) {
      console.error("Error creating personnel:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to create personnel"
      });
    }
  });

  // Delete personnel - old way
  fastify.delete("/personnel/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const tenant = (request as any).tenant;

      // Find and delete personnel
      const personnel = await Personnel.findOneAndDelete({
        _id: id,
        tenantId: tenant._id
      });

      if (!personnel) {
        return reply.status(404).send({
          success: false,
          message: "Personnel not found"
        });
      }

      // ❌ NO usage decrease tracking!
      // This is the main problem - usage never goes down

      return reply.send({
        success: true,
        message: "Personnel deleted successfully"
      });

    } catch (error: any) {
      console.error("Error deleting personnel:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to delete personnel"
      });
    }
  });
}

// ============== AFTER (New Enhanced Way) ==============

export function setupEnhancedPersonnelRoutes(fastify: FastifyInstance) {
  // ✅ NEW WAY: Centralized usage tracking with automatic increases and decreases

  // Create personnel - enhanced way
  fastify.post("/personnel", {
    preHandler: [
      // ✅ Enhanced middleware with better error handling
      EnhancedSubscriptionMiddleware.checkUserLimit(1)
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id || HttpErrorLogUtils.generateRequestId();

    try {
      const tenant = (request as any).tenant;
      const personnelData = request.body as any;

      // Create personnel
      const personnel = await Personnel.create({
        ...personnelData,
        tenantId: tenant._id
      });

      // ✅ Centralized usage tracking with detailed metadata
      await EnhancedSubscriptionMiddleware.trackCreation(
        tenant._id.toString(),
        'user', // Personnel creates user usage
        1,
        {
          entityId: personnel._id.toString(),
          personnelName: personnelData.name,
          userEmail: personnelData.email
        },
        requestId
      );

      return reply.send({
        success: true,
        data: personnel,
        message: "Personnel created successfully"
      });

    } catch (error: any) {
      // Enhanced error logging
      HttpErrorLogUtils.log500Error(
        {
          requestId,
          entity: 'personnel',
          service: 'PersonnelService',
          operation: 'create'
        },
        error,
        "Failed to create personnel"
      );

      return reply.status(500).send({
        success: false,
        message: "Failed to create personnel",
        messageKey: "personnel.creation.failed"
      });
    }
  });

  // Delete personnel - enhanced way
  fastify.delete("/personnel/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id || HttpErrorLogUtils.generateRequestId();

    try {
      const { id } = request.params as { id: string };
      const tenant = (request as any).tenant;

      // Find personnel first to get details for usage tracking
      const personnel = await Personnel.findOne({
        _id: id,
        tenantId: tenant._id
      }).populate('userId', 'email name');

      if (!personnel) {
        HttpErrorLogUtils.log404Error(
          {
            requestId,
            entityId: id,
            entity: 'personnel',
            service: 'PersonnelService',
            operation: 'find'
          },
          "Personnel not found"
        );

        return reply.status(404).send({
          success: false,
          message: "Personnel not found",
          messageKey: "personnel.not_found"
        });
      }

      // Delete personnel
      await Personnel.deleteOne({ _id: id, tenantId: tenant._id });

      // ✅ AUTOMATIC usage decrease tracking!
      await EnhancedSubscriptionMiddleware.trackDeletion(
        tenant._id.toString(),
        'user', // Reduce user usage
        1,
        {
          entityId: personnel._id.toString(),
          personnelName: (personnel as any).userId?.name,
          userEmail: (personnel as any).userId?.email
        },
        requestId
      );

      console.log(`📉 Personnel deleted: ${id}, user usage decreased by 1`);

      return reply.send({
        success: true,
        message: "Personnel deleted successfully",
        messageKey: "personnel.deleted.success"
      });

    } catch (error: any) {
      HttpErrorLogUtils.log500Error(
        {
          requestId,
          entity: 'personnel',
          service: 'PersonnelService',
          operation: 'delete'
        },
        error,
        "Failed to delete personnel"
      );

      return reply.status(500).send({
        success: false,
        message: "Failed to delete personnel",
        messageKey: "personnel.deletion.failed"
      });
    }
  });
}

// ============== Client Example ==============

export function setupEnhancedClientRoutes(fastify: FastifyInstance) {
  // Create client
  fastify.post("/clients", {
    preHandler: [EnhancedSubscriptionMiddleware.checkClientLimit(1)]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id;
    const tenant = (request as any).tenant;

    try {
      const clientData = request.body as any;

      const client = await Client.create({
        ...clientData,
        tenantId: tenant._id
      });

      // Track creation
      await EnhancedSubscriptionMiddleware.trackCreation(
        tenant._id.toString(),
        'client',
        1,
        { entityId: client._id.toString(), clientName: clientData.name },
        requestId
      );

      return reply.send({ success: true, data: client });

    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to create client" });
    }
  });

  // Delete client
  fastify.delete("/clients/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id;
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };

    try {
      const client = await Client.findOne({ _id: id, tenantId: tenant._id });
      if (!client) {
        return reply.status(404).send({ success: false, message: "Client not found" });
      }

      await Client.deleteOne({ _id: id, tenantId: tenant._id });

      // ✅ Track deletion - automatically decreases usage
      await EnhancedSubscriptionMiddleware.trackDeletion(
        tenant._id.toString(),
        'client',
        1,
        { entityId: client._id.toString(), clientName: client.name },
        requestId
      );

      return reply.send({ success: true, message: "Client deleted successfully" });

    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to delete client" });
    }
  });
}

// ============== Work Order Example ==============

export function setupEnhancedWorkOrderRoutes(fastify: FastifyInstance) {
  // Create work order
  fastify.post("/work-orders", {
    preHandler: [EnhancedSubscriptionMiddleware.checkWorkOrderLimit(1)]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id;
    const tenant = (request as any).tenant;

    try {
      const workOrderData = request.body as any;

      const workOrder = await WorkOrder.create({
        ...workOrderData,
        tenantId: tenant._id
      });

      // Track creation
      await EnhancedSubscriptionMiddleware.trackCreation(
        tenant._id.toString(),
        'workOrder',
        1,
        {
          entityId: workOrder._id.toString(),
          title: workOrderData.title,
          clientId: workOrderData.clientId
        },
        requestId
      );

      return reply.send({ success: true, data: workOrder });

    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to create work order" });
    }
  });

  // Delete work order
  fastify.delete("/work-orders/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id;
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };

    try {
      const workOrder = await WorkOrder.findOne({ _id: id, tenantId: tenant._id });
      if (!workOrder) {
        return reply.status(404).send({ success: false, message: "Work order not found" });
      }

      await WorkOrder.deleteOne({ _id: id, tenantId: tenant._id });

      // ✅ Track deletion - monthly usage decreases
      // Note: Work orders are monthly limits, so this actually reduces the current month's usage
      await EnhancedSubscriptionMiddleware.trackDeletion(
        tenant._id.toString(),
        'workOrder',
        1,
        {
          entityId: workOrder._id.toString(),
          title: workOrder.title,
          clientId: workOrder.clientId
        },
        requestId
      );

      return reply.send({ success: true, message: "Work order deleted successfully" });

    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to delete work order" });
    }
  });
}

// ============== File Upload/Delete Example ==============

export function setupEnhancedFileRoutes(fastify: FastifyInstance) {
  // Upload file
  fastify.post("/files/upload", async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id;
    const tenant = (request as any).tenant;

    try {
      // Assuming file processing here...
      const file = { size: 1048576, name: 'document.pdf', type: 'pdf' }; // 1MB example

      // Check file size limit before upload
      const fileSizeBytes = file.size;
      const limitCheck = await EnhancedSubscriptionMiddleware.checkFileLimit(fileSizeBytes);

      // Process and save file...

      // Track file upload
      await EnhancedSubscriptionMiddleware.trackCreation(
        tenant._id.toString(),
        'file',
        1,
        {
          fileSizeBytes,
          fileName: file.name,
          fileType: file.type
        },
        requestId
      );

      return reply.send({
        success: true,
        message: "File uploaded successfully",
        data: { fileName: file.name, size: file.size }
      });

    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to upload file" });
    }
  });

  // Delete file
  fastify.delete("/files/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id;
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };

    try {
      // Find file details before deletion
      const fileRecord = { _id: id, size: 1048576, name: 'document.pdf' }; // Example

      // Delete file from storage and database...

      // ✅ Track file deletion - decreases storage usage
      await EnhancedSubscriptionMiddleware.trackDeletion(
        tenant._id.toString(),
        'file',
        1,
        {
          fileSizeBytes: fileRecord.size,
          fileName: fileRecord.name
        },
        requestId
      );

      return reply.send({
        success: true,
        message: "File deleted successfully"
      });

    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to delete file" });
    }
  });
}

// ============== Usage Monitoring ==============

export function setupUsageMonitoringRoutes(fastify: FastifyInstance) {
  // Get current usage
  fastify.get("/usage/current", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).user?.tenantId;
      const usage = await CentralizedUsageService.getCurrentUsage(tenantId);

      return reply.send({
        success: true,
        data: usage
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to get usage" });
    }
  });

  // Get usage comparison (usage vs limits)
  fastify.get("/usage/comparison", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).user?.tenantId;
      const comparison = await CentralizedUsageService.getUsageComparison(tenantId);

      return reply.send({
        success: true,
        data: comparison
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to get usage comparison" });
    }
  });

  // Get usage alerts
  fastify.get("/usage/alerts", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).user?.tenantId;
      const alerts = await CentralizedUsageService.checkUsageAlerts(tenantId);

      return reply.send({
        success: true,
        data: alerts
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: "Failed to get usage alerts" });
    }
  });
}

// ============== Migration Notes ==============

/*
MIGRATION CHECKLIST:

✅ Replace old middleware:
   Before: subscriptionMiddleware.checkUserLimit(1)
   After:  EnhancedSubscriptionMiddleware.checkUserLimit(1)

✅ Add deletion tracking:
   Before: Only tracked creation
   After:  Track both creation AND deletion

✅ Replace updateUsageAfterAction:
   Before: await oldUpdateUsage(tenantId, 'create_user', 1);
   After:  await EnhancedSubscriptionMiddleware.trackCreation(tenantId, 'user', 1, metadata, requestId);

✅ Add deletion tracking:
   New:    await EnhancedSubscriptionMiddleware.trackDeletion(tenantId, 'user', 1, metadata, requestId);

✅ Enhanced error handling:
   Before: console.error and generic responses
   After:  HttpErrorLogUtils with structured logging

✅ Environment-based limits:
   Before: Hardcoded in subscription-plans-service.ts
   After:  Loaded from environment variables

BENEFITS:

✅ Usage correctly decreases when entities are deleted
✅ Single source of truth for limits (environment variables)
✅ Centralized usage tracking with detailed metadata
✅ Better error handling and logging
✅ Consistent API across all entity types
✅ Automatic usage alerts and monitoring
✅ Easy to test and maintain
*/