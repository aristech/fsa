import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';

import { withAuth } from 'src/lib/auth/middleware';
import { Task, Project, Customer, WorkOrder, Assignment, Technician } from 'src/lib/models';

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '30'; // days
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

      // Fetch all data for analytics
      const [workOrders, assignments, projects, tasks, customers, technicians] = await Promise.all([
        WorkOrder.find({ tenantId }).populate('customerId', 'name'),
        Assignment.find({ tenantId }).populate('technicianId', 'name'),
        Project.find({ tenantId }).populate('customerId', 'name'),
        Task.find({ tenantId }).populate('assignedTo', 'name'),
        Customer.find({ tenantId }),
        Technician.find({ tenantId }),
      ]);

      // Work Order Analytics
      const workOrderStats = {
        total: workOrders.length,
        byStatus: {
          pending: workOrders.filter((wo) => wo.status === 'pending').length,
          scheduled: workOrders.filter((wo) => wo.status === 'scheduled').length,
          inProgress: workOrders.filter((wo) => wo.status === 'in-progress').length,
          completed: workOrders.filter((wo) => wo.status === 'completed').length,
          cancelled: workOrders.filter((wo) => wo.status === 'cancelled').length,
        },
        byPriority: {
          low: workOrders.filter((wo) => wo.priority === 'low').length,
          medium: workOrders.filter((wo) => wo.priority === 'medium').length,
          high: workOrders.filter((wo) => wo.priority === 'high').length,
          urgent: workOrders.filter((wo) => wo.priority === 'urgent').length,
        },
        byCategory: workOrders.reduce(
          (acc, wo) => {
            acc[wo.category] = (acc[wo.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        recent: workOrders.filter((wo) => wo.createdAt >= startDate).length,
      };

      // Project Analytics
      const projectStats = {
        total: projects.length,
        byStatus: {
          planning: projects.filter((p) => p.status === 'planning').length,
          active: projects.filter((p) => p.status === 'active').length,
          onHold: projects.filter((p) => p.status === 'on-hold').length,
          completed: projects.filter((p) => p.status === 'completed').length,
          cancelled: projects.filter((p) => p.status === 'cancelled').length,
        },
        byPriority: {
          low: projects.filter((p) => p.priority === 'low').length,
          medium: projects.filter((p) => p.priority === 'medium').length,
          high: projects.filter((p) => p.priority === 'high').length,
          urgent: projects.filter((p) => p.priority === 'urgent').length,
        },
        totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
        totalActualCost: projects.reduce((sum, p) => sum + (p.actualCost || 0), 0),
        averageProgress:
          projects.length > 0
            ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
            : 0,
      };

      // Task Analytics
      const taskStats = {
        total: tasks.length,
        byStatus: {
          todo: tasks.filter((t) => t.status === 'todo').length,
          inProgress: tasks.filter((t) => t.status === 'in-progress').length,
          review: tasks.filter((t) => t.status === 'review').length,
          done: tasks.filter((t) => t.status === 'done').length,
        },
        byPriority: {
          low: tasks.filter((t) => t.priority === 'low').length,
          medium: tasks.filter((t) => t.priority === 'medium').length,
          high: tasks.filter((t) => t.priority === 'high').length,
          urgent: tasks.filter((t) => t.priority === 'urgent').length,
        },
        totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
        totalActualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
        overdue: tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== 'done')
          .length,
      };

      // Technician Analytics
      const technicianStats = {
        total: technicians.length,
        byAvailability: {
          available: technicians.filter((t) => t.availability === 'available').length,
          busy: technicians.filter((t) => t.availability === 'busy').length,
          offline: technicians.filter((t) => t.availability === 'offline').length,
        },
        bySkills: technicians.reduce(
          (acc, t) => {
            t.skills.forEach((skill) => {
              acc[skill] = (acc[skill] || 0) + 1;
            });
            return acc;
          },
          {} as Record<string, number>
        ),
        averageHourlyRate:
          technicians.length > 0
            ? technicians.reduce((sum, t) => sum + (t.hourlyRate || 0), 0) / technicians.length
            : 0,
      };

      // Customer Analytics
      const customerStats = {
        total: customers.length,
        withActiveProjects: projects
          .filter((p) => p.status === 'active')
          .map((p) => p.customerId)
          .filter((v, i, a) => a.indexOf(v) === i).length,
        withWorkOrders: workOrders
          .map((wo) => wo.customerId)
          .filter((v, i, a) => a.indexOf(v) === i).length,
      };

      // Assignment Analytics
      const assignmentStats = {
        total: assignments.length,
        byStatus: {
          assigned: assignments.filter((a) => a.status === 'assigned').length,
          accepted: assignments.filter((a) => a.status === 'accepted').length,
          inProgress: assignments.filter((a) => a.status === 'in-progress').length,
          completed: assignments.filter((a) => a.status === 'completed').length,
          rejected: assignments.filter((a) => a.status === 'rejected').length,
        },
        totalEstimatedHours: assignments.reduce((sum, a) => sum + (a.estimatedHours || 0), 0),
        totalActualHours: assignments.reduce((sum, a) => sum + (a.actualHours || 0), 0),
        averageRating:
          assignments.filter((a) => a.rating).length > 0
            ? assignments.filter((a) => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) /
              assignments.filter((a) => a.rating).length
            : 0,
      };

      // Performance Metrics
      const performanceMetrics = {
        workOrderCompletionRate:
          workOrders.length > 0 ? (workOrderStats.byStatus.completed / workOrders.length) * 100 : 0,
        projectCompletionRate:
          projects.length > 0 ? (projectStats.byStatus.completed / projects.length) * 100 : 0,
        taskCompletionRate: tasks.length > 0 ? (taskStats.byStatus.done / tasks.length) * 100 : 0,
        assignmentCompletionRate:
          assignments.length > 0
            ? (assignmentStats.byStatus.completed / assignments.length) * 100
            : 0,
        onTimeDelivery:
          (assignments.filter(
            (a) =>
              a.status === 'completed' &&
              a.actualEndDate &&
              a.scheduledEndDate &&
              a.actualEndDate <= a.scheduledEndDate
          ).length /
            Math.max(assignmentStats.byStatus.completed, 1)) *
          100,
      };

      // Revenue Analytics
      const revenueStats = {
        totalProjectBudget: projectStats.totalBudget,
        totalActualCost: projectStats.totalActualCost,
        totalTechnicianCost: assignments.reduce((sum, a) => {
          const technician = technicians.find(
            (t) => t._id.toString() === a.technicianId.toString()
          );
          return sum + (a.actualHours || 0) * (technician?.hourlyRate || 0);
        }, 0),
        profitMargin:
          projectStats.totalBudget > 0
            ? ((projectStats.totalBudget - projectStats.totalActualCost) /
                projectStats.totalBudget) *
              100
            : 0,
      };

      // Time-based Analytics (last 30 days)
      const timeBasedStats = {
        workOrdersCreated: workOrders.filter((wo) => wo.createdAt >= startDate).length,
        projectsStarted: projects.filter((p) => p.startDate && p.startDate >= startDate).length,
        tasksCompleted: tasks.filter((t) => t.updatedAt >= startDate && t.status === 'done').length,
        assignmentsCompleted: assignments.filter(
          (a) => a.actualEndDate && a.actualEndDate >= startDate
        ).length,
      };

      const analyticsData = {
        workOrders: workOrderStats,
        projects: projectStats,
        tasks: taskStats,
        technicians: technicianStats,
        customers: customerStats,
        assignments: assignmentStats,
        performance: performanceMetrics,
        revenue: revenueStats,
        timeBased: timeBasedStats,
        period: {
          start: startDate,
          end: endDate,
          days: parseInt(period),
        },
      };

      return NextResponse.json(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return NextResponse.json({ message: 'Failed to fetch analytics data' }, { status: 500 });
    }
  });
}
