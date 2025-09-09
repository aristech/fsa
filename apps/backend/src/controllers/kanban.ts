import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../types";
import { Task, Project, Status, Subtask, Comment, Personnel } from "../models";
import { AssignmentPermissionService } from "../services/assignment-permission-service";
import { getPriorityOptions } from "../constants/priorities";
import { WorkOrderProgressService } from "../services/work-order-progress-service";
import { EntityCleanupService } from "../services/entity-cleanup-service";
import {
  transformProjectToKanbanTask,
  transformTaskToKanbanTask,
} from "../utils/kanban-transformers";

export async function getKanbanData(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const req = request as AuthenticatedRequest;
    const { tenant, user } = req.context!;
    const { clientId } = request.query as { clientId?: string };

    console.log("GET Kanban request received");
    console.log("Tenant:", tenant._id);
    console.log("User:", user.id);
    console.log("Client ID:", clientId);

    // Get all projects and tasks for the tenant, sorted by order (for tasks) and created_at (latest first)
    const [projects, tasks] = await Promise.all([
      Project.find({ tenantId: tenant._id, isActive: true }).sort({ createdAt: -1 }),
      Task.find({ tenantId: tenant._id }).sort({ order: 1, createdAt: -1 }),
    ]);

    // Build lookup maps for reporter (users) and assignees (personnel)
    const userIds = new Set<string>();
    const personnelIds = new Set<string>();
    tasks.forEach((t) => {
      if (t.createdBy) userIds.add(t.createdBy.toString());
      const a = (t as any).assignees as string[] | undefined;
      a?.forEach((id) => personnelIds.add(id));
    });

    const [users, personnel] = await Promise.all([
      // lightweight projections
      (await import("../models")).User.find({ _id: { $in: Array.from(userIds) } }, {
        firstName: 1,
        lastName: 1,
        email: 1,
        avatar: 1,
      }).lean(),
      (await import("../models")).Personnel.find({ _id: { $in: Array.from(personnelIds) } }, {
        employeeId: 1,
        userId: 1,
      })
        .populate({ path: "userId", select: "firstName lastName email avatar" })
        .lean(),
    ]);

    const userById: Record<string, { name?: string; email?: string; avatar?: string }> = {};
    users.forEach((u: any) => {
      userById[u._id.toString()] = {
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
        email: u.email,
        avatar: u.avatar,
      };
    });

    const personnelById: Record<string, { name?: string; email?: string; avatar?: string }> = {};
    personnel.forEach((p: any) => {
      const fullName = [p.userId?.firstName, p.userId?.lastName].filter(Boolean).join(" ") || p.employeeId;
      personnelById[p._id.toString()] = {
        name: fullName,
        email: p.userId?.email,
        avatar: p.userId?.avatar,
      };
    });

    console.log(`Found ${projects.length} projects and ${tasks.length} tasks`);

    // Filter by client if specified
    let filteredProjects = projects;
    let filteredTasks = tasks;

    if (clientId) {
      // Filter projects by client
      filteredProjects = projects.filter(
        (project) => project.clientId?.toString() === clientId
      );

      // Filter tasks by client
      filteredTasks = tasks.filter(
        (task) => task.clientId?.toString() === clientId
      );

      console.log(
        `After client filter: ${filteredProjects.length} projects, ${filteredTasks.length} tasks`
      );
    }

    // Load dynamic statuses for tenant (fallback to defaults)
    const statusDocs = await Status.find({ tenantId: tenant._id, isActive: true })
      .sort({ order: 1 })
      .lean();
    const statuses =
      statusDocs.length > 0
        ? statusDocs.map((s) => s.name.toLowerCase().replace(/\s+/g, "-"))
        : ["todo", "in-progress", "review", "done"]; // default fallback

    // Get subtasks count for each task
    const taskIds = filteredTasks.map(task => task._id);
    const subtasksCounts = await Subtask.aggregate([
      { $match: { taskId: { $in: taskIds }, tenantId: req.user.tenantId } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } }
    ]);
    const subtasksCountById = subtasksCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Get comments count for each task
    const commentsCounts = await Comment.aggregate([
      { $match: { taskId: { $in: taskIds }, tenantId: req.user.tenantId } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } }
    ]);
    const commentsCountById = commentsCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const kanbanTasks = [
      ...filteredProjects.map((project) =>
        transformProjectToKanbanTask(project, statuses)
      ),
      ...filteredTasks.map((task) =>
        transformTaskToKanbanTask(task, statuses, { 
          userById, 
          personnelById,
          subtasksCount: subtasksCountById[task._id.toString()] || 0,
          commentsCount: commentsCountById[task._id.toString()] || 0
        })
      ),
    ];

    // Group by status
    const columns = statuses.map((status) => ({
      id: `column-${status}`,
      title: status.charAt(0).toUpperCase() + status.slice(1).replace("-", " "),
      taskIds: kanbanTasks
        .filter((task) => task.status === status)
        .map((task) => task.id),
    }));

    const board = {
      tasks: kanbanTasks,
      columns,
    };

    return reply.send({
      success: true,
      data: { board },
    });
  } catch (error) {
    console.error("Error in Kanban GET:", error);
    return reply.code(500).send({
      success: false,
      error: "Internal server error",
    });
  }
}

export async function handleKanbanPost(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const req = request as AuthenticatedRequest;
    const { tenant, user } = req.context!;
    const body = request.body as any;
    const endpoint = (request.query as any)?.endpoint || "create-task";

    console.log("POST request received");
    console.log("Endpoint:", endpoint);
    console.log("Request body:", JSON.stringify(body, null, 2));

    switch (endpoint) {
      case "create-task":
        return await handleCreateTask(req, reply, body);
      case "delete-task":
        return await handleDeleteTask(req, reply, body);
      case "update-task":
        return await handleUpdateTask(req, reply, body);
      case "move-task":
        return await handleMoveTask(req, reply, body);
      default:
        return reply.code(400).send({
          success: false,
          error: `Unknown endpoint: ${endpoint}`,
        });
    }
  } catch (error) {
    console.error("Error in Kanban POST:", error);
    return reply.code(500).send({
      success: false,
      error: "Internal server error",
    });
  }
}

export async function getKanbanMeta(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const req = request as AuthenticatedRequest;
    const { tenant } = req.context!;

    const statusDocs = await Status.find({ tenantId: tenant._id, isActive: true })
      .sort({ order: 1 })
      .lean();

    const statuses = statusDocs.map((s: any) => ({
      id: s._id.toString(),
      name: s.name,
      color: s.color,
      order: s.order,
    }));

    const priorities = getPriorityOptions();

    return reply.send({ success: true, data: { statuses, priorities } });
  } catch (error) {
    console.error("Error in Kanban META:", error);
    return reply.code(500).send({ success: false, error: "Internal server error" });
  }
}

async function handleCreateTask(
  req: AuthenticatedRequest,
  reply: FastifyReply,
  body: any
) {
  const { tenant, user } = req.context!;
  const { taskData } = body;
  const {
    name,
    description,
    priority,
    labels,
    assignee,
    assignees,
    due,
    startDate,
    dueDate,
    clientId,
    clientName,
    clientCompany,
    workOrderId,
    workOrderNumber,
    tags,
    attachments,
    estimatedHours,
  } = taskData;

  // If clientId is provided, validate it belongs to the tenant
  let validatedClientId = null;
  if (clientId) {
    // Temporarily skip client validation to fix hanging issue
    validatedClientId = clientId;
  }

  // Validate assignees eligibility (active personnel only)
  let validatedAssignees: string[] = [];
  if (Array.isArray(assignees) ? assignees.length > 0 : !!assignee) {
    const list = Array.isArray(assignees) ? assignees : assignee ? [assignee] : [];
    const personnelDocs = await Personnel.find({ _id: { $in: list }, tenantId: tenant._id }).select('_id isActive status');
    const eligible = personnelDocs
      .filter((p: any) => p.isActive && p.status === 'active')
      .map((p: any) => p._id.toString());
    validatedAssignees = eligible;
  }

  const newTask = new Task({
    tenantId: tenant._id,
    title: name,
    description: description || "",
    priority: priority || "medium",
    status: "todo",
    tags: tags || labels || [],
    assignees: validatedAssignees,
    createdBy: user.id,
    // Add date information if available
    ...(startDate && { startDate: new Date(startDate) }),
    ...(dueDate && { dueDate: new Date(dueDate) }),
    // Add estimated hours if provided
    ...(estimatedHours && { estimatedHours: Number(estimatedHours) }),
    // Add attachments if provided
    ...(attachments && { attachments: Array.isArray(attachments) ? attachments : [] }),
    // Add client information if available
    ...(validatedClientId && {
      clientId: validatedClientId,
      clientName: clientName,
      clientCompany: clientCompany,
    }),
    // Add work order information if available
    ...(workOrderId && {
      workOrderId: workOrderId,
      workOrderNumber: workOrderNumber,
    }),
  });

  await newTask.save();

  // Recompute work order aggregates if linked
  if (newTask.workOrderId) {
    await WorkOrderProgressService.recomputeForWorkOrder(
      tenant._id.toString(),
      newTask.workOrderId.toString()
    );
  }

  // Handle assignment permissions for newly created task
  if (newTask.assignees && newTask.assignees.length > 0) {
    await AssignmentPermissionService.handleTaskAssignment(
      newTask._id.toString(),
      newTask.assignees,
      tenant._id.toString()
    );
  }

  return reply.send({
    success: true,
    message: "Task created successfully",
    data: newTask,
  });
}

async function handleDeleteTask(
  req: AuthenticatedRequest,
  reply: FastifyReply,
  body: any
) {
  const { tenant, user } = req.context!;
  const { taskId } = body;

  if (!taskId) {
    return reply.code(400).send({
      success: false,
      error: "Task ID is required",
    });
  }

  // Check if task exists before cleanup
  const task = await Task.findOne({
    _id: taskId,
    tenantId: tenant._id,
  });

  if (!task) {
    return reply.code(404).send({
      success: false,
      error: "Task not found",
    });
  }

  // Perform comprehensive cleanup
  const cleanupResult = await EntityCleanupService.cleanupTask(
    taskId,
    tenant._id.toString(),
    {
      deleteFiles: true,
      deleteComments: true,
      deleteSubtasks: true,
      deleteAssignments: true,
    }
  );

  if (!cleanupResult.success) {
    console.error(`Task cleanup failed: ${cleanupResult.message}`);
    return reply.code(500).send({
      success: false,
      error: `Failed to cleanup task: ${cleanupResult.message}`,
    });
  }

  // Log cleanup details
  console.log(`🧹 Task cleanup completed:`, cleanupResult.details);

  return reply.send({
    success: true,
    message: cleanupResult.message,
    data: {
      task: {
        _id: task._id,
        name: task.name,
        description: task.description,
      },
      cleanupDetails: cleanupResult.details,
    },
  });
}

async function handleUpdateTask(
  req: AuthenticatedRequest,
  reply: FastifyReply,
  body: any
) {
  const { tenant, user } = req.context!;
  const { taskData } = body;

  if (!taskData || !taskData.id) {
    return reply.code(400).send({
      success: false,
      error: "Task data and ID are required",
    });
  }

  const { name, description, priority, labels, assignee, assignees, due, status, workOrderId, workOrderNumber, startDate, dueDate, attachments, clientId, clientName, clientCompany, completeStatus } =
    taskData;

  const updateData: any = {};
  if (name !== undefined) updateData.title = name;
  if (description !== undefined) updateData.description = description;
  if (priority !== undefined) updateData.priority = priority;
  if (labels !== undefined) updateData.tags = labels;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (dueDate !== undefined) updateData.dueDate = dueDate;
  if (typeof completeStatus === 'boolean') updateData.completeStatus = completeStatus;
  if (assignees !== undefined) {
    const list = Array.isArray(assignees) ? assignees : assignee ? [assignee] : [];
    if (list.length > 0) {
      const personnelDocs = await Personnel.find({ _id: { $in: list }, tenantId: tenant._id }).select('_id isActive status');
      const eligible = personnelDocs
        .filter((p: any) => p.isActive && p.status === 'active')
        .map((p: any) => p._id.toString());
      updateData.assignees = eligible;
    } else {
      updateData.assignees = [];
    }
  }
  if (status !== undefined) updateData.status = status.toLowerCase();
  if (workOrderId !== undefined) updateData.workOrderId = workOrderId;
  if (workOrderNumber !== undefined) updateData.workOrderNumber = workOrderNumber;
  if (clientId !== undefined) updateData.clientId = clientId;
  if (clientName !== undefined) updateData.clientName = clientName;
  if (clientCompany !== undefined) updateData.clientCompany = clientCompany;
  if (attachments !== undefined) {
    // Normalize attachments to string paths/URLs
    try {
      const normalized: string[] = (attachments as any[]).map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.url || item.relativePath || item.path || JSON.stringify(item);
        }
        return String(item);
      });
      updateData.attachments = normalized;
    } catch {
      updateData.attachments = [];
    }
  }

  const updatedTask = await Task.findOneAndUpdate(
    {
      _id: taskData.id,
      tenantId: tenant._id,
    },
    updateData,
    { new: true }
  );

  if (!updatedTask) {
    return reply.code(404).send({
      success: false,
      error: "Task not found",
    });
  }

  if (updatedTask.workOrderId) {
    await WorkOrderProgressService.recomputeForWorkOrder(
      tenant._id.toString(),
      updatedTask.workOrderId.toString()
    );
  }

  // Handle assignment permission changes
  if (assignees !== undefined) {
    await AssignmentPermissionService.handleTaskAssignment(
      updatedTask._id.toString(),
      updatedTask.assignees || [],
      tenant._id.toString()
    );
  }

  return reply.send({
    success: true,
    message: "Task updated successfully",
    data: updatedTask,
  });
}

async function handleMoveTask(
  req: AuthenticatedRequest,
  reply: FastifyReply,
  body: any
) {
  const { tenant, user } = req.context!;
  const { updateTasks } = body;

  if (!updateTasks || typeof updateTasks !== "object") {
    return reply.code(400).send({
      success: false,
      error: "updateTasks is required and must be an object",
    });
  }

  try {
    // Extract all task IDs from the updateTasks object
    const allTaskIds: string[] = [];
    Object.values(updateTasks).forEach((tasks: any) => {
      if (Array.isArray(tasks)) {
        tasks.forEach((task: any) => {
          if (task.id) {
            allTaskIds.push(task.id);
          }
        });
      }
    });

    // Update task statuses and order based on their new column positions
    const columnStatusMap: Record<string, string> = {
      "column-todo": "todo",
      "column-in-progress": "in-progress",
      "column-done": "done",
      "column-cancelled": "cancelled",
    };

    // Update each task's status and order based on its new column and position
    for (const [columnId, tasks] of Object.entries(updateTasks)) {
      if (Array.isArray(tasks)) {
        const newStatus = columnStatusMap[columnId] || "todo";

        // Update each task with its new status and order
        for (let index = 0; index < tasks.length; index++) {
          const task = tasks[index];
          if (task.id) {
            await Task.findOneAndUpdate(
              {
                _id: task.id,
                tenantId: tenant._id,
              },
              {
                status: newStatus,
                order: index, // Add order field to maintain task order within columns
              },
              { new: true }
            );
          }
        }
      }
    }

    return reply.send({
      success: true,
      message: "Tasks moved and reordered successfully",
      data: { movedTasks: allTaskIds.length },
    });
  } catch (error) {
    console.error("Error moving tasks:", error);
    return reply.code(500).send({
      success: false,
      error: "Failed to move tasks",
    });
  }
}
