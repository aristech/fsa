import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that we want to link the colors
winston.addColors(logColors);

// Custom format for console output with emojis
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const emoji = getEmojiForLevel(info.level);
    const requestId = info.requestId ? `[${info.requestId}]` : '';
    return `${info.timestamp} ${emoji} ${info.level}: ${requestId} ${info.message}`;
  })
);

// Format for file output (JSON structured)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Get emoji for log level
function getEmojiForLevel(level: string): string {
  const cleanLevel = level.replace(/\x1b\[\d+m/g, ''); // Remove color codes
  switch (cleanLevel) {
    case 'error': return '❌';
    case 'warn': return '⚠️';
    case 'info': return 'ℹ️';
    case 'http': return '🌐';
    case 'debug': return '🐛';
    default: return '📝';
  }
}

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: level(),
    format: consoleFormat,
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Separate file for SMS/API logs
  new winston.transports.File({
    filename: path.join(logsDir, 'sms-api.log'),
    level: 'info',
    format: fileFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels: logLevels,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
  exitOnError: false,
});

// Create specialized loggers for different services
export const smsLogger = logger.child({
  service: 'sms',
  component: 'messaging'
});

export const yubotoLogger = logger.child({
  service: 'yuboto',
  component: 'api'
});

export const apiLogger = logger.child({
  service: 'api',
  component: 'routes'
});

export default logger;

// Export a function to create request-specific loggers
export function createRequestLogger(requestId: string, service?: string) {
  return logger.child({
    requestId,
    service: service || 'general'
  });
}

// Helper functions for common logging patterns
export const logApiRequest = (requestId: string, method: string, url: string, body?: any) => {
  apiLogger.info('API Request', {
    requestId,
    method,
    url,
    bodySize: body ? JSON.stringify(body).length : 0,
    timestamp: new Date().toISOString()
  });
};

export const logApiResponse = (requestId: string, statusCode: number, responseTime: number, error?: string) => {
  const level = statusCode >= 400 ? 'error' : 'info';
  apiLogger[level]('API Response', {
    requestId,
    statusCode,
    responseTime,
    error,
    timestamp: new Date().toISOString()
  });
};

export const logSmsRequest = (requestId: string, phoneNumbers: string[], messageLength: number, provider: string) => {
  smsLogger.info('SMS Request', {
    requestId,
    recipientCount: phoneNumbers.length,
    phoneNumbers: phoneNumbers.map(p => p.replace(/\d(?=\d{4})/g, '*')), // Mask phone numbers
    messageLength,
    provider,
    timestamp: new Date().toISOString()
  });
};

export const logSmsResponse = (requestId: string, success: boolean, messageIds: string[], error?: string) => {
  const level = success ? 'info' : 'error';
  smsLogger[level]('SMS Response', {
    requestId,
    success,
    messageCount: messageIds.length,
    messageIds,
    error,
    timestamp: new Date().toISOString()
  });
};

export const logYubotoApiCall = (requestId: string, endpoint: string, payload: any, method: string = 'POST') => {
  yubotoLogger.info('Yuboto API Call', {
    requestId,
    method,
    endpoint,
    payloadSize: JSON.stringify(payload).length,
    timestamp: new Date().toISOString()
  });
};

export const logYubotoApiResponse = (requestId: string, statusCode: number, data: any, error?: string) => {
  const level = error || statusCode >= 400 ? 'error' : 'info';
  yubotoLogger[level]('Yuboto API Response', {
    requestId,
    statusCode,
    hasResults: data?.results ? data.results.length > 0 : false,
    resultCount: data?.results?.length || 0,
    errorCode: data?.ErrorCode,
    errorMessage: data?.ErrorMessage,
    error,
    timestamp: new Date().toISOString()
  });
};