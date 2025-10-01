import winston from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

// Custom format for HTTP error logs
const httpErrorLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]`;

    // Add request ID if available
    if (meta.requestId) {
      logMessage += ` [${meta.requestId}]`;
    }

    // Add HTTP status if available
    if (meta.httpStatus) {
      logMessage += ` [${meta.httpStatus}]`;
    }

    logMessage += ` ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(meta).filter(key => !['requestId', 'httpStatus'].includes(key));
    if (metaKeys.length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }

    return logMessage;
  })
);

// Create HTTP error logger
export const httpErrorLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: httpErrorLogFormat,
  defaultMeta: { service: 'http-error-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        httpErrorLogFormat
      )
    }),

    // File transport for all HTTP errors
    new winston.transports.File({
      filename: path.join(logDir, 'http-errors.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),

    // Separate file for critical HTTP errors (5xx)
    new winston.transports.File({
      filename: path.join(logDir, 'http-errors-critical.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),

    // Separate file for client errors (4xx)
    new winston.transports.File({
      filename: path.join(logDir, 'http-errors-client.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'http-exceptions.log')
    })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'http-rejections.log')
    })
  ]
});

// HTTP Error types and interfaces
export interface HttpErrorContext {
  requestId?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  tenantId?: string;
  entity?: string;        // e.g., 'personnel', 'client', 'work-order'
  entityId?: string;      // e.g., specific record ID
  model?: string;         // e.g., 'Personnel', 'Client', 'WorkOrder'
  service?: string;       // e.g., 'PersonnelService', 'AuthService'
  operation?: string;     // e.g., 'create', 'update', 'delete', 'find'
  validationErrors?: any; // Validation error details
  dbError?: any;         // Database error details
  businessRule?: string; // Business rule that was violated
  resourceType?: string; // Type of resource being accessed
  permissions?: string[]; // Required permissions
  metadata?: any;        // Additional context
}

export interface HttpErrorDetails {
  statusCode: number;
  errorCode?: string;
  message: string;
  stack?: string;
  context: HttpErrorContext;
  timestamp: Date;
  duration?: number;
}

// HTTP Error logging utilities
export const HttpErrorLogUtils = {

  /**
   * Log HTTP errors with detailed context
   */
  logHttpError: (details: HttpErrorDetails) => {
    const logLevel = HttpErrorLogUtils.getLogLevel(details.statusCode);
    const errorType = HttpErrorLogUtils.getErrorType(details.statusCode);

    const logData = {
      requestId: details.context.requestId,
      httpStatus: details.statusCode,
      errorCode: details.errorCode,
      errorType,
      method: details.context.method,
      url: details.context.url,
      userAgent: details.context.userAgent,
      ip: details.context.ip,
      userId: details.context.userId,
      tenantId: details.context.tenantId,
      entity: details.context.entity,
      entityId: details.context.entityId,
      model: details.context.model,
      service: details.context.service,
      operation: details.context.operation,
      businessRule: details.context.businessRule,
      resourceType: details.context.resourceType,
      permissions: details.context.permissions,
      duration: details.duration ? `${details.duration}ms` : undefined,
      validationErrors: details.context.validationErrors,
      dbError: details.context.dbError,
      metadata: details.context.metadata,
      stack: details.stack
    };

    // Remove undefined values
    Object.keys(logData).forEach(key =>
      logData[key as keyof typeof logData] === undefined && delete logData[key as keyof typeof logData]
    );

    if (logLevel === 'error') {
      httpErrorLogger.error(details.message, logData);
    } else if (logLevel === 'warn') {
      httpErrorLogger.warn(details.message, logData);
    } else {
      httpErrorLogger.info(details.message, logData);
    }
  },

  /**
   * Log 400 Bad Request errors
   */
  log400Error: (context: HttpErrorContext, message: string = 'Bad Request', validationErrors?: any) => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 400,
      errorCode: 'BAD_REQUEST',
      message,
      context: {
        ...context,
        validationErrors
      },
      timestamp: new Date()
    });
  },

  /**
   * Log 401 Unauthorized errors
   */
  log401Error: (context: HttpErrorContext, message: string = 'Unauthorized Access') => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
      message,
      context,
      timestamp: new Date()
    });
  },

  /**
   * Log 403 Forbidden errors
   */
  log403Error: (context: HttpErrorContext, message: string = 'Access Forbidden', requiredPermissions?: string[]) => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 403,
      errorCode: 'FORBIDDEN',
      message,
      context: {
        ...context,
        permissions: requiredPermissions
      },
      timestamp: new Date()
    });
  },

  /**
   * Log 404 Not Found errors
   */
  log404Error: (context: HttpErrorContext, message: string = 'Resource Not Found') => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 404,
      errorCode: 'NOT_FOUND',
      message,
      context,
      timestamp: new Date()
    });
  },

  /**
   * Log 409 Conflict errors
   */
  log409Error: (context: HttpErrorContext, message: string = 'Resource Conflict', businessRule?: string) => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 409,
      errorCode: 'CONFLICT',
      message,
      context: {
        ...context,
        businessRule
      },
      timestamp: new Date()
    });
  },

  /**
   * Log 422 Unprocessable Entity errors
   */
  log422Error: (context: HttpErrorContext, message: string = 'Validation Failed', validationErrors?: any) => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 422,
      errorCode: 'VALIDATION_FAILED',
      message,
      context: {
        ...context,
        validationErrors
      },
      timestamp: new Date()
    });
  },

  /**
   * Log 429 Too Many Requests errors
   */
  log429Error: (context: HttpErrorContext, message: string = 'Rate Limit Exceeded') => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message,
      context,
      timestamp: new Date()
    });
  },

  /**
   * Log 500 Internal Server errors
   */
  log500Error: (context: HttpErrorContext, error: Error, message: string = 'Internal Server Error') => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
  },

  /**
   * Log 503 Service Unavailable errors
   */
  log503Error: (context: HttpErrorContext, message: string = 'Service Unavailable') => {
    HttpErrorLogUtils.logHttpError({
      statusCode: 503,
      errorCode: 'SERVICE_UNAVAILABLE',
      message,
      context,
      timestamp: new Date()
    });
  },

  /**
   * Log database errors
   */
  logDatabaseError: (context: HttpErrorContext, dbError: any, operation: string) => {
    let statusCode = 500;
    let message = 'Database Operation Failed';
    let errorCode = 'DATABASE_ERROR';

    // Handle specific database errors
    if (dbError.code === 11000 || dbError.code === 'E11000') {
      statusCode = 409;
      message = 'Duplicate Entry - Resource Already Exists';
      errorCode = 'DUPLICATE_ENTRY';
    } else if (dbError.name === 'ValidationError') {
      statusCode = 422;
      message = 'Database Validation Failed';
      errorCode = 'DB_VALIDATION_ERROR';
    } else if (dbError.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID Format';
      errorCode = 'INVALID_ID_FORMAT';
    }

    HttpErrorLogUtils.logHttpError({
      statusCode,
      errorCode,
      message: `${message}: ${dbError.message}`,
      context: {
        ...context,
        operation,
        dbError: {
          name: dbError.name,
          code: dbError.code,
          message: dbError.message,
          keyPattern: dbError.keyPattern,
          keyValue: dbError.keyValue
        }
      },
      timestamp: new Date()
    });
  },

  /**
   * Create error context from Fastify request
   */
  createContextFromRequest: (request: any, additionalContext?: Partial<HttpErrorContext>): HttpErrorContext => {
    const authContext = request.context || {};

    return {
      requestId: request.id || HttpErrorLogUtils.generateRequestId(),
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: authContext.user?.id || authContext.user?._id,
      tenantId: authContext.tenant?._id?.toString() || authContext.tenant?.id,
      ...additionalContext
    };
  },

  /**
   * Get appropriate log level based on HTTP status code
   */
  getLogLevel: (statusCode: number): 'info' | 'warn' | 'error' => {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  },

  /**
   * Get error type based on HTTP status code
   */
  getErrorType: (statusCode: number): string => {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'success';
  },

  /**
   * Generate unique request ID for tracking
   */
  generateRequestId: (): string => {
    return `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Log API endpoint performance and errors
   */
  logApiMetrics: (context: HttpErrorContext, statusCode: number, duration: number, responseSize?: number) => {
    const logData = {
      requestId: context.requestId,
      httpStatus: statusCode,
      method: context.method,
      url: context.url,
      userId: context.userId,
      tenantId: context.tenantId,
      entity: context.entity,
      service: context.service,
      operation: context.operation,
      duration: `${duration}ms`,
      responseSize: responseSize ? `${responseSize}B` : undefined,
      errorType: HttpErrorLogUtils.getErrorType(statusCode)
    };

    // Remove undefined values
    Object.keys(logData).forEach(key =>
      logData[key as keyof typeof logData] === undefined && delete logData[key as keyof typeof logData]
    );

    if (statusCode >= 400) {
      const logLevel = HttpErrorLogUtils.getLogLevel(statusCode);
      if (logLevel === 'error') {
        httpErrorLogger.error('API request completed with error', logData);
      } else {
        httpErrorLogger.warn('API request completed with client error', logData);
      }
    } else {
      httpErrorLogger.info('API request completed successfully', logData);
    }
  }
};