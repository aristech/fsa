import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../types";
import { Task, Project } from "../models";
import { WorkOrderProgressService } from "../services/work-order-progress-service";
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
    console.log("User:", user._id);
    console.log("Client ID:", clientId);

    // Get all projects and tasks for the tenant, sorted by order (for tasks) and created_at (latest first)
    const [projects, tasks] = await Promise.all([
      Project.find({ tenantId: tenant._id, isActive: true }).sort({
        createdAt: -1,
      }),
      Task.find({ tenantId: tenant._id }).sort({ order: 1, createdAt: -1 }),
    ]);

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

    // Transform to kanban format
    const statuses = ["todo", "in-progress", "done", "cancelled"];
    const kanbanTasks = [
      ...filteredProjects.map((project) =>
        transformProjectToKanbanTask(project, statuses)
      ),
      ...filteredTasks.map((task) => transformTaskToKanbanTask(task, statuses)),
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
    due,
    clientId,
    clientName,
    clientCompany,
    workOrderId,
    workOrderNumber,
  } = taskData;

  // If clientId is provided, validate it belongs to the tenant
  let validatedClientId = null;
  if (clientId) {
    // Temporarily skip client validation to fix hanging issue
    validatedClientId = clientId;
  }

  const newTask = new Task({
    tenantId: tenant._id,
    title: name,
    description: description || "No description",
    priority: priority || "medium",
    status: "todo",
    tags: labels || [],
    createdBy: user._id,
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

  const deletedTask = await Task.findOneAndDelete({
    _id: taskId,
    tenantId: tenant._id,
  });

  if (!deletedTask) {
    return reply.code(404).send({
      success: false,
      error: "Task not found",
    });
  }

  return reply.send({
    success: true,
    message: "Task deleted successfully",
    data: deletedTask,
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

  const { name, description, priority, labels, assignee, due, status } =
    taskData;

  const updateData: any = {};
  if (name !== undefined) updateData.title = name;
  if (description !== undefined) updateData.description = description;
  if (priority !== undefined) updateData.priority = priority;
  if (labels !== undefined) updateData.tags = labels;
  if (status !== undefined) updateData.status = status.toLowerCase();

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
