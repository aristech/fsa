import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { Report, Task, Material, Client, WorkOrder, User } from "../models";
import { AuthenticatedRequest } from "../types";

export async function reportsRoutes(fastify: FastifyInstance) {
  // Get all reports with filtering and pagination
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user;
      const {
        page = 1,
        limit = 20,
        type,
        status,
        clientId,
        workOrderId,
        createdBy,
        dateFrom,
        dateTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = request.query as any;

      const query: any = { tenantId: user.tenantId };

      // Apply filters
      if (type) query.type = type;
      if (status) query.status = status;
      if (clientId) query.clientId = clientId;
      if (workOrderId) query.workOrderId = workOrderId;
      if (createdBy) query.createdBy = createdBy;

      if (dateFrom || dateTo) {
        query.reportDate = {};
        if (dateFrom) query.reportDate.$gte = new Date(dateFrom);
        if (dateTo) query.reportDate.$lte = new Date(dateTo);
      }

      if (search) {
        query.$text = { $search: search };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [reports, totalCount] = await Promise.all([
        Report.find(query)
          .populate('createdBy', 'name email')
          .populate('assignedTo', 'name email')
          .populate('clientId', 'name company')
          .populate('workOrderId', 'number title')
          .populate('approvedBy', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Report.countDocuments(query)
      ]);

      return reply.send({
        success: true,
        data: reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch reports');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Get single report by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;

      const report = await Report.findOne({ _id: id, tenantId: user.tenantId })
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('clientId', 'name company email phone')
        .populate('workOrderId', 'number title description')
        .populate('taskIds', 'name status priority')
        .populate('approvedBy', 'name email')
        .populate('reviewers', 'name email')
        .lean();

      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      return reply.send({ success: true, data: report });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Create new report
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user;
      const reportData = request.body as any;

      // Auto-populate fields
      reportData.tenantId = user.tenantId;
      reportData.createdBy = user.id;

      if (!reportData.assignedTo) {
        reportData.assignedTo = user.id;
      }

      // Set default report date to today if not provided
      if (!reportData.reportDate) {
        reportData.reportDate = new Date();
      }

      // Validate related entities exist
      if (reportData.clientId) {
        const client = await Client.findOne({ _id: reportData.clientId, tenantId: user.tenantId });
        if (!client) {
          return reply.code(400).send({ success: false, message: 'Client not found' });
        }
      }

      if (reportData.workOrderId) {
        const workOrder = await WorkOrder.findOne({ _id: reportData.workOrderId, tenantId: user.tenantId });
        if (!workOrder) {
          return reply.code(400).send({ success: false, message: 'Work order not found' });
        }
      }

      if (reportData.taskIds && reportData.taskIds.length > 0) {
        const tasks = await Task.find({ _id: { $in: reportData.taskIds }, tenantId: user.tenantId });
        if (tasks.length !== reportData.taskIds.length) {
          return reply.code(400).send({ success: false, message: 'One or more tasks not found' });
        }
      }

      const report = new Report(reportData);
      await report.save();

      // Populate the created report for response
      await report.populate('createdBy', 'name email');
      await report.populate('assignedTo', 'name email');
      await report.populate('clientId', 'name company');

      return reply.code(201).send({ success: true, data: report });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Update report
  fastify.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;
      const updateData = request.body as any;

      // Find report and verify access
      const report = await Report.findOne({ _id: id, tenantId: user.tenantId });
      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      // Check if user can edit this report
      const canEdit = report.createdBy.toString() === user.id ||
                     report.assignedTo?.toString() === user.id ||
                     user.role === 'admin';

      if (!canEdit) {
        return reply.code(403).send({ success: false, message: 'Not authorized to edit this report' });
      }

      // Prevent editing of approved reports (unless admin)
      if (report.status === 'approved' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Cannot edit approved reports' });
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'tenantId' && key !== 'createdBy' && key !== 'createdAt') {
          (report as any)[key] = updateData[key];
        }
      });

      await report.save();

      // Populate updated report for response
      await report.populate('createdBy', 'name email');
      await report.populate('assignedTo', 'name email');
      await report.populate('clientId', 'name company');

      return reply.send({ success: true, data: report });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Delete report
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;

      const report = await Report.findOne({ _id: id, tenantId: user.tenantId });
      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      // Check if user can delete this report
      const canDelete = report.createdBy.toString() === user.id || user.role === 'admin';
      if (!canDelete) {
        return reply.code(403).send({ success: false, message: 'Not authorized to delete this report' });
      }

      // Prevent deletion of approved reports (unless admin)
      if (report.status === 'approved' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Cannot delete approved reports' });
      }

      await Report.findByIdAndDelete(id);
      return reply.send({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to delete report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Submit report for approval
  fastify.post('/:id/submit', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;

      const report = await Report.findOne({ _id: id, tenantId: user.tenantId });
      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      if (report.status !== 'draft') {
        return reply.code(400).send({ success: false, message: 'Only draft reports can be submitted' });
      }

      // Check if user can submit this report
      const canSubmit = report.createdBy.toString() === user.id ||
                       report.assignedTo?.toString() === user.id;

      if (!canSubmit) {
        return reply.code(403).send({ success: false, message: 'Not authorized to submit this report' });
      }

      report.status = 'submitted';
      report.submittedAt = new Date();
      await report.save();

      return reply.send({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to submit report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Approve report
  fastify.post('/:id/approve', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;
      const { comments } = request.body as { comments?: string };

      const report = await Report.findOne({ _id: id, tenantId: user.tenantId });
      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      if (report.status !== 'submitted' && report.status !== 'under_review') {
        return reply.code(400).send({
          success: false,
          message: 'Only submitted or under review reports can be approved'
        });
      }

      report.status = 'approved';
      report.approvedAt = new Date();
      report.approvedBy = user.id;

      if (comments) {
        if (!report.clientApproval) {
          report.clientApproval = { approved: false };
        }
        report.clientApproval.comments = comments;
      }

      await report.save();

      return reply.send({ success: true, message: 'Report approved successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to approve report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Reject report
  fastify.post('/:id/reject', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;
      const { reason } = request.body as { reason: string };

      if (!reason) {
        return reply.code(400).send({ success: false, message: 'Rejection reason is required' });
      }

      const report = await Report.findOne({ _id: id, tenantId: user.tenantId });
      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      if (report.status !== 'submitted' && report.status !== 'under_review') {
        return reply.code(400).send({
          success: false,
          message: 'Only submitted or under review reports can be rejected'
        });
      }

      report.status = 'rejected';
      report.rejectedAt = new Date();
      report.rejectedBy = user.id;
      report.rejectionReason = reason;

      await report.save();

      return reply.send({ success: true, message: 'Report rejected successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to reject report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Add material usage to report
  fastify.post('/:id/materials', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;
      const { materialId, quantityUsed, notes } = request.body as {
        materialId: string;
        quantityUsed: number;
        notes?: string;
      };

      const report = await Report.findOne({ _id: id, tenantId: user.tenantId });
      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      const material = await Material.findOne({ _id: materialId, tenantId: user.tenantId });
      if (!material) {
        return reply.code(404).send({ success: false, message: 'Material not found' });
      }

      const materialUsage = {
        materialId,
        material: {
          name: material.name,
          sku: material.sku || '',
          unit: material.unit,
        },
        quantityUsed,
        unitCost: material.unitCost,
        totalCost: quantityUsed * material.unitCost,
        notes,
      };

      report.materialsUsed.push(materialUsage as any);
      await report.save();

      return reply.send({ success: true, data: materialUsage });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to add material to report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Add time entry to report
  fastify.post('/:id/time-entries', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).user;
      const { description, startTime, endTime, taskId, category } = request.body as {
        description: string;
        startTime: string;
        endTime: string;
        taskId?: string;
        category?: string;
      };

      const report = await Report.findOne({ _id: id, tenantId: user.tenantId });
      if (!report) {
        return reply.code(404).send({ success: false, message: 'Report not found' });
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes

      const timeEntry = {
        description,
        startTime: start,
        endTime: end,
        duration,
        taskId: taskId || undefined,
        category: category || 'labor',
      };

      report.timeEntries.push(timeEntry as any);
      await report.save();

      return reply.send({ success: true, data: timeEntry });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to add time entry to report');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Get reports dashboard stats
  fastify.get('/dashboard/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { period = '30' } = request.query as { period?: string };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(period));

      const query = {
        tenantId: user.tenantId,
        reportDate: { $gte: dateFrom }
      };

      const [
        totalReports,
        draftReports,
        submittedReports,
        approvedReports,
        rejectedReports,
        recentReports,
        reportsByType,
        reportsByStatus
      ] = await Promise.all([
        Report.countDocuments(query),
        Report.countDocuments({ ...query, status: 'draft' }),
        Report.countDocuments({ ...query, status: 'submitted' }),
        Report.countDocuments({ ...query, status: 'approved' }),
        Report.countDocuments({ ...query, status: 'rejected' }),
        Report.find(query)
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Report.aggregate([
          { $match: query },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Report.aggregate([
          { $match: query },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      ]);

      return reply.send({
        success: true,
        data: {
          summary: {
            total: totalReports,
            draft: draftReports,
            submitted: submittedReports,
            approved: approvedReports,
            rejected: rejectedReports,
          },
          recent: recentReports,
          byType: reportsByType,
          byStatus: reportsByStatus,
        }
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch dashboard stats');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}