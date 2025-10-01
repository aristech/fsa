import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { HttpErrorLogUtils, HttpErrorContext } from '../utils/http-error-logger';

// Enhanced error response interface
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Custom error class for enhanced error handling
export class HttpError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public context?: Partial<HttpErrorContext>;
  public details?: any;

  constructor(
    statusCode: number,
    message: string,
    errorCode?: string,
    context?: Partial<HttpErrorContext>,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.context = context;
    this.details = details;
    this.name = 'HttpError';
  }
}

// Middleware for logging API requests and responses
export function httpLoggingMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const requestId = request.id || HttpErrorLogUtils.generateRequestId();

    // Add request ID to request if not present
    if (!request.id) {
      (request as any).id = requestId;
    }

    // Hook into response to log completion
    reply.raw.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = reply.statusCode;

      const context = HttpErrorLogUtils.createContextFromRequest(request);

      // Log API metrics
      HttpErrorLogUtils.logApiMetrics(
        context,
        statusCode,
        duration
      );
    });
  };
}

// Global error handler middleware
export function globalErrorHandler() {
  return async (error: FastifyError | HttpError, request: FastifyRequest, reply: FastifyReply) => {
    const context = HttpErrorLogUtils.createContextFromRequest(request);
    const duration = Date.now() - (request as any).startTime || 0;

    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal Server Error';
    let details: any = undefined;

    // Handle different error types
    if (error instanceof HttpError) {
      statusCode = error.statusCode;
      errorCode = error.errorCode || 'HTTP_ERROR';
      message = error.message;
      details = error.details;

      // Merge error context with request context
      Object.assign(context, error.context);
    } else if (error.statusCode) {
      // Fastify validation errors
      statusCode = error.statusCode;
      if (error.validation) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Request validation failed';
        details = error.validation;

        HttpErrorLogUtils.log400Error(
          { ...context, service: 'FastifyValidation' },
          message,
          error.validation
        );
      } else {
        message = error.message || message;
        HttpErrorLogUtils.logHttpError({
          statusCode,
          errorCode,
          message,
          context,
          timestamp: new Date(),
          duration,
          stack: error.stack
        });
      }
    } else {
      // Unhandled server errors
      HttpErrorLogUtils.log500Error(context, error);
    }

    // Prepare error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: message,
      code: errorCode,
      timestamp: new Date().toISOString(),
      requestId: context.requestId
    };

    // Add details for development/debugging (exclude in production for security)
    if (process.env.NODE_ENV !== 'production' && details) {
      errorResponse.details = details;
    }

    // Send error response
    return reply.code(statusCode).send(errorResponse);
  };
}

// Utility functions for common error scenarios
export const ErrorHelpers = {

  /**
   * Create and throw a 400 Bad Request error
   */
  badRequest: (message: string, context?: Partial<HttpErrorContext>, details?: any): never => {
    throw new HttpError(400, message, 'BAD_REQUEST', context, details);
  },

  /**
   * Create and throw a 401 Unauthorized error
   */
  unauthorized: (message: string = 'Unauthorized', context?: Partial<HttpErrorContext>): never => {
    throw new HttpError(401, message, 'UNAUTHORIZED', context);
  },

  /**
   * Create and throw a 403 Forbidden error
   */
  forbidden: (message: string = 'Access Forbidden', context?: Partial<HttpErrorContext>): never => {
    throw new HttpError(403, message, 'FORBIDDEN', context);
  },

  /**
   * Create and throw a 404 Not Found error
   */
  notFound: (resource: string, id?: string, context?: Partial<HttpErrorContext>): never => {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    throw new HttpError(404, message, 'NOT_FOUND', {
      ...context,
      entity: resource.toLowerCase(),
      entityId: id
    });
  },

  /**
   * Create and throw a 409 Conflict error
   */
  conflict: (message: string, context?: Partial<HttpErrorContext>, businessRule?: string): never => {
    throw new HttpError(409, message, 'CONFLICT', {
      ...context,
      businessRule
    });
  },

  /**
   * Create and throw a 422 Validation error
   */
  validationFailed: (message: string, validationErrors: any, context?: Partial<HttpErrorContext>): never => {
    throw new HttpError(422, message, 'VALIDATION_FAILED', context, validationErrors);
  },

  /**
   * Create and throw a 429 Rate Limit error
   */
  rateLimitExceeded: (message: string = 'Rate limit exceeded', context?: Partial<HttpErrorContext>): never => {
    throw new HttpError(429, message, 'RATE_LIMIT_EXCEEDED', context);
  },

  /**
   * Create and throw a 500 Internal Server error
   */
  internalError: (message: string, originalError?: Error, context?: Partial<HttpErrorContext>): never => {
    const error = new HttpError(500, message, 'INTERNAL_SERVER_ERROR', context);
    if (originalError) {
      error.stack = originalError.stack;
    }
    throw error;
  },

  /**
   * Handle database errors and convert to appropriate HTTP errors
   */
  handleDatabaseError: (dbError: any, context?: Partial<HttpErrorContext>): never => {
    let statusCode = 500;
    let message = 'Database operation failed';
    let errorCode = 'DATABASE_ERROR';
    let details = undefined;

    // Handle specific MongoDB/Mongoose errors
    if (dbError.code === 11000 || dbError.code === 'E11000') {
      statusCode = 409;
      message = 'Resource already exists';
      errorCode = 'DUPLICATE_ENTRY';
      details = {
        duplicateKey: dbError.keyPattern,
        duplicateValue: dbError.keyValue
      };
    } else if (dbError.name === 'ValidationError') {
      statusCode = 422;
      message = 'Data validation failed';
      errorCode = 'DB_VALIDATION_ERROR';
      details = dbError.errors;
    } else if (dbError.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format provided';
      errorCode = 'INVALID_ID_FORMAT';
      details = {
        field: dbError.path,
        value: dbError.value,
        expectedType: dbError.kind
      };
    } else if (dbError.name === 'DocumentNotFoundError') {
      statusCode = 404;
      message = 'Requested resource not found';
      errorCode = 'NOT_FOUND';
    }

    // Log the database error
    HttpErrorLogUtils.logDatabaseError(
      context || {},
      dbError,
      context?.operation || 'unknown'
    );

    throw new HttpError(statusCode, message, errorCode, context, details);
  },

  /**
   * Handle Zod validation errors
   */
  handleZodError: (zodError: any, context?: Partial<HttpErrorContext>): never => {
    const validationErrors = zodError.issues?.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      received: issue.received
    })) || [];

    HttpErrorLogUtils.log422Error(
      { ...context, service: 'ZodValidation' },
      'Request validation failed',
      validationErrors
    );

    throw new HttpError(422, 'Request validation failed', 'VALIDATION_FAILED', context, validationErrors);
  },

  /**
   * Handle authorization errors based on permissions
   */
  handleAuthorizationError: (
    requiredPermissions: string[],
    userPermissions: string[],
    context?: Partial<HttpErrorContext>
  ): never => {
    const missingPermissions = requiredPermissions.filter(p => !userPermissions.includes(p));

    HttpErrorLogUtils.log403Error(
      { ...context, permissions: requiredPermissions },
      `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
      requiredPermissions
    );

    throw new HttpError(403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', {
      ...context,
      permissions: requiredPermissions
    }, {
      required: requiredPermissions,
      missing: missingPermissions
    });
  }
};