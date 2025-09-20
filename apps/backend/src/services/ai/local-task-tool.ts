import { z } from "zod";
import type { ToolDef, ChatContext } from "../../types/ai";
import { PermissionService } from "../permission-service";
import { localNLPService } from "./local-nlp-service";
import { Task, Status, Project, WorkOrder, Client } from "../../models";
import { DataValidationService } from "./data-validation";

export function generateLocalTaskTool(): ToolDef {
  return {
    name: "create_task_local",
    description: "PREFERRED: Create task using FREE local NLP (no API costs, instant)",
    schema: z.object({
      text: z.string().describe("Natural language text describing the task"),
    }),
    handler: async (args, ctx) => {
      try {
        const parsedArgs = args as any;

        console.log(`[LocalNLP] ✅ USING LOCAL NLP (FREE): "${parsedArgs.text}"`);

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

        // Process with local NLP
        let nlpResult;
        try {
          // Try HTTP server first
          nlpResult = await localNLPService.processText(
            parsedArgs.text,
            ctx.userId,
            ctx.tenantId
          );
        } catch (error) {
          console.log("[LocalNLP] Server unavailable, trying direct script...");
          try {
            // Fallback to direct script execution
            nlpResult = await localNLPService.runDirectScript(parsedArgs.text);
          } catch (scriptError) {
            console.error("[LocalNLP] Both methods failed:", scriptError);
            throw new Error("Local NLP service unavailable");
          }
        }

        // Check if this looks like a task creation intent
        if (nlpResult.intent !== "create_task" && nlpResult.confidence < 0.3) {
          return {
            content: JSON.stringify({
              success: false,
              message: "This doesn't appear to be a task creation request. Try something like 'create a task for garden maintenance'",
              suggestion: "Use clear language like: 'create task [title]', 'add task [title]', or 'schedule task [title]'",
              confidence: nlpResult.confidence,
            }),
          };
        }

        console.log(`[LocalNLP] Extracted:`, {
          intent: nlpResult.intent,
          title: nlpResult.title,
          confidence: nlpResult.confidence,
          entities: nlpResult.entities.length,
        });

        // Get default status
        const defaultStatus = await Status.findOne({
          tenantId: ctx.tenantId,
          isActive: true,
        }).sort({ order: 1 });

        if (!defaultStatus) {
          throw new Error("No active status found for tasks");
        }

        // Parse dates
        const parseDate = (dateStr: string | undefined): Date | undefined => {
          if (!dateStr) return undefined;
          try {
            return new Date(dateStr);
          } catch {
            return undefined;
          }
        };

        // Build task data
        const taskData: any = {
          tenantId: ctx.tenantId,
          title: nlpResult.title,
          description: nlpResult.description || "",
          columnId: defaultStatus._id.toString(),
          priority: nlpResult.priority || "medium",
          createdBy: ctx.userId,
          tags: [],
          attachments: [],
          order: 0,
          completeStatus: false,
        };

        // Add dates if extracted
        if (nlpResult.start_date) {
          taskData.startDate = parseDate(nlpResult.start_date);
        }
        if (nlpResult.due_date) {
          taskData.dueDate = parseDate(nlpResult.due_date);
        }
        if (nlpResult.estimated_hours) {
          taskData.estimatedHours = nlpResult.estimated_hours;
        }

        // Resolve work order
        if (nlpResult.work_order) {
          const workOrder = await WorkOrder.findOne({
            tenantId: ctx.tenantId,
            $or: [
              { workOrderNumber: { $regex: new RegExp(nlpResult.work_order, "i") } },
              { title: { $regex: new RegExp(nlpResult.work_order, "i") } },
            ],
          });
          if (workOrder) {
            taskData.workOrderId = workOrder._id.toString();
            taskData.workOrderNumber = workOrder.workOrderNumber;
            taskData.workOrderTitle = workOrder.title;
          }
        }

        // Resolve project
        if (nlpResult.project) {
          const project = await Project.findOne({
            tenantId: ctx.tenantId,
            title: { $regex: new RegExp(nlpResult.project, "i") },
          });
          if (project) {
            taskData.projectId = project._id.toString();
          }
        }

        // Resolve client
        if (nlpResult.client) {
          const client = await Client.findOne({
            tenantId: ctx.tenantId,
            $or: [
              { name: { $regex: new RegExp(nlpResult.client, "i") } },
              { company: { $regex: new RegExp(nlpResult.client, "i") } },
            ],
          });
          if (client) {
            taskData.clientId = client._id.toString();
            taskData.clientName = client.name;
            taskData.clientCompany = client.company;
          }
        }

        // Resolve assignees
        if (nlpResult.assignees && nlpResult.assignees.length > 0) {
          const resolvedAssignees = [];

          for (const assignee of nlpResult.assignees) {
            const validationResult = await DataValidationService.validatePersonnel(
              assignee.startsWith("@") ? assignee : `@${assignee}`,
              { tenantId: ctx.tenantId, userId: ctx.userId }
            );

            if (validationResult.isValid && validationResult.data) {
              resolvedAssignees.push(validationResult.data.id);
            }
          }

          if (resolvedAssignees.length > 0) {
            taskData.assignees = resolvedAssignees;
          }
        }

        // Create the task
        const task = new Task(taskData);
        await task.save();

        console.log(`[LocalNLP] Task created: ${task._id}`);

        // Emit task created event
        if (ctx.emitEvent) {
          ctx.emitEvent({
            type: "task_created",
            data: {
              taskId: task._id.toString(),
              title: nlpResult.title,
              projectId: taskData.projectId,
              clientId: taskData.clientId,
            },
          });
        }

        return {
          content: JSON.stringify({
            success: true,
            task: {
              id: task._id,
              title: nlpResult.title,
              priority: nlpResult.priority,
              entities: nlpResult.entities,
            },
            message: `Task "${nlpResult.title}" created locally`,
            confidence: nlpResult.confidence,
            method: "local_nlp",
          }),
        };

      } catch (error: any) {
        console.error(`[LocalNLP] Create task error:`, error);
        throw new Error(`Failed to create task locally: ${error.message}`);
      }
    },
  };
}