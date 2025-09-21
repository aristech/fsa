import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../types";
import { WorkOrder, Task, Personnel, Client, Project } from "../../models";
import { PermissionService } from "../permission-service";
import { getKanbanData } from "../../controllers/kanban";

/**
 * Internal API Caller
 * Calls actual API endpoints from AI tools with proper authentication context
 * Since most routes have inline logic, we implement the core functionality here
 */

/**
 * Create a mock FastifyRequest with proper authentication context
 */
function createMockRequest(
  method: string,
  url: string,
  query: Record<string, any>,
  ctx: { userId: string; tenantId: string }
): AuthenticatedRequest {
  // Create a minimal request object that matches what the controllers expect
  const mockRequest = {
    method,
    url,
    query,
    body: {},
    params: {},
    headers: {},
    context: {
      user: { id: ctx.userId },
      tenant: { _id: { toString: () => ctx.tenantId } }
    }
  } as unknown as AuthenticatedRequest;

  return mockRequest;
}

/**
 * Create a mock FastifyReply that captures the response
 */
function createMockReply(): { reply: FastifyReply; response: Promise<any> } {
  let resolveResponse: (value: any) => void;
  let rejectResponse: (error: any) => void;

  const response = new Promise((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });

  const mockReply = {
    code: (statusCode: number) => mockReply,
    send: (data: any) => {
      if (data.success === false) {
        rejectResponse(new Error(data.error || 'API call failed'));
      } else {
        resolveResponse(data);
      }
      return mockReply;
    },
    header: () => mockReply,
  } as unknown as FastifyReply;

  return { reply: mockReply, response };
}

/**
 * Route handlers - implement the core logic from routes
 */
const ROUTE_HANDLERS: Record<string, Function> = {
  '/api/kanban': getKanbanData,
  '/api/work-orders': handleWorkOrders,
  '/api/tasks': handleTasks,
  '/api/personnel': handlePersonnel,
  '/api/clients': handleClients,
  '/api/projects': handleProjects,
};

// Simplified work orders handler
async function handleWorkOrders(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const { tenant, user } = request.context!;
    const query = request.query as any;

    // Build basic filter
    const filter: any = { tenantId: tenant._id.toString() };

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.clientId) filter.clientId = query.clientId;

    console.log('[Internal API] Work orders filter:', filter);

    const workOrders = await WorkOrder.find(filter)
      .populate('clientId', 'name company')
      .populate('personnelIds', 'employeeId userId')
      .populate({
        path: 'personnelIds',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      })
      .sort({ createdAt: -1 })
      .limit(query.limit || 50)
      .lean();

    console.log(`[Internal API] Found ${workOrders.length} work orders`);
    if (workOrders.length > 0) {
      console.log('[Internal API] Sample work order:', {
        id: workOrders[0]._id,
        title: workOrders[0].title,
        priority: workOrders[0].priority,
        status: workOrders[0].status
      });
    }

    // Also log all unique priority values in the database for debugging
    const allWorkOrders = await WorkOrder.find({ tenantId: tenant._id.toString() }, 'priority').lean();
    const uniquePriorities = [...new Set(allWorkOrders.map(wo => wo.priority).filter(Boolean))];
    console.log('[Internal API] All unique priorities in DB:', uniquePriorities);

    return reply.send({
      success: true,
      data: workOrders
    });
  } catch (error) {
    console.error('Work orders error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
}

// Simplified tasks handler
async function handleTasks(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const { tenant, user } = request.context!;
    const query = request.query as any;

    const filter: any = { tenantId: tenant._id.toString() };

    if (query.priority) filter.priority = query.priority;
    if (query.assigneeId) filter.assignees = { $in: [query.assigneeId] };
    if (query.projectId) filter.projectId = query.projectId;
    if (query.workOrderId) filter.workOrderId = query.workOrderId;

    const tasks = await Task.find(filter)
      .populate({
        path: 'assignees',
        select: 'employeeId userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      })
      .populate('projectId', 'title')
      .populate('workOrderId', 'title workOrderNumber')
      .populate('clientId', 'name company')
      .sort({ createdAt: -1 })
      .limit(query.limit || 50)
      .lean();

    return reply.send({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Tasks error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
}

// Simplified personnel handler
async function handlePersonnel(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const { tenant } = request.context!;
    const query = request.query as any;

    const filter: any = { tenantId: tenant._id.toString() };

    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;

    const personnel = await Personnel.find(filter)
      .populate('userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .limit(query.limit || 50)
      .lean();

    return reply.send({
      success: true,
      data: personnel
    });
  } catch (error) {
    console.error('Personnel error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
}

// Simplified clients handler
async function handleClients(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const { tenant } = request.context!;
    const query = request.query as any;

    const filter: any = { tenantId: tenant._id.toString() };

    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { company: { $regex: query.search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit || 50)
      .lean();

    return reply.send({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Clients error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
}

// Simplified projects handler
async function handleProjects(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const { tenant } = request.context!;
    const query = request.query as any;

    const filter: any = { tenantId: tenant._id.toString() };

    if (query.status) filter.status = query.status;
    if (query.clientId) filter.clientId = query.clientId;

    const projects = await Project.find(filter)
      .populate('clientId', 'name company')
      .sort({ createdAt: -1 })
      .limit(query.limit || 50)
      .lean();

    return reply.send({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Projects error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
}

/**
 * Internal API caller that routes requests to the appropriate controllers
 */
export async function callInternalAPI(
  endpoint: string,
  method: string,
  params: Record<string, any>,
  ctx: { userId: string; tenantId: string }
): Promise<any> {
  try {
    console.log(`[Internal API] Calling ${method} ${endpoint}`, {
      params,
      userId: ctx.userId,
      tenantId: ctx.tenantId
    });

    // Find the handler for this endpoint
    const handler = ROUTE_HANDLERS[endpoint];
    if (!handler) {
      throw new Error(`No handler found for endpoint: ${endpoint}`);
    }

    // Create mock request and reply objects
    const mockRequest = createMockRequest(method, endpoint, params, ctx);
    const { reply: mockReply, response } = createMockReply();

    // Call the actual controller function
    await handler(mockRequest, mockReply);

    // Wait for the response
    const result = await response;

    console.log(`[Internal API] ${endpoint} completed successfully`);

    // Return the response data, extracting the actual content
    console.log(`[Internal API] Response from ${endpoint}:`, {
      success: result.success,
      dataLength: result.data ? result.data.length : 0,
      hasData: !!result.data
    });

    if (result.data) {
      return {
        content: JSON.stringify(result.data)
      };
    } else {
      return {
        content: JSON.stringify(result)
      };
    }
  } catch (error) {
    console.error(`[Internal API] Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Helper to check if an endpoint exists
 */
export function isValidEndpoint(endpoint: string): boolean {
  return endpoint in ROUTE_HANDLERS;
}

/**
 * Get all available endpoints
 */
export function getAvailableEndpoints(): string[] {
  return Object.keys(ROUTE_HANDLERS);
}