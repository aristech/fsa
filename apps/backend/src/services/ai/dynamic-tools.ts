import { z } from "zod";
import type { ToolDef } from "../../types/ai";
import { PermissionService } from "../permission-service";
import { AuthenticatedRequest } from "../../types";
import { DataValidationService } from "./data-validation";
import {
  generateValidationTool,
  generateDataLookupTool,
  generateAutocompleteTool,
} from "./validation-tools";
import { generateLocalTaskTool } from "./local-task-tool";

// Import all models
import {
  WorkOrder,
  Personnel,
  Task,
  Status,
  Project,
  Technician,
  User,
  Client,
  Report,
  TimeEntry,
  Assignment,
  Role,
  Tenant,
  Notification,
  Comment,
  Material,
  TaskMaterial,
} from "../../models";

// ----------------------------------------------------------------------
// Model Registry
// ----------------------------------------------------------------------

interface ModelConfig {
  name: string;
  displayName: string;
  model: any;
  permissions: {
    list: string;
    view: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  searchFields: string[];
  populateFields?: Record<string, string>;
  adminBypass?: boolean;
}

const MODEL_REGISTRY: ModelConfig[] = [
  {
    name: "workOrders",
    displayName: "Work Orders",
    model: WorkOrder,
    permissions: {
      list: "workOrders.view",
      view: "workOrders.view",
      create: "workOrders.create",
      update: "workOrders.update",
      delete: "workOrders.delete",
    },
    searchFields: ["title", "workOrderNumber", "status", "priority"],
    populateFields: {
      clientId: "name company",
      personnelIds: "employeeId userId",
    },
    adminBypass: true,
  },
  {
    name: "tasks",
    displayName: "Tasks",
    model: Task,
    permissions: {
      list: "tasks.view",
      view: "tasks.view",
      create: "tasks.create",
      update: "tasks.update",
      delete: "tasks.delete",
    },
    searchFields: ["title", "description", "status", "priority"],
    populateFields: {
      projectId: "title",
      clientId: "name company",
      assignees: "employeeId userId",
      createdBy: "email firstName lastName",
    },
    adminBypass: true,
  },
  {
    name: "projects",
    displayName: "Projects",
    model: Project,
    permissions: {
      list: "projects.view",
      view: "projects.view",
      create: "projects.create",
      update: "projects.update",
      delete: "projects.delete",
    },
    searchFields: ["title", "description", "status"],
    populateFields: {
      clientId: "name company",
      createdBy: "email firstName lastName",
    },
    adminBypass: true,
  },
  {
    name: "personnel",
    displayName: "Personnel",
    model: Personnel,
    permissions: {
      list: "personnel.view",
      view: "personnel.view",
      create: "personnel.create",
      update: "personnel.update",
      delete: "personnel.delete",
    },
    searchFields: ["employeeId", "skills", "status"],
    populateFields: {
      userId: "email firstName lastName",
      roleId: "name",
    },
    adminBypass: true,
  },
  {
    name: "clients",
    displayName: "Clients",
    model: Client,
    permissions: {
      list: "clients.view",
      view: "clients.view",
      create: "clients.create",
      update: "clients.update",
      delete: "clients.delete",
    },
    searchFields: ["name", "company", "email"],
    adminBypass: true,
  },
  {
    name: "reports",
    displayName: "Reports",
    model: Report,
    permissions: {
      list: "reports.view",
      view: "reports.view",
      create: "reports.create",
      update: "reports.update",
      delete: "reports.delete",
    },
    searchFields: ["title", "type", "status"],
    populateFields: {
      createdBy: "email firstName lastName",
      clientId: "name company",
    },
    adminBypass: true,
  },
  {
    name: "timeEntries",
    displayName: "Time Entries",
    model: TimeEntry,
    permissions: {
      list: "timeEntries.view",
      view: "timeEntries.view",
      create: "timeEntries.create",
      update: "timeEntries.update",
      delete: "timeEntries.delete",
    },
    searchFields: ["description", "status"],
    populateFields: {
      userId: "email firstName lastName",
      workOrderId: "title workOrderNumber",
      taskId: "title",
    },
    adminBypass: true,
  },
  {
    name: "materials",
    displayName: "Materials",
    model: Material,
    permissions: {
      list: "materials.view",
      view: "materials.view",
      create: "materials.create",
      update: "materials.update",
      delete: "materials.delete",
    },
    searchFields: ["name", "description", "category"],
    adminBypass: true,
  },
];

// ----------------------------------------------------------------------
// Dynamic Tool Generation
// ----------------------------------------------------------------------

function generateListTool(config: ModelConfig): ToolDef {
  return {
    name: `list_${config.name}`,
    description: `List ${config.displayName.toLowerCase()}`,
    schema: z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
      search: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
      // Dynamic filters based on model fields
      ...generateDynamicFilters(config),
    }),
    handler: async (args, ctx) => {
      try {
        // Parse and validate arguments
        const parsedArgs = args as any;

        // Check permissions - try database first, then fallback to JWT
        let userPermissions = await PermissionService.getUserPermissions(
          ctx.userId,
          ctx.tenantId,
        );

        // If database permissions fail, try to get user from JWT context
        if (!userPermissions) {
          console.log(
            `[AI Tool] ${config.displayName} - Database permissions failed, checking JWT context`,
          );
          // We need to get the user info from the request context
          // This is a fallback for when the database lookup fails
          throw new Error("Unable to retrieve user permissions from database");
        }

        const isAdminOrOwner =
          userPermissions.permissions.includes("*") ||
          userPermissions.role === "superuser" ||
          userPermissions.role === "admin";

        console.log(`[AI Tool] ${config.displayName} permission check:`, {
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          userPermissions: userPermissions.permissions,
          userRole: userPermissions.role,
          isAdminOrOwner,
          configName: config.name,
        });

        if (!isAdminOrOwner) {
          const hasPermission = await PermissionService.hasPermissionAsync(
            ctx.userId,
            config.permissions.list,
            ctx.tenantId,
          );
          console.log(
            `[AI Tool] ${config.displayName} permission check result:`,
            {
              permission: config.permissions.list,
              hasPermission: hasPermission.hasPermission,
              reason: hasPermission.reason,
            },
          );
          if (!hasPermission.hasPermission) {
            throw new Error(
              `Insufficient permissions to view ${config.displayName.toLowerCase()}`,
            );
          }
        }

        // Build query
        const query: any = { tenantId: ctx.tenantId };

        // Apply search
        if (parsedArgs.search) {
          const searchRegex = new RegExp(parsedArgs.search, "i");
          query.$or = config.searchFields.map((field) => ({
            [field]: searchRegex,
          }));
        }

        // Apply dynamic filters
        Object.keys(parsedArgs).forEach((key) => {
          if (
            key !== "limit" &&
            key !== "offset" &&
            key !== "search" &&
            key !== "sortBy" &&
            key !== "sortOrder" &&
            parsedArgs[key] !== undefined
          ) {
            query[key] = parsedArgs[key];
          }
        });

        console.log(`[AI Tool] ${config.displayName} query:`, query);

        // Build sort
        const sort: any = {};
        if (parsedArgs.sortBy) {
          sort[parsedArgs.sortBy] = parsedArgs.sortOrder === "asc" ? 1 : -1;
        } else {
          sort.createdAt = -1; // Default sort by creation date
        }

        // Execute query
        let queryBuilder = config.model.find(query).sort(sort);

        // Apply populate fields
        if (config.populateFields) {
          Object.entries(config.populateFields).forEach(([field, select]) => {
            queryBuilder = queryBuilder.populate(field, select);
          });
        }

        const results = await queryBuilder
          .skip(parsedArgs.offset)
          .limit(parsedArgs.limit)
          .lean();

        const total = await config.model.countDocuments(query);

        console.log(`[AI Tool] ${config.displayName} found:`, {
          count: results.length,
          total,
        });

        return {
          content: JSON.stringify({
            [config.name]: results,
            total,
            limit: parsedArgs.limit,
            offset: parsedArgs.offset,
          }),
        };
      } catch (error: any) {
        console.error(`[AI Tool] ${config.displayName} error:`, error);
        throw new Error(
          `Failed to fetch ${config.displayName.toLowerCase()}: ${error.message}`,
        );
      }
    },
  };
}

function generateGetTool(config: ModelConfig): ToolDef {
  return {
    name: `get_${config.name.slice(0, -1)}`, // Remove 's' from plural
    description: `Get ${config.displayName.slice(0, -1).toLowerCase()} by ID`,
    schema: z.object({
      id: z.string(),
    }),
    handler: async (args, ctx) => {
      try {
        // Parse and validate arguments
        const parsedArgs = args as any;

        // Check permissions
        const userPermissions = await PermissionService.getUserPermissions(
          ctx.userId,
          ctx.tenantId,
        );
        if (!userPermissions) {
          throw new Error("Unable to retrieve user permissions");
        }

        const isAdminOrOwner =
          userPermissions.permissions.includes("*") ||
          userPermissions.role === "superuser" ||
          userPermissions.role === "admin";

        if (!isAdminOrOwner) {
          const hasPermission = await PermissionService.hasPermissionAsync(
            ctx.userId,
            config.permissions.view,
            ctx.tenantId,
          );
          if (!hasPermission.hasPermission) {
            throw new Error(
              `Insufficient permissions to view ${config.displayName.toLowerCase()}`,
            );
          }
        }

        // Build query
        let queryBuilder = config.model.findOne({
          _id: parsedArgs.id,
          tenantId: ctx.tenantId,
        });

        // Apply populate fields
        if (config.populateFields) {
          Object.entries(config.populateFields).forEach(([field, select]) => {
            queryBuilder = queryBuilder.populate(field, select);
          });
        }

        const result = await queryBuilder.lean();

        if (!result) {
          throw new Error(`${config.displayName.slice(0, -1)} not found`);
        }

        console.log(`[AI Tool] ${config.displayName.slice(0, -1)} found:`, {
          id: parsedArgs.id,
        });

        return {
          content: JSON.stringify(result),
        };
      } catch (error: any) {
        console.error(`[AI Tool] ${config.displayName} error:`, error);
        throw new Error(
          `Failed to fetch ${config.displayName.slice(0, -1).toLowerCase()}: ${error.message}`,
        );
      }
    },
  };
}

function generateDynamicFilters(
  config: ModelConfig,
): Record<string, z.ZodTypeAny> {
  // This would be enhanced to dynamically generate filters based on model schema
  // For now, return common filters
  return {
    status: z.string().optional(),
    priority: z.string().optional(),
    isActive: z.boolean().optional(),
  };
}

// ----------------------------------------------------------------------
// Tool Registry Generation
// ----------------------------------------------------------------------

export function generateDynamicTools(): ToolDef[] {
  const tools: ToolDef[] = [];

  // Only generate tools for essential models to reduce token usage
  const essentialModels = MODEL_REGISTRY.filter((config) =>
    ["workOrders", "personnel", "tasks", "projects", "clients"].includes(
      config.name,
    ),
  );

  essentialModels.forEach((config) => {
    // List tool
    tools.push(generateListTool(config));

    // Get single item tool
    tools.push(generateGetTool(config));
  });

  // Add special tools
  tools.push(generateKanbanTool());
  tools.push(generateAnalyticsTool());

  // Add local NLP task tool (preferred for simple operations)
  tools.push(generateLocalTaskTool());

  // Add OpenAI-based task tools (fallback for complex operations)
  tools.push(generateCreateTaskTool());
  tools.push(generateUpdateTaskTool());

  // Add validation tools
  tools.push(generateValidationTool());
  tools.push(generateDataLookupTool());
  tools.push(generateAutocompleteTool());

  return tools;
}

// ----------------------------------------------------------------------
// Special Tools
// ----------------------------------------------------------------------

function generateKanbanTool(): ToolDef {
  return {
    name: "get_kanban",
    description:
      "Get the kanban board view with tasks and projects organized by status columns.",
    schema: z.object({
      clientId: z.string().optional(),
    }),
    handler: async (args, ctx) => {
      try {
        // Parse and validate arguments
        const parsedArgs = args as any;

        // Check permissions
        const userPermissions = await PermissionService.getUserPermissions(
          ctx.userId,
          ctx.tenantId,
        );
        if (!userPermissions) {
          throw new Error("Unable to retrieve user permissions");
        }

        const isAdminOrOwner =
          userPermissions.permissions.includes("*") ||
          userPermissions.role === "superuser" ||
          userPermissions.role === "admin";

        if (!isAdminOrOwner) {
          const hasTaskPermission = await PermissionService.hasPermissionAsync(
            ctx.userId,
            "tasks.view",
            ctx.tenantId,
          );
          const hasProjectPermission =
            await PermissionService.hasPermissionAsync(
              ctx.userId,
              "projects.view",
              ctx.tenantId,
            );
          if (
            !hasTaskPermission.hasPermission &&
            !hasProjectPermission.hasPermission
          ) {
            throw new Error("Insufficient permissions to view kanban board");
          }
        }

        // Get statuses
        const statuses = await Status.find({
          tenantId: ctx.tenantId,
          isActive: true,
        }).sort({ order: 1 });

        if (statuses.length === 0) {
          return {
            content: JSON.stringify({
              columns: [],
              totalProjects: 0,
              totalTasks: 0,
              totalItems: 0,
            }),
          };
        }

        // Build filters
        const projectFilter = isAdminOrOwner
          ? { tenantId: ctx.tenantId }
          : PermissionService.getProjectFilter(
              userPermissions,
              ctx.tenantId,
              {},
            );
        const taskFilter = isAdminOrOwner
          ? { tenantId: ctx.tenantId }
          : PermissionService.getTaskFilter(userPermissions, ctx.tenantId, {});

        if (parsedArgs.clientId) {
          projectFilter.clientId = parsedArgs.clientId;
          taskFilter.clientId = parsedArgs.clientId;
        }

        // Get data
        const [projects, tasks] = await Promise.all([
          Project.find(projectFilter)
            .populate("clientId", "name company")
            .lean(),
          Task.find(taskFilter)
            .populate("projectId", "title")
            .populate("clientId", "name company")
            .populate("assignees", "employeeId userId")
            .lean(),
        ]);

        // Group by status
        const columns = statuses.map((status: any) => {
          const statusProjects = projects.filter(
            (p: any) => p.statusId?.toString() === status._id.toString(),
          );
          const statusTasks = tasks.filter(
            (t: any) => t.statusId?.toString() === status._id.toString(),
          );

          return {
            id: status._id,
            name: status.name,
            order: status.order,
            items: [
              ...statusProjects.map((p: any) => ({
                id: p._id,
                type: "project",
                title: p.title,
                description: p.description,
                priority: p.priority,
                client: p.clientId,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
              })),
              ...statusTasks.map((t: any) => ({
                id: t._id,
                type: "task",
                title: t.title,
                description: t.description,
                priority: t.priority,
                project: t.projectId,
                client: t.clientId,
                assignees: t.assignees,
                dueDate: t.dueDate,
                estimatedHours: t.estimatedHours,
                actualHours: t.actualHours,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
              })),
            ].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
          };
        });

        return {
          content: JSON.stringify({
            columns,
            totalProjects: projects.length,
            totalTasks: tasks.length,
            totalItems: projects.length + tasks.length,
          }),
        };
      } catch (error: any) {
        console.error(`[AI Tool] Kanban error:`, error);
        throw new Error(`Failed to fetch kanban data: ${error.message}`);
      }
    },
  };
}

function generateAnalyticsTool(): ToolDef {
  return {
    name: "get_analytics",
    description:
      "Get analytics and insights about work orders, tasks, and performance metrics.",
    schema: z.object({
      period: z
        .enum(["today", "week", "month", "quarter", "year"])
        .default("month"),
      metric: z
        .enum(["overview", "performance", "workload", "completion"])
        .default("overview"),
    }),
    handler: async (args, ctx) => {
      try {
        // Parse and validate arguments
        const parsedArgs = args as any;

        // Check permissions
        const userPermissions = await PermissionService.getUserPermissions(
          ctx.userId,
          ctx.tenantId,
        );
        if (!userPermissions) {
          throw new Error("Unable to retrieve user permissions");
        }

        const isAdminOrOwner =
          userPermissions.permissions.includes("*") ||
          userPermissions.role === "superuser" ||
          userPermissions.role === "admin";

        if (!isAdminOrOwner) {
          const hasPermission = await PermissionService.hasPermissionAsync(
            ctx.userId,
            "reports.view",
            ctx.tenantId,
          );
          if (!hasPermission.hasPermission) {
            throw new Error("Insufficient permissions to view analytics");
          }
        }

        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        switch (parsedArgs.period) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
          case "quarter":
            startDate.setMonth(now.getMonth() - 3);
            break;
          case "year":
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        // Build analytics based on metric type
        let analytics: any = {};

        switch (parsedArgs.metric) {
          case "overview":
            const [workOrders, tasks, personnel] = await Promise.all([
              WorkOrder.countDocuments({ tenantId: ctx.tenantId }),
              Task.countDocuments({ tenantId: ctx.tenantId }),
              Personnel.countDocuments({
                tenantId: ctx.tenantId,
                status: "active",
              }),
            ]);

            analytics = {
              totalWorkOrders: workOrders,
              totalTasks: tasks,
              activePersonnel: personnel,
              period: parsedArgs.period,
            };
            break;

          case "performance":
            const completedTasks = await Task.countDocuments({
              tenantId: ctx.tenantId,
              completeStatus: true,
              updatedAt: { $gte: startDate },
            });
            const totalTasksInPeriod = await Task.countDocuments({
              tenantId: ctx.tenantId,
              createdAt: { $gte: startDate },
            });

            analytics = {
              completedTasks,
              totalTasksInPeriod,
              completionRate:
                totalTasksInPeriod > 0
                  ? (completedTasks / totalTasksInPeriod) * 100
                  : 0,
              period: parsedArgs.period,
            };
            break;

          case "workload":
            const workloadData = await Task.aggregate([
              { $match: { tenantId: ctx.tenantId } },
              { $unwind: "$assignees" },
              {
                $group: {
                  _id: "$assignees",
                  taskCount: { $sum: 1 },
                  totalHours: { $sum: "$estimatedHours" },
                },
              },
              {
                $lookup: {
                  from: "personnel",
                  localField: "_id",
                  foreignField: "_id",
                  as: "personnel",
                },
              },
              { $unwind: "$personnel" },
              {
                $project: {
                  employeeId: "$personnel.employeeId",
                  taskCount: 1,
                  totalHours: 1,
                },
              },
            ]);

            analytics = {
              workload: workloadData,
              period: parsedArgs.period,
            };
            break;
        }

        console.log(`[AI Tool] Analytics generated:`, {
          metric: parsedArgs.metric,
          period: parsedArgs.period,
        });

        return {
          content: JSON.stringify(analytics),
        };
      } catch (error: any) {
        console.error(`[AI Tool] Analytics error:`, error);
        throw new Error(`Failed to generate analytics: ${error.message}`);
      }
    },
  };
}

function generateCreateTaskTool(): ToolDef {
  return {
    name: "create_task",
    description: "Create task (FALLBACK - use create_task_local first)",
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      projectId: z.string().optional(),
      projectName: z.string().optional(),
      workOrderId: z.string().optional(),
      workOrderNumber: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      estimatedHours: z.number().optional(),
      assignees: z.array(z.string()).optional(),
      clientId: z.string().optional(),
      clientName: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    handler: async (args, ctx) => {
      try {
        // Parse and validate arguments
        const parsedArgs = args as any;

        console.log(
          `[AI Tool] ❌ USING OPENAI (EXPENSIVE) for: "${parsedArgs.title}"`,
        );

        // REMOVED BLOCKING VALIDATION - Create tasks immediately with available info

        // Check permissions
        const userPermissions = await PermissionService.getUserPermissions(
          ctx.userId,
          ctx.tenantId,
        );
        if (!userPermissions) {
          throw new Error("Unable to retrieve user permissions");
        }

        const isAdminOrOwner =
          userPermissions.permissions.includes("*") ||
          userPermissions.role === "superuser" ||
          userPermissions.role === "admin";

        if (!isAdminOrOwner) {
          const hasPermission = await PermissionService.hasPermissionAsync(
            ctx.userId,
            "tasks.create",
            ctx.tenantId,
          );
          if (!hasPermission.hasPermission) {
            throw new Error("Insufficient permissions to create tasks");
          }
        }

        // Get default status (Todo)
        const defaultStatus = await Status.findOne({
          tenantId: ctx.tenantId,
          isActive: true,
        }).sort({ order: 1 });

        if (!defaultStatus) {
          throw new Error("No active status found for tasks");
        }

        // Resolve project if projectName is provided
        let projectId = parsedArgs.projectId;
        if (parsedArgs.projectName && !projectId) {
          const project = await Project.findOne({
            tenantId: ctx.tenantId,
            title: { $regex: new RegExp(parsedArgs.projectName, "i") },
          });
          if (project) {
            projectId = project._id.toString();
          }
        }

        // Resolve work order if workOrderNumber is provided
        let workOrderId = parsedArgs.workOrderId;
        let workOrderNumber = parsedArgs.workOrderNumber;
        let workOrderTitle = "";
        if (parsedArgs.workOrderNumber && !workOrderId) {
          // Search by workOrderNumber first, then by title
          let workOrder = await WorkOrder.findOne({
            tenantId: ctx.tenantId,
            workOrderNumber: parsedArgs.workOrderNumber,
          });

          // If not found by number, try searching by title
          if (!workOrder) {
            workOrder = await WorkOrder.findOne({
              tenantId: ctx.tenantId,
              title: { $regex: new RegExp(parsedArgs.workOrderNumber, "i") },
            });
          }

          if (workOrder) {
            workOrderId = workOrder._id.toString();
            workOrderNumber = workOrder.workOrderNumber;
            workOrderTitle = workOrder.title;
            console.log(
              `[AI Tool] Work order resolved: "${parsedArgs.workOrderNumber}" -> ${workOrderId} (${workOrder.title})`,
            );
          } else {
            console.log(
              `[AI Tool] Work order not found: "${parsedArgs.workOrderNumber}"`,
            );
          }
        }

        // Resolve client if clientName is provided
        let clientId = parsedArgs.clientId;
        let clientName = "";
        let clientCompany = "";
        if (parsedArgs.clientName && !clientId) {
          const client = await Client.findOne({
            tenantId: ctx.tenantId,
            $or: [
              { name: { $regex: new RegExp(parsedArgs.clientName, "i") } },
              { company: { $regex: new RegExp(parsedArgs.clientName, "i") } },
            ],
          });
          if (client) {
            clientId = client._id.toString();
            clientName = client.name;
            clientCompany = client.company;
          }
        }

        // Parse dates from natural language
        const parseDate = (dateStr: string): Date | undefined => {
          if (!dateStr) return undefined;

          const now = new Date();
          const lower = dateStr.toLowerCase();

          if (lower.includes("today")) return now;
          if (lower.includes("tomorrow")) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
          }
          if (lower.includes("monday")) {
            const monday = new Date(now);
            const dayOfWeek = monday.getDay();
            const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
            monday.setDate(monday.getDate() + daysUntilMonday);
            return monday;
          }
          if (lower.includes("friday")) {
            const friday = new Date(now);
            const dayOfWeek = friday.getDay();
            const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
            friday.setDate(friday.getDate() + daysUntilFriday);
            return friday;
          }
          if (lower.includes("next week")) {
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
          }

          // Try to parse as ISO date
          const parsed = new Date(dateStr);
          return isNaN(parsed.getTime()) ? undefined : parsed;
        };

        const startDate = parsedArgs.startDate
          ? parseDate(parsedArgs.startDate)
          : undefined;
        const dueDate = parsedArgs.dueDate
          ? parseDate(parsedArgs.dueDate)
          : undefined;

        // Create the task
        const taskData: any = {
          tenantId: ctx.tenantId,
          title: parsedArgs.title,
          description: parsedArgs.description || "",
          columnId: defaultStatus._id.toString(),
          priority: parsedArgs.priority,
          createdBy: ctx.userId,
          tags: parsedArgs.tags || [],
          attachments: [],
          order: 0,
          completeStatus: false,
        };

        if (projectId) taskData.projectId = projectId;
        if (workOrderId) {
          taskData.workOrderId = workOrderId;
          taskData.workOrderNumber = workOrderNumber;
          taskData.workOrderTitle = workOrderTitle;
        }
        if (clientId) {
          taskData.clientId = clientId;
          taskData.clientName = clientName;
          taskData.clientCompany = clientCompany;
        }
        if (startDate) taskData.startDate = startDate;
        if (dueDate) taskData.dueDate = dueDate;
        if (parsedArgs.estimatedHours)
          taskData.estimatedHours = parsedArgs.estimatedHours;

        // Only process assignees if explicitly provided by user
        if (parsedArgs.assignees && parsedArgs.assignees.length > 0) {
          const resolvedAssignees = [];

          for (const assignee of parsedArgs.assignees) {
            // Only validate if starts with @ or is an ObjectId
            if (
              assignee.startsWith("@") ||
              /^[0-9a-fA-F]{24}$/.test(assignee)
            ) {
              const validationResult =
                await DataValidationService.validatePersonnel(
                  assignee.startsWith("@") ? assignee : `@${assignee}`,
                  { tenantId: ctx.tenantId, userId: ctx.userId },
                );

              if (validationResult.isValid && validationResult.data) {
                resolvedAssignees.push(validationResult.data.id);
              }
            }
          }

          if (resolvedAssignees.length > 0) {
            taskData.assignees = resolvedAssignees;
          }
        }

        const task = new Task(taskData);
        await task.save();

        // Populate the created task
        const populatedTask = await Task.findById(task._id)
          .populate("projectId", "title")
          .populate("clientId", "name company")
          .populate("assignees", "employeeId userId")
          .lean();

        console.log(`[AI Tool] Task created:`, {
          id: task._id,
          title: parsedArgs.title,
        });

        // Emit task created event for real-time updates
        if (ctx.emitEvent) {
          ctx.emitEvent({
            type: "task_created",
            data: {
              taskId: task._id.toString(),
              title: parsedArgs.title,
              projectId: projectId,
              clientId: clientId,
            },
          });
        }

        // Minimal response for efficiency
        return {
          content: JSON.stringify({
            success: true,
            task: { id: task._id, title: parsedArgs.title },
            message: `Task "${parsedArgs.title}" created`,
          }),
        };
      } catch (error: any) {
        console.error(
          `[AI Tool] ❌ USING OPENAI (EXPENSIVE): Create task error:`,
          error,
        );
        throw new Error(`Failed to create task: ${error.message}`);
      }
    },
  };
}

function generateUpdateTaskTool(): ToolDef {
  return {
    name: "update_task",
    description: "Update an existing task with new information.",
    schema: z.object({
      id: z.string().describe("Task ID to update"),
      title: z.string().optional().describe("New task title"),
      description: z.string().optional().describe("New task description"),
      priority: z
        .enum(["low", "medium", "high", "urgent"])
        .optional()
        .describe("New priority"),
      status: z.string().optional().describe("New status ID"),
      startDate: z.string().optional().describe("New start date"),
      dueDate: z.string().optional().describe("New due date"),
      estimatedHours: z.number().optional().describe("New estimated hours"),
      actualHours: z.number().optional().describe("Actual hours worked"),
      assignees: z
        .array(z.string())
        .optional()
        .describe("New assignees (personnel IDs or names)"),
      tags: z.array(z.string()).optional().describe("New tags"),
      notes: z.string().optional().describe("Additional notes"),
    }),
    handler: async (args, ctx) => {
      try {
        // Parse and validate arguments
        const parsedArgs = args as any;

        // Check permissions
        const userPermissions = await PermissionService.getUserPermissions(
          ctx.userId,
          ctx.tenantId,
        );
        if (!userPermissions) {
          throw new Error("Unable to retrieve user permissions");
        }

        const isAdminOrOwner =
          userPermissions.permissions.includes("*") ||
          userPermissions.role === "superuser" ||
          userPermissions.role === "admin";

        if (!isAdminOrOwner) {
          const hasPermission = await PermissionService.hasPermissionAsync(
            ctx.userId,
            "tasks.update",
            ctx.tenantId,
          );
          if (!hasPermission.hasPermission) {
            throw new Error("Insufficient permissions to update tasks");
          }
        }

        // Find the task
        const task = await Task.findOne({
          _id: parsedArgs.id,
          tenantId: ctx.tenantId,
        });

        if (!task) {
          throw new Error("Task not found");
        }

        // Update fields
        const updateData: any = {};
        if (parsedArgs.title) updateData.title = parsedArgs.title;
        if (parsedArgs.description !== undefined)
          updateData.description = parsedArgs.description;
        if (parsedArgs.priority) updateData.priority = parsedArgs.priority;
        if (parsedArgs.status) updateData.columnId = parsedArgs.status;
        if (parsedArgs.startDate)
          updateData.startDate = new Date(parsedArgs.startDate);
        if (parsedArgs.dueDate)
          updateData.dueDate = new Date(parsedArgs.dueDate);
        if (parsedArgs.estimatedHours)
          updateData.estimatedHours = parsedArgs.estimatedHours;
        if (parsedArgs.actualHours)
          updateData.actualHours = parsedArgs.actualHours;

        // Resolve assignees using validation service - PERMISSIVE VALIDATION
        let resolvedAssignees = [];
        let invalidAssignees = [];

        if (parsedArgs.assignees && parsedArgs.assignees.length > 0) {
          for (const assignee of parsedArgs.assignees) {
            // Use validation service to resolve assignee
            const validationResult =
              await DataValidationService.validatePersonnel(
                assignee.startsWith("@") ? assignee : `@${assignee}`,
                { tenantId: ctx.tenantId, userId: ctx.userId },
              );

            if (validationResult.isValid && validationResult.data) {
              resolvedAssignees.push(validationResult.data.id);
              console.log(
                `[AI Tool] Resolved assignee "${assignee}" to ID: ${validationResult.data.id}`,
              );
            } else {
              console.warn(
                `[AI Tool] Could not validate assignee: "${assignee}" - ${validationResult.error}`,
              );
              invalidAssignees.push(assignee);
            }
          }

          // If any assignees are invalid, warn but continue with valid ones
          if (invalidAssignees.length > 0) {
            console.warn(
              `[AI Tool] Skipping invalid assignees: ${invalidAssignees.join(", ")}`,
            );
            // Continue with valid assignees only
          }

          updateData.assignees = resolvedAssignees;
        }

        if (parsedArgs.tags) updateData.tags = parsedArgs.tags;
        if (parsedArgs.notes) updateData.notes = parsedArgs.notes;

        // Update the task
        await Task.findByIdAndUpdate(parsedArgs.id, updateData);

        // Get updated task
        const updatedTask = await Task.findById(parsedArgs.id)
          .populate("projectId", "title")
          .populate("clientId", "name company")
          .populate("assignees", "employeeId userId")
          .lean();

        console.log(`[AI Tool] Task updated:`, { id: parsedArgs.id });

        // Emit task updated event for real-time updates
        if (ctx.emitEvent) {
          ctx.emitEvent({
            type: "task_updated",
            data: {
              taskId: parsedArgs.id,
              title: parsedArgs.title || (updatedTask as any)?.title,
              projectId: (updatedTask as any)?.projectId?._id,
              clientId: (updatedTask as any)?.clientId?._id,
            },
          });
        }

        // Prepare response message
        let message = `Task updated successfully`;
        const warnings = [];

        // Add warning about skipped invalid assignees
        if (invalidAssignees.length > 0) {
          warnings.push(
            `Skipped invalid personnel: ${invalidAssignees.join(", ")}`,
          );
        }

        if (resolvedAssignees.length > 0) {
          message += ` with ${resolvedAssignees.length} assignee(s)`;
        }

        const response: any = {
          success: true,
          task: updatedTask,
          message,
        };

        if (warnings.length > 0) {
          response.warnings = warnings;
          response.suggestion =
            "Use the lookup_data tool to find available personnel, or use the get_autocomplete tool to see suggestions.";
        }

        return {
          content: JSON.stringify(response),
        };
      } catch (error: any) {
        console.error(`[AI Tool] Update task error:`, error);
        throw new Error(`Failed to update task: ${error.message}`);
      }
    },
  };
}
