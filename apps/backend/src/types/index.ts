import { FastifyRequest, FastifyReply } from 'fastify';

// Request context interface
export interface RequestContext {
  user?: any;
  tenant?: any;
  client?: any;
  filters?: any;
}

// Extended Fastify request with context
export interface AuthenticatedRequest extends FastifyRequest {
  user: any;
  tenant: any;
  client?: any;
  context: RequestContext;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Filter parameters
export interface FilterParams {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
}
