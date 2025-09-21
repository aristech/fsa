import { z } from "zod";
import type { ToolDef } from "../../types/ai";
import { PermissionService } from "../permission-service";
import { AuthenticatedRequest } from "../../types";
import { callInternalAPI } from "./internal-api-caller";

/**
 * Dynamic API Tool Generator
 * Creates AI tools that call actual API endpoints instead of duplicating logic
 */

// API endpoint configuration
interface APIEndpointConfig {
  name: string;
  displayName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  permissions: {
    view: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  description: string;
  supportedFilters?: string[];
  examples?: string[];
}

// Define all available API endpoints
const API_ENDPOINTS: APIEndpointConfig[] = [
  {
    name: "kanban",
    displayName: "Kanban Board",
    endpoint: "/api/kanban",
    method: "GET",
    permissions: { view: "tasks.view" },
    description: "Get kanban board with tasks organized by status columns",
    supportedFilters: ["clientId"],
    examples: ["Show my kanban board", "What tasks are in progress?"]
  },
  {
    name: "workOrders",
    displayName: "Work Orders",
    endpoint: "/api/work-orders",
    method: "GET",
    permissions: { view: "workOrders.view" },
    description: "Get work orders with filtering and search capabilities. Status values: created, assigned, in-progress, completed, cancelled, on-hold. Priority values: low, medium, high, urgent.",
    supportedFilters: ["status", "priority", "clientId", "scheduledDate", "dateRange", "search"],
    examples: ["Show recent work orders", "Find high priority work orders", "List work orders with status in-progress"]
  },
  {
    name: "tasks",
    displayName: "Tasks",
    endpoint: "/api/tasks",
    method: "GET",
    permissions: { view: "tasks.view" },
    description: "Get tasks with filtering, search, and assignee information",
    supportedFilters: ["status", "priority", "assigneeId", "projectId", "workOrderId", "dueDate"],
    examples: ["Show my tasks", "Find overdue tasks", "Tasks assigned to John"]
  },
  {
    name: "personnel",
    displayName: "Personnel",
    endpoint: "/api/personnel",
    method: "GET",
    permissions: { view: "personnel.view" },
    description: "Get personnel/employee information and assignments",
    supportedFilters: ["role", "status", "skills"],
    examples: ["List all technicians", "Who is available today?"]
  },
  {
    name: "clients",
    displayName: "Clients",
    endpoint: "/api/clients",
    method: "GET",
    permissions: { view: "clients.view" },
    description: "Get client information and related work",
    supportedFilters: ["status", "type", "search"],
    examples: ["Show all clients", "Find clients in New York"]
  },
  {
    name: "projects",
    displayName: "Projects",
    endpoint: "/api/projects",
    method: "GET",
    permissions: { view: "projects.view" },
    description: "Get project information and progress",
    supportedFilters: ["status", "clientId", "dateRange"],
    examples: ["Active projects", "Projects for ACME Corp"]
  },
  {
    name: "reports",
    displayName: "Reports",
    endpoint: "/api/reports",
    method: "GET",
    permissions: { view: "reports.view" },
    description: "Get analytics and reporting data",
    supportedFilters: ["period", "type", "entityId"],
    examples: ["Monthly performance report", "Task completion analytics"]
  }
];

// Internal API caller is now imported from separate module

/**
 * Generate dynamic schema based on endpoint configuration
 */
function generateDynamicSchema(config: APIEndpointConfig): z.ZodSchema {
  const schemaFields: Record<string, z.ZodType> = {};

  // Add supported filters as optional fields
  if (config.supportedFilters) {
    config.supportedFilters.forEach(filter => {
      switch (filter) {
        case 'status':
        case 'priority':
        case 'type':
          schemaFields[filter] = z.string().optional();
          break;
        case 'clientId':
        case 'assigneeId':
        case 'projectId':
        case 'workOrderId':
        case 'entityId':
          schemaFields[filter] = z.string().optional();
          break;
        case 'dateRange':
          schemaFields.startDate = z.string().optional();
          schemaFields.endDate = z.string().optional();
          break;
        case 'dueDate':
          schemaFields.dueDate = z.string().optional();
          break;
        case 'search':
          schemaFields.search = z.string().optional();
          break;
        case 'period':
          schemaFields.period = z.enum(['today', 'week', 'month', 'quarter', 'year']).optional();
          break;
      }
    });
  }

  // Common fields for all endpoints
  schemaFields.limit = z.number().optional();
  schemaFields.offset = z.number().optional();

  return z.object(schemaFields);
}

/**
 * Generate a single API tool for an endpoint
 */
function generateAPITool(config: APIEndpointConfig): ToolDef {
  return {
    name: `get_${config.name}`,
    description: `${config.description}. Examples: ${config.examples?.join(', ') || 'N/A'}`,
    schema: generateDynamicSchema(config),
    handler: async (args, ctx) => {
      try {
        // Check permissions
        const userPermissions = await PermissionService.getUserPermissions(
          ctx.userId,
          ctx.tenantId
        );

        if (!userPermissions) {
          throw new Error("Unable to retrieve user permissions");
        }

        const hasPermission = await PermissionService.hasPermissionAsync(
          ctx.userId,
          config.permissions.view,
          ctx.tenantId
        );

        if (!hasPermission.hasPermission) {
          throw new Error(`Insufficient permissions to access ${config.displayName}`);
        }

        // Call the actual API endpoint
        return await callInternalAPI(
          config.endpoint,
          config.method,
          args as Record<string, any>,
          ctx
        );
      } catch (error: any) {
        console.error(`[API Tool] ${config.name} error:`, error);
        throw new Error(`Failed to get ${config.displayName}: ${error.message}`);
      }
    }
  };
}

/**
 * Generate user lookup tool for resolving IDs to names
 */
function generateUserLookupTool(): ToolDef {
  return {
    name: "lookup_user_names",
    description: "Look up user names for any user IDs you encounter in data. Use this to convert technical IDs to human-readable names.",
    schema: z.object({
      userIds: z.array(z.string()).describe("Array of user IDs to look up")
    }),
    handler: async (args, ctx) => {
      try {
        const { userIds } = args as { userIds: string[] };

        if (!userIds || userIds.length === 0) {
          return { content: JSON.stringify({ users: [] }) };
        }

        console.log(`[User Lookup Tool] Looking up ${userIds.length} user IDs:`, userIds);

        // Import User model dynamically to avoid circular imports
        const { User } = await import("../../models");

        const users = await User.find(
          { _id: { $in: userIds }, tenantId: ctx.tenantId },
          { firstName: 1, lastName: 1, email: 1, _id: 1 }
        ).lean();

        const userMap = users.reduce((acc: any, user: any) => {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unknown User';
          acc[user._id.toString()] = fullName;
          return acc;
        }, {});

        console.log(`[User Lookup Tool] Found ${Object.keys(userMap).length} users:`, userMap);

        return {
          content: JSON.stringify({
            userMap,
            instructions: "Replace any user IDs in your response with these names"
          })
        };
      } catch (error: any) {
        console.error(`[User Lookup Tool] Error:`, error);
        return {
          content: JSON.stringify({
            userMap: {},
            error: `Failed to lookup users: ${error.message}`
          })
        };
      }
    }
  };
}

/**
 * Generate API schema inspection tool
 */
function generateSchemaInspectionTool(): ToolDef {
  return {
    name: "inspect_api_schema",
    description: "Get detailed information about API endpoint schemas, available filters, valid values, and parameter formats. Use this when you need to understand what parameters are available for a specific API.",
    schema: z.object({
      endpoint: z.enum(['workOrders', 'tasks', 'personnel', 'clients', 'projects', 'kanban']).describe("The API endpoint to inspect")
    }),
    handler: async (args, ctx) => {
      try {
        const { endpoint } = args as { endpoint: string };

        const schemaInfo: Record<string, any> = {
          workOrders: {
            availableFilters: {
              status: {
                type: "string",
                validValues: ["created", "assigned", "in-progress", "completed", "cancelled", "on-hold"],
                description: "Filter by work order status"
              },
              priority: {
                type: "string",
                validValues: ["low", "medium", "high", "urgent"],
                description: "Filter by priority level"
              },
              clientId: {
                type: "string",
                description: "Filter by specific client ID"
              },
              scheduledDate: {
                type: "date",
                format: "YYYY-MM-DD",
                description: "Filter by scheduled date"
              },
              search: {
                type: "string",
                description: "Search in title and details"
              }
            },
            commonParameters: {
              limit: { type: "number", default: 50, description: "Maximum number of results" },
              offset: { type: "number", default: 0, description: "Number of results to skip" }
            }
          },
          tasks: {
            availableFilters: {
              priority: {
                type: "string",
                validValues: ["low", "medium", "high", "urgent"],
                description: "Filter by task priority"
              },
              columnId: {
                type: "string",
                description: "Filter by kanban column (status)"
              },
              assignees: {
                type: "array",
                description: "Filter by assigned personnel IDs"
              },
              projectId: {
                type: "string",
                description: "Filter by project ID"
              },
              workOrderId: {
                type: "string",
                description: "Filter by work order ID"
              },
              dueDate: {
                type: "date",
                format: "YYYY-MM-DD",
                description: "Filter by due date"
              }
            }
          },
          personnel: {
            availableFilters: {
              status: {
                type: "string",
                validValues: ["active", "inactive"],
                description: "Filter by personnel status"
              },
              role: {
                type: "string",
                description: "Filter by role/position"
              }
            }
          },
          clients: {
            availableFilters: {
              status: {
                type: "string",
                validValues: ["active", "inactive"],
                description: "Filter by client status"
              },
              search: {
                type: "string",
                description: "Search in name and company"
              }
            }
          },
          projects: {
            availableFilters: {
              status: {
                type: "string",
                description: "Filter by project status"
              },
              clientId: {
                type: "string",
                description: "Filter by client ID"
              }
            }
          },
          kanban: {
            availableFilters: {
              clientId: {
                type: "string",
                description: "Filter kanban board by specific client"
              }
            }
          }
        };

        const info = schemaInfo[endpoint];
        if (!info) {
          throw new Error(`Schema information not available for endpoint: ${endpoint}`);
        }

        return {
          content: JSON.stringify({
            endpoint,
            schema: info,
            usage: `Use these exact parameter names and values when calling the get_${endpoint} tool`,
            examples: {
              workOrders: {
                "High priority work orders": { priority: "high" },
                "In-progress work orders": { status: "in-progress" },
                "Work orders for specific client": { clientId: "client_id_here" }
              },
              tasks: {
                "High priority tasks": { priority: "high" },
                "Tasks assigned to someone": { assignees: ["personnel_id"] },
                "Overdue tasks": { dueDate: "2024-01-01" }
              }
            }[endpoint] || {}
          })
        };
      } catch (error: any) {
        console.error(`[Schema Inspection Tool] Error:`, error);
        throw new Error(`Schema inspection failed: ${error.message}`);
      }
    }
  };
}

/**
 * Generate cross-entity analytics tool
 */
function generateAnalyticsTool(): ToolDef {
  return {
    name: "analyze_data",
    description: "Perform analytics and generate insights across multiple data sources (work orders, tasks, personnel, etc.). Can combine data from any endpoints the user has access to.",
    schema: z.object({
      entities: z.array(z.string()).optional().describe("Entities to include in analysis (workOrders, tasks, personnel, clients, etc.)"),
      analysisType: z.enum(['performance', 'utilization', 'trends', 'comparison', 'summary']).optional(),
      period: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional(),
      groupBy: z.string().optional().describe("Group results by field (status, priority, assignee, client, etc.)"),
      metrics: z.array(z.string()).optional().describe("Specific metrics to calculate (completion_rate, avg_time, workload, etc.)")
    }),
    handler: async (args, ctx) => {
      try {
        const { entities = ['workOrders', 'tasks'], analysisType = 'summary' } = args as any;

        console.log(`[Analytics Tool] Starting ${analysisType} analysis for:`, entities);

        // Check permissions for each requested entity
        const userPermissions = await PermissionService.getUserPermissions(ctx.userId, ctx.tenantId);
        if (!userPermissions) {
          throw new Error("Unable to retrieve user permissions");
        }

        const accessibleData: Record<string, any> = {};

        // Gather data from each accessible entity
        for (const entity of entities) {
          const config = API_ENDPOINTS.find(ep => ep.name === entity);
          if (!config) continue;

          const hasPermission = await PermissionService.hasPermissionAsync(
            ctx.userId,
            config.permissions.view,
            ctx.tenantId
          );

          if (hasPermission.hasPermission) {
            try {
              accessibleData[entity] = await callInternalAPI(
                config.endpoint,
                config.method,
                { limit: 100 }, // Get reasonable sample for analysis
                ctx
              );
            } catch (error) {
              console.warn(`[Analytics Tool] Could not fetch ${entity}:`, error);
            }
          }
        }

        return {
          content: JSON.stringify({
            analysisType,
            entitiesAnalyzed: Object.keys(accessibleData),
            summary: `Analytics performed on ${Object.keys(accessibleData).length} data sources`,
            timestamp: new Date().toISOString(),
            rawData: accessibleData
          })
        };
      } catch (error: any) {
        console.error(`[Analytics Tool] Error:`, error);
        throw new Error(`Analytics failed: ${error.message}`);
      }
    }
  };
}

/**
 * Generate all dynamic tools based on user permissions
 */
export async function generateDynamicAPITools(
  userId: string,
  tenantId: string
): Promise<ToolDef[]> {
  const tools: ToolDef[] = [];

  try {
    const userPermissions = await PermissionService.getUserPermissions(userId, tenantId);
    if (!userPermissions) {
      console.warn("[Dynamic API Tools] No user permissions found");
      return [];
    }

    console.log("[Dynamic API Tools] Generating tools for user permissions:", {
      userId,
      permissions: userPermissions.permissions
    });

    // Generate API tools for each endpoint the user has access to
    for (const config of API_ENDPOINTS) {
      const hasPermission = await PermissionService.hasPermissionAsync(
        userId,
        config.permissions.view,
        tenantId
      );

      if (hasPermission.hasPermission) {
        tools.push(generateAPITool(config));
        console.log(`[Dynamic API Tools] Added ${config.name} tool`);
      } else {
        console.log(`[Dynamic API Tools] Skipped ${config.name} tool (no permission)`);
      }
    }

    // Always add utility tools
    tools.push(generateAnalyticsTool());
    tools.push(generateSchemaInspectionTool());
    tools.push(generateUserLookupTool());
    console.log("[Dynamic API Tools] Added analytics, schema inspection, and user lookup tools");

    console.log(`[Dynamic API Tools] Generated ${tools.length} total tools`);
    return tools;
  } catch (error) {
    console.error("[Dynamic API Tools] Error generating tools:", error);
    return [];
  }
}