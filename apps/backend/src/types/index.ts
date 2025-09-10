import { FastifyRequest, FastifyReply } from 'fastify';

// Request context interface
export interface RequestContext {
  user?: any;
  tenant?: any;
  client?: any;
  filters?: any;
  safeQueries?: {
    findById: <T>(Model: any, id: string, populate?: string | string[]) => Promise<T | null>;
    find: <T>(Model: any, filter: any, options?: any) => Promise<T[]>;
    findByIdAndUpdate: <T>(Model: any, id: string, update: any, options?: any) => Promise<T | null>;
    findByIdAndDelete: <T>(Model: any, id: string) => Promise<T | null>;
    count: (Model: any, filter: any) => Promise<number>;
  };
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
