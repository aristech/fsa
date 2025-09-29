import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission-guard';
import { UsageMonitoringService } from '../services/usage-monitoring-service';
import { FileTrackingService } from '../services/file-tracking-service';
import { sendSuccess, sendError, sendNotFound } from '../utils/error-handler';
import { SUCCESS_MESSAGES, SERVER_MESSAGES, BUSINESS_MESSAGES, NOT_FOUND_MESSAGES } from '../constants/error-messages';

// ----------------------------------------------------------------------

export async function usageMonitoringRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/usage/current - Get current tenant usage statistics
  fastify.get(
    '/current',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId;

        if (!tenantId) {
          return sendError(
            reply,
            400,
            BUSINESS_MESSAGES.INVALID_TENANT,
            'Tenant information not found'
          );
        }

        const usageReport = await UsageMonitoringService.getTenantUsageReport(tenantId);

        if (!usageReport) {
          return sendNotFound(
            reply,
            NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
            'Tenant not found'
          );
        }

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.FETCHED,
          'Usage statistics retrieved successfully',
          usageReport
        );
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching usage statistics');
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          'Failed to fetch usage statistics'
        );
      }
    }
  );

  // GET /api/v1/usage/alerts - Get current usage alerts
  fastify.get(
    '/alerts',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId;

        if (!tenantId) {
          return sendError(
            reply,
            400,
            BUSINESS_MESSAGES.INVALID_TENANT,
            'Tenant information not found'
          );
        }

        const notificationCheck = await UsageMonitoringService.shouldNotifyTenant(tenantId);

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.FETCHED,
          'Usage alerts retrieved successfully',
          notificationCheck
        );
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching usage alerts');
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          'Failed to fetch usage alerts'
        );
      }
    }
  );

  // GET /api/v1/usage/upgrade-recommendations - Get upgrade recommendations
  fastify.get(
    '/upgrade-recommendations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId;

        if (!tenantId) {
          return sendError(
            reply,
            400,
            BUSINESS_MESSAGES.INVALID_TENANT,
            'Tenant information not found'
          );
        }

        const recommendations = await UsageMonitoringService.getUpgradeRecommendations(tenantId);

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.FETCHED,
          'Upgrade recommendations retrieved successfully',
          recommendations
        );
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching upgrade recommendations');
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          'Failed to fetch upgrade recommendations'
        );
      }
    }
  );

  // GET /api/v1/usage/file-stats - Get file storage statistics
  fastify.get(
    '/file-stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId;

        if (!tenantId) {
          return sendError(
            reply,
            400,
            BUSINESS_MESSAGES.INVALID_TENANT,
            'Tenant information not found'
          );
        }

        const fileStats = await FileTrackingService.getUsageStats(tenantId);

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.FETCHED,
          'File statistics retrieved successfully',
          fileStats
        );
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching file statistics');
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          'Failed to fetch file statistics'
        );
      }
    }
  );

  // POST /api/v1/usage/recalculate - Recalculate tenant usage (admin only)
  fastify.post(
    '/recalculate',
    {
      preHandler: requirePermission('admin.usage.manage'),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId;

        if (!tenantId) {
          return sendError(
            reply,
            400,
            BUSINESS_MESSAGES.INVALID_TENANT,
            'Tenant information not found'
          );
        }

        await FileTrackingService.recalculateUsage(tenantId);

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.UPDATED,
          'Usage recalculated successfully'
        );
      } catch (error) {
        fastify.log.error({ error }, 'Error recalculating usage');
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          'Failed to recalculate usage'
        );
      }
    }
  );

  // POST /api/v1/usage/cleanup-files - Clean up orphaned files (admin only)
  fastify.post(
    '/cleanup-files',
    {
      preHandler: requirePermission('admin.files.manage'),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId;

        if (!tenantId) {
          return sendError(
            reply,
            400,
            BUSINESS_MESSAGES.INVALID_TENANT,
            'Tenant information not found'
          );
        }

        const cleanupResult = await FileTrackingService.cleanupOrphanedFiles(tenantId);

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.UPDATED,
          'File cleanup completed successfully',
          cleanupResult
        );
      } catch (error) {
        fastify.log.error({ error }, 'Error cleaning up files');
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          'Failed to cleanup files'
        );
      }
    }
  );

  // Admin routes for monitoring all tenants
  fastify.register(async function adminRoutes(fastify) {
    // GET /api/v1/usage/admin/all-tenants - Get usage for all tenants (super admin only)
    fastify.get(
      '/admin/all-tenants',
      {
        preHandler: requirePermission('superadmin.usage.view'),
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { severity } = request.query as { severity?: 'warning' | 'critical' | 'limit_reached' };

          let tenantReports;
          if (severity) {
            tenantReports = await UsageMonitoringService.getTenantsWithAlerts(severity);
          } else {
            tenantReports = await UsageMonitoringService.getAllTenantsUsageReport();
          }

          return sendSuccess(
            reply,
            200,
            SUCCESS_MESSAGES.FETCHED,
            'All tenant usage statistics retrieved successfully',
            {
              tenants: tenantReports,
              summary: {
                total: tenantReports.length,
                withAlerts: tenantReports.filter(t => t.alerts.length > 0).length,
                overLimit: tenantReports.filter(t => t.isOverLimit).length,
              }
            }
          );
        } catch (error) {
          fastify.log.error({ error }, 'Error fetching all tenant usage');
          return sendError(
            reply,
            500,
            SERVER_MESSAGES.INTERNAL_ERROR,
            'Failed to fetch all tenant usage statistics'
          );
        }
      }
    );

    // POST /api/v1/usage/admin/reset-monthly - Reset monthly usage for all tenants (super admin only)
    fastify.post(
      '/admin/reset-monthly',
      {
        preHandler: requirePermission('superadmin.usage.manage'),
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const resetResult = await UsageMonitoringService.resetMonthlyUsage();

          return sendSuccess(
            reply,
            200,
            SUCCESS_MESSAGES.UPDATED,
            'Monthly usage reset completed successfully',
            resetResult
          );
        } catch (error) {
          fastify.log.error({ error }, 'Error resetting monthly usage');
          return sendError(
            reply,
            500,
            SERVER_MESSAGES.INTERNAL_ERROR,
            'Failed to reset monthly usage'
          );
        }
      }
    );
  });
}