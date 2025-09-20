import { z } from "zod";
import type { ToolDef } from "../../types/ai";
import { DataValidationService } from "./data-validation";

/**
 * Tool to validate data references before creating/updating records
 */
export function generateValidationTool(): ToolDef {
  return {
    name: "validate_references",
    description:
      "Validate data references using symbols before creating or updating records. Use this to confirm personnel, work orders, tasks, projects, and clients exist before database operations.",
    schema: z.object({
      text: z
        .string()
        .describe(
          "Text containing references to validate (e.g., 'Create task for @John Doe in #WO-001')",
        ),
      operation: z
        .enum(["create", "update", "check"])
        .default("check")
        .describe("Type of operation being performed"),
    }),
    handler: async (args, ctx) => {
      try {
        const parsedArgs = args as any;
        const validationResult = await DataValidationService.validateReferences(
          parsedArgs.text,
          {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
          },
        );

        if (validationResult.isValid) {
          return {
            content: JSON.stringify({
              success: true,
              message: "All references validated successfully",
              validatedData: validationResult.validatedData,
              symbols: {
                "@": "Personnel (e.g., @John Doe, @EMP001)",
                "#": "Work Orders (e.g., #WO-001, #Garden Care)",
                "/": "Tasks (e.g., /Plant Watering, /Maintenance)",
                "+": "Projects (e.g., +Garden Project, +Maintenance)",
                "&": "Clients (e.g., &Acme Corp, &John Smith)",
              },
            }),
          };
        } else {
          return {
            content: JSON.stringify({
              success: false,
              message: "Some references could not be validated",
              errors: validationResult.errors,
              suggestions: validationResult.suggestions,
              validatedData: validationResult.validatedData,
              symbols: {
                "@": "Personnel (e.g., @John Doe, @EMP001)",
                "#": "Work Orders (e.g., #WO-001, #Garden Care)",
                "/": "Tasks (e.g., /Plant Watering, /Maintenance)",
                "+": "Projects (e.g., +Garden Project, +Maintenance)",
                "&": "Clients (e.g., &Acme Corp, &John Smith)",
              },
            }),
          };
        }
      } catch (error: any) {
        console.error(`[AI Tool] Validation error:`, error);
        throw new Error(`Failed to validate references: ${error.message}`);
      }
    },
  };
}

/**
 * Tool to get autocomplete suggestions for symbols
 */
export function generateAutocompleteTool(): ToolDef {
  return {
    name: "get_autocomplete",
    description:
      "Get autocomplete suggestions for symbols as user types. Use this to provide real-time suggestions when users start typing symbols.",
    schema: z.object({
      symbol: z
        .enum(["@", "#", "/", "+", "&"])
        .describe("The symbol being typed"),
      query: z
        .string()
        .describe("The partial text being typed after the symbol"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .describe("Maximum number of suggestions to return"),
    }),
    handler: async (args, ctx) => {
      try {
        const parsedArgs = args as any;
        const { Personnel, WorkOrder, Task, Project, Client } = await import(
          "../../models"
        );

        let results: any[] = [];
        let suggestions: string[] = [];

        switch (parsedArgs.symbol) {
          case "@":
            // If query is empty or very short, show recent personnel
            if (!parsedArgs.query || parsedArgs.query.length <= 1) {
              results = await Personnel.find({
                tenantId: ctx.tenantId,
                isActive: true,
              })
                .sort({ createdAt: -1 })
                .limit(parsedArgs.limit)
                .lean();
            } else {
              // Search by employeeId (which now contains the full name)
              results = await Personnel.find({
                tenantId: ctx.tenantId,
                employeeId: { $regex: new RegExp(parsedArgs.query, "i") },
              })
                .limit(parsedArgs.limit)
                .lean();
            }
            suggestions = results.map((p) => `@${p.employeeId}`);
            break;

          case "#":
            // If query is empty or very short, show recent work orders
            if (!parsedArgs.query || parsedArgs.query.length <= 1) {
              results = await WorkOrder.find({
                tenantId: ctx.tenantId,
              })
                .sort({ createdAt: -1 })
                .limit(parsedArgs.limit)
                .lean();
            } else {
              // Search by work order number or title
              results = await WorkOrder.find({
                tenantId: ctx.tenantId,
                $or: [
                  {
                    workOrderNumber: {
                      $regex: new RegExp(parsedArgs.query, "i"),
                    },
                  },
                  { title: { $regex: new RegExp(parsedArgs.query, "i") } },
                ],
              })
                .limit(parsedArgs.limit)
                .lean();
            }
            suggestions = results.map((wo) => `#${wo.title}`);
            break;

          case "/":
            // If query is empty or very short, show recent tasks
            if (!parsedArgs.query || parsedArgs.query.length <= 1) {
              results = await Task.find({
                tenantId: ctx.tenantId,
              })
                .sort({ createdAt: -1 })
                .limit(parsedArgs.limit)
                .lean();
            } else {
              // Search by task title
              results = await Task.find({
                tenantId: ctx.tenantId,
                title: { $regex: new RegExp(parsedArgs.query, "i") },
              })
                .limit(parsedArgs.limit)
                .lean();
            }
            suggestions = results.map((t) => `/${t.title}`);
            break;

          case "+":
            // If query is empty or very short, show recent projects
            if (!parsedArgs.query || parsedArgs.query.length <= 1) {
              results = await Project.find({
                tenantId: ctx.tenantId,
              })
                .sort({ createdAt: -1 })
                .limit(parsedArgs.limit)
                .lean();
            } else {
              // Search by project title
              results = await Project.find({
                tenantId: ctx.tenantId,
                title: { $regex: new RegExp(parsedArgs.query, "i") },
              })
                .limit(parsedArgs.limit)
                .lean();
            }
            suggestions = results.map((p) => `+${p.title}`);
            break;

          case "&":
            // If query is empty or very short, show recent clients
            if (!parsedArgs.query || parsedArgs.query.length <= 1) {
              results = await Client.find({
                tenantId: ctx.tenantId,
              })
                .sort({ createdAt: -1 })
                .limit(parsedArgs.limit)
                .lean();
            } else {
              // Search by client name or company
              results = await Client.find({
                tenantId: ctx.tenantId,
                $or: [
                  { name: { $regex: new RegExp(parsedArgs.query, "i") } },
                  { company: { $regex: new RegExp(parsedArgs.query, "i") } },
                ],
              })
                .limit(parsedArgs.limit)
                .lean();
            }
            suggestions = results.map((c) => `&${c.name} (${c.company})`);
            break;
        }

        return {
          content: JSON.stringify({
            success: true,
            symbol: parsedArgs.symbol,
            query: parsedArgs.query,
            suggestions: results, // Return the full database results with _id
            count: results.length,
            message: `Found ${results.length} suggestions for ${parsedArgs.symbol}${parsedArgs.query}`,
          }),
        };
      } catch (error: any) {
        console.error(`[AI Tool] Autocomplete error:`, error);
        throw new Error(
          `Failed to get autocomplete suggestions: ${error.message}`,
        );
      }
    },
  };
}

/**
 * Tool to get available data for reference
 */
export function generateDataLookupTool(): ToolDef {
  return {
    name: "lookup_data",
    description:
      "Look up available personnel, work orders, tasks, projects, and clients to help with reference validation.",
    schema: z.object({
      type: z
        .enum(["personnel", "workOrders", "tasks", "projects", "clients"])
        .describe("Type of data to look up"),
      search: z.string().optional().describe("Search term to filter results"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe("Maximum number of results to return"),
    }),
    handler: async (args, ctx) => {
      try {
        const parsedArgs = args as any;
        const { Personnel, WorkOrder, Task, Project, Client } = await import(
          "../../models"
        );

        let results: any[] = [];
        let symbol = "";

        switch (parsedArgs.type) {
          case "personnel":
            symbol = "@";
            results = await Personnel.find({
              tenantId: ctx.tenantId,
              ...(parsedArgs.search && {
                $or: [
                  { firstName: { $regex: new RegExp(parsedArgs.search, "i") } },
                  { lastName: { $regex: new RegExp(parsedArgs.search, "i") } },
                  {
                    employeeId: { $regex: new RegExp(parsedArgs.search, "i") },
                  },
                ],
              }),
            })
              .limit(parsedArgs.limit)
              .lean();
            break;

          case "workOrders":
            symbol = "#";
            results = await WorkOrder.find({
              tenantId: ctx.tenantId,
              ...(parsedArgs.search && {
                $or: [
                  {
                    workOrderNumber: {
                      $regex: new RegExp(parsedArgs.search, "i"),
                    },
                  },
                  { title: { $regex: new RegExp(parsedArgs.search, "i") } },
                ],
              }),
            })
              .populate("clientId", "name company")
              .limit(parsedArgs.limit)
              .lean();
            break;

          case "tasks":
            symbol = "/";
            results = await Task.find({
              tenantId: ctx.tenantId,
              ...(parsedArgs.search && {
                title: { $regex: new RegExp(parsedArgs.search, "i") },
              }),
            })
              .populate("projectId", "title")
              .populate("clientId", "name company")
              .limit(parsedArgs.limit)
              .lean();
            break;

          case "projects":
            symbol = "+";
            results = await Project.find({
              tenantId: ctx.tenantId,
              ...(parsedArgs.search && {
                title: { $regex: new RegExp(parsedArgs.search, "i") },
              }),
            })
              .populate("clientId", "name company")
              .limit(parsedArgs.limit)
              .lean();
            break;

          case "clients":
            symbol = "&";
            results = await Client.find({
              tenantId: ctx.tenantId,
              ...(parsedArgs.search && {
                $or: [
                  { name: { $regex: new RegExp(parsedArgs.search, "i") } },
                  { company: { $regex: new RegExp(parsedArgs.search, "i") } },
                ],
              }),
            })
              .limit(parsedArgs.limit)
              .lean();
            break;
        }

        // Format results with symbols
        const formattedResults = results.map((item) => {
          switch (parsedArgs.type) {
            case "personnel":
              return `${symbol}${item.firstName} ${item.lastName} (${item.employeeId}) - ID: ${item._id}`;
            case "workOrders":
              return `${symbol}${item.workOrderNumber} - ${item.title} - ID: ${item._id}`;
            case "tasks":
              return `${symbol}${item.title} - ID: ${item._id}`;
            case "projects":
              return `${symbol}${item.title} - ID: ${item._id}`;
            case "clients":
              return `${symbol}${item.name} (${item.company}) - ID: ${item._id}`;
            default:
              return item;
          }
        });

        return {
          content: JSON.stringify({
            success: true,
            type: parsedArgs.type,
            symbol,
            results: formattedResults,
            count: results.length,
            message: `Found ${results.length} ${parsedArgs.type}${parsedArgs.search ? ` matching "${parsedArgs.search}"` : ""}`,
          }),
        };
      } catch (error: any) {
        console.error(`[AI Tool] Data lookup error:`, error);
        throw new Error(`Failed to lookup data: ${error.message}`);
      }
    },
  };
}
