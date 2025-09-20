import { Personnel, WorkOrder, Task, Project, Client } from "../../models";

export interface ValidationResult {
  isValid: boolean;
  data?: any;
  suggestions?: string[];
  error?: string;
}

export interface ValidationContext {
  tenantId: string;
  userId: string;
}

export class DataValidationService {
  /**
   * Validate personnel reference using @ symbol
   * @param reference - Personnel reference (e.g., "@John Doe", "@EMP001", "@507f1f77bcf86cd799439011")
   * @param context - Validation context
   */
  static async validatePersonnel(
    reference: string,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    try {
      // Remove @ symbol if present
      const cleanReference = reference.replace(/^@/, "");
      console.log(
        `[DataValidation] Validating personnel reference: "${reference}" -> "${cleanReference}"`,
      );

      // Check if it's already a valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(cleanReference)) {
        const personnel = await Personnel.findOne({
          _id: cleanReference,
          tenantId: context.tenantId,
        });

        if (personnel) {
          return {
            isValid: true,
            data: {
              id: personnel._id.toString(),
              name: `${personnel.firstName} ${personnel.lastName}`,
              employeeId: personnel.employeeId,
            },
          };
        } else {
          return {
            isValid: false,
            error: `Personnel with ID ${cleanReference} not found`,
          };
        }
      }

      // Search by employeeId (which now contains the full name)
      const personnel = await Personnel.findOne({
        tenantId: context.tenantId,
        employeeId: { $regex: new RegExp(cleanReference, "i") },
      })
        .populate("userId", "firstName lastName email")
        .lean();

      console.log(
        `[DataValidation] Found personnel for "${cleanReference}":`,
        personnel ? "YES" : "NO",
      );

      if (personnel) {
        return {
          isValid: true,
          data: {
            id: (personnel as any)._id.toString(),
            name: (personnel as any).employeeId, // employeeId now contains the full name
            employeeId: (personnel as any).employeeId,
          },
        };
      }

      // Get suggestions for similar names
      const suggestions = await this.getPersonnelSuggestions(
        cleanReference,
        context.tenantId,
      );

      return {
        isValid: false,
        error: `Personnel "${cleanReference}" not found`,
        suggestions,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Error validating personnel: ${error.message}`,
      };
    }
  }

  /**
   * Validate work order reference using # symbol
   * @param reference - Work order reference (e.g., "#WO-001", "#507f1f77bcf86cd799439011")
   * @param context - Validation context
   */
  static async validateWorkOrder(
    reference: string,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    try {
      // Remove # symbol if present
      const cleanReference = reference.replace(/^#/, "");

      // Check if it's already a valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(cleanReference)) {
        const workOrder = await WorkOrder.findOne({
          _id: cleanReference,
          tenantId: context.tenantId,
        }).populate("clientId", "name company");

        if (workOrder) {
          return {
            isValid: true,
            data: {
              id: workOrder._id.toString(),
              workOrderNumber: workOrder.workOrderNumber,
              title: workOrder.title,
              client: workOrder.clientId,
            },
          };
        } else {
          return {
            isValid: false,
            error: `Work order with ID ${cleanReference} not found`,
          };
        }
      }

      // Search by work order number or title
      const workOrder = await WorkOrder.findOne({
        tenantId: context.tenantId,
        $or: [
          { workOrderNumber: { $regex: new RegExp(cleanReference, "i") } },
          { title: { $regex: new RegExp(cleanReference, "i") } },
        ],
      }).populate("clientId", "name company");

      if (workOrder) {
        return {
          isValid: true,
          data: {
            id: workOrder._id.toString(),
            workOrderNumber: workOrder.workOrderNumber,
            title: workOrder.title,
            client: workOrder.clientId,
          },
        };
      }

      // Get suggestions for similar work orders
      const suggestions = await this.getWorkOrderSuggestions(
        cleanReference,
        context.tenantId,
      );

      return {
        isValid: false,
        error: `Work order "${cleanReference}" not found`,
        suggestions,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Error validating work order: ${error.message}`,
      };
    }
  }

  /**
   * Validate task reference using / symbol
   * @param reference - Task reference (e.g., "/Task-001", "/507f1f77bcf86cd799439011")
   * @param context - Validation context
   */
  static async validateTask(
    reference: string,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    try {
      // Remove / symbol if present
      const cleanReference = reference.replace(/^\//, "");

      // Check if it's already a valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(cleanReference)) {
        const task = await Task.findOne({
          _id: cleanReference,
          tenantId: context.tenantId,
        })
          .populate("projectId", "title")
          .populate("clientId", "name company");

        if (task) {
          return {
            isValid: true,
            data: {
              id: task._id.toString(),
              title: task.title,
              project: task.projectId,
              client: task.clientId,
            },
          };
        } else {
          return {
            isValid: false,
            error: `Task with ID ${cleanReference} not found`,
          };
        }
      }

      // Search by title
      const task = await Task.findOne({
        tenantId: context.tenantId,
        title: { $regex: new RegExp(cleanReference, "i") },
      })
        .populate("projectId", "title")
        .populate("clientId", "name company");

      if (task) {
        return {
          isValid: true,
          data: {
            id: task._id.toString(),
            title: task.title,
            project: task.projectId,
            client: task.clientId,
          },
        };
      }

      // Get suggestions for similar tasks
      const suggestions = await this.getTaskSuggestions(
        cleanReference,
        context.tenantId,
      );

      return {
        isValid: false,
        error: `Task "${cleanReference}" not found`,
        suggestions,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Error validating task: ${error.message}`,
      };
    }
  }

  /**
   * Validate project reference using + symbol
   * @param reference - Project reference (e.g., "+Project-001", "+507f1f77bcf86cd799439011")
   * @param context - Validation context
   */
  static async validateProject(
    reference: string,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    try {
      // Remove + symbol if present
      const cleanReference = reference.replace(/^\+/, "");

      // Check if it's already a valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(cleanReference)) {
        const project = await Project.findOne({
          _id: cleanReference,
          tenantId: context.tenantId,
        }).populate("clientId", "name company");

        if (project) {
          return {
            isValid: true,
            data: {
              id: project._id.toString(),
              title: project.title,
              client: project.clientId,
            },
          };
        } else {
          return {
            isValid: false,
            error: `Project with ID ${cleanReference} not found`,
          };
        }
      }

      // Search by title
      const project = await Project.findOne({
        tenantId: context.tenantId,
        title: { $regex: new RegExp(cleanReference, "i") },
      }).populate("clientId", "name company");

      if (project) {
        return {
          isValid: true,
          data: {
            id: project._id.toString(),
            title: project.title,
            client: project.clientId,
          },
        };
      }

      // Get suggestions for similar projects
      const suggestions = await this.getProjectSuggestions(
        cleanReference,
        context.tenantId,
      );

      return {
        isValid: false,
        error: `Project "${cleanReference}" not found`,
        suggestions,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Error validating project: ${error.message}`,
      };
    }
  }

  /**
   * Validate client reference using & symbol
   * @param reference - Client reference (e.g., "&Acme Corp", "&507f1f77bcf86cd799439011")
   * @param context - Validation context
   */
  static async validateClient(
    reference: string,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    try {
      // Remove & symbol if present
      const cleanReference = reference.replace(/^&/, "");

      // Check if it's already a valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(cleanReference)) {
        const client = await Client.findOne({
          _id: cleanReference,
          tenantId: context.tenantId,
        });

        if (client) {
          return {
            isValid: true,
            data: {
              id: client._id.toString(),
              name: client.name,
              company: client.company,
            },
          };
        } else {
          return {
            isValid: false,
            error: `Client with ID ${cleanReference} not found`,
          };
        }
      }

      // Search by name or company
      const client = await Client.findOne({
        tenantId: context.tenantId,
        $or: [
          { name: { $regex: new RegExp(cleanReference, "i") } },
          { company: { $regex: new RegExp(cleanReference, "i") } },
        ],
      });

      if (client) {
        return {
          isValid: true,
          data: {
            id: client._id.toString(),
            name: client.name,
            company: client.company,
          },
        };
      }

      // Get suggestions for similar clients
      const suggestions = await this.getClientSuggestions(
        cleanReference,
        context.tenantId,
      );

      return {
        isValid: false,
        error: `Client "${cleanReference}" not found`,
        suggestions,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Error validating client: ${error.message}`,
      };
    }
  }

  /**
   * Parse and validate all references in a text
   * @param text - Text containing references
   * @param context - Validation context
   */
  static async validateReferences(
    text: string,
    context: ValidationContext,
  ): Promise<{
    isValid: boolean;
    validatedData: any;
    errors: string[];
    suggestions: string[];
  }> {
    const validatedData: any = {};
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Extract all references with symbols, but ignore quoted ones
    // This regex matches symbols not inside quotes
    const personnelRefs = this.extractUnquotedSymbols(text, /@[^\s"']+/g) || [];
    const workOrderRefs = this.extractUnquotedSymbols(text, /#[^\s"']+/g) || [];
    const taskRefs = this.extractUnquotedSymbols(text, /\/[^\s"']+/g) || [];
    const projectRefs = this.extractUnquotedSymbols(text, /\+[^\s"']+/g) || [];
    const clientRefs = this.extractUnquotedSymbols(text, /&[^\s"']+/g) || [];

    // Validate personnel references
    for (const ref of personnelRefs) {
      const result = await this.validatePersonnel(ref, context);
      if (result.isValid) {
        validatedData.personnel = validatedData.personnel || [];
        validatedData.personnel.push(result.data);
      } else {
        errors.push(result.error || "Unknown error");
        if (result.suggestions) {
          suggestions.push(...result.suggestions);
        }
      }
    }

    // Validate work order references
    for (const ref of workOrderRefs) {
      const result = await this.validateWorkOrder(ref, context);
      if (result.isValid) {
        validatedData.workOrders = validatedData.workOrders || [];
        validatedData.workOrders.push(result.data);
      } else {
        errors.push(result.error || "Unknown error");
        if (result.suggestions) {
          suggestions.push(...result.suggestions);
        }
      }
    }

    // Validate task references
    for (const ref of taskRefs) {
      const result = await this.validateTask(ref, context);
      if (result.isValid) {
        validatedData.tasks = validatedData.tasks || [];
        validatedData.tasks.push(result.data);
      } else {
        errors.push(result.error || "Unknown error");
        if (result.suggestions) {
          suggestions.push(...result.suggestions);
        }
      }
    }

    // Validate project references
    for (const ref of projectRefs) {
      const result = await this.validateProject(ref, context);
      if (result.isValid) {
        validatedData.projects = validatedData.projects || [];
        validatedData.projects.push(result.data);
      } else {
        errors.push(result.error || "Unknown error");
        if (result.suggestions) {
          suggestions.push(...result.suggestions);
        }
      }
    }

    // Validate client references
    for (const ref of clientRefs) {
      const result = await this.validateClient(ref, context);
      if (result.isValid) {
        validatedData.clients = validatedData.clients || [];
        validatedData.clients.push(result.data);
      } else {
        errors.push(result.error || "Unknown error");
        if (result.suggestions) {
          suggestions.push(...result.suggestions);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      validatedData,
      errors,
      suggestions,
    };
  }

  // Helper methods for suggestions
  private static extractUnquotedSymbols(text: string, regex: RegExp): string[] {
    const matches: string[] = [];
    let match;

    // Reset regex lastIndex
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const symbol = match[0];
      const startIndex = match.index;

      // Check if this symbol is inside quotes
      const beforeSymbol = text.substring(0, startIndex);
      const afterSymbol = text.substring(startIndex + symbol.length);

      // Count unescaped quotes before the symbol
      const quotesBefore = (beforeSymbol.match(/[^\\]"/g) || []).length;
      const quotesAfter = (afterSymbol.match(/[^\\]"/g) || []).length;

      // If we have an odd number of quotes before, we're inside a quoted string
      if (quotesBefore % 2 === 0) {
        matches.push(symbol);
      }
    }

    return matches;
  }

  private static async getPersonnelSuggestions(
    query: string,
    tenantId: string,
  ): Promise<string[]> {
    const personnel = await Personnel.find({
      tenantId,
      employeeId: { $regex: new RegExp(query, "i") },
    })
      .limit(5)
      .lean();

    return personnel.map((p) => `@${p.employeeId}`);
  }

  private static async getWorkOrderSuggestions(
    query: string,
    tenantId: string,
  ): Promise<string[]> {
    const workOrders = await WorkOrder.find({
      tenantId,
      $or: [
        { workOrderNumber: { $regex: new RegExp(query, "i") } },
        { title: { $regex: new RegExp(query, "i") } },
      ],
    }).limit(5);

    return workOrders.map((wo) => `#${wo.workOrderNumber} - ${wo.title}`);
  }

  private static async getTaskSuggestions(
    query: string,
    tenantId: string,
  ): Promise<string[]> {
    const tasks = await Task.find({
      tenantId,
      title: { $regex: new RegExp(query, "i") },
    }).limit(5);

    return tasks.map((t) => `/${t.title}`);
  }

  private static async getProjectSuggestions(
    query: string,
    tenantId: string,
  ): Promise<string[]> {
    const projects = await Project.find({
      tenantId,
      title: { $regex: new RegExp(query, "i") },
    }).limit(5);

    return projects.map((p) => `+${p.title}`);
  }

  private static async getClientSuggestions(
    query: string,
    tenantId: string,
  ): Promise<string[]> {
    const clients = await Client.find({
      tenantId,
      $or: [
        { name: { $regex: new RegExp(query, "i") } },
        { company: { $regex: new RegExp(query, "i") } },
      ],
    }).limit(5);

    return clients.map((c) => `&${c.name} (${c.company})`);
  }
}
