import winston from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

// Custom format for email logs
const emailLogFormat = winston.format.combine(
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

    logMessage += ` ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(meta).filter(key => key !== 'requestId');
    if (metaKeys.length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }

    return logMessage;
  })
);

// Create email logger
export const emailLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: emailLogFormat,
  defaultMeta: { service: 'email-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        emailLogFormat
      )
    }),

    // File transport for all email logs
    new winston.transports.File({
      filename: path.join(logDir, 'email.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Separate file for email errors
    new winston.transports.File({
      filename: path.join(logDir, 'email-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'email-exceptions.log')
    })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'email-rejections.log')
    })
  ]
});

// Ensure logs directory exists
import fs from 'fs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Email-specific logging utilities
export const EmailLogUtils = {

  /**
   * Log email sending attempt
   */
  logEmailAttempt: (requestId: string, emailData: {
    to: string;
    subject: string;
    type: string;
  }) => {
    emailLogger.info('Email sending initiated', {
      requestId,
      recipient: emailData.to,
      subject: emailData.subject,
      emailType: emailData.type,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log successful email send
   */
  logEmailSuccess: (requestId: string, result: {
    messageId?: string;
    response?: string;
    duration: number;
    recipient: string;
    emailType: string;
  }) => {
    emailLogger.info('Email sent successfully', {
      requestId,
      messageId: result.messageId,
      recipient: result.recipient,
      emailType: result.emailType,
      duration: `${result.duration}ms`,
      smtpResponse: result.response
    });
  },

  /**
   * Log email sending failure
   */
  logEmailFailure: (requestId: string, error: {
    message: string;
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
    duration: number;
    recipient: string;
    emailType: string;
  }) => {
    emailLogger.error('Email sending failed', {
      requestId,
      error: error.message,
      errorCode: error.code,
      smtpCommand: error.command,
      smtpResponse: error.response,
      smtpResponseCode: error.responseCode,
      recipient: error.recipient,
      emailType: error.emailType,
      duration: `${error.duration}ms`
    });
  },

  /**
   * Log SMTP connection test
   */
  logSmtpConnectionTest: (requestId: string, success: boolean, duration: number, error?: any) => {
    if (success) {
      emailLogger.info('SMTP connection test successful', {
        requestId,
        duration: `${duration}ms`,
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT
      });
    } else {
      emailLogger.error('SMTP connection test failed', {
        requestId,
        duration: `${duration}ms`,
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        error: error?.message,
        errorCode: error?.code,
        smtpResponse: error?.response
      });
    }
  },

  /**
   * Log email configuration issues
   */
  logConfigurationError: (requestId: string, missingFields: string[]) => {
    emailLogger.error('Email configuration error', {
      requestId,
      missingFields,
      availableConfig: {
        host: !!process.env.SMTP_HOST,
        port: !!process.env.SMTP_PORT,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS,
        from: !!process.env.SMTP_FROM
      }
    });
  },

  /**
   * Log email validation errors
   */
  logValidationError: (requestId: string, validationType: string, details: any) => {
    emailLogger.warn('Email validation error', {
      requestId,
      validationType,
      details
    });
  },

  /**
   * Generate unique request ID for tracking
   */
  generateRequestId: (): string => {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};