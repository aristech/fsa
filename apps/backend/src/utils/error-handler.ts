import { FastifyReply } from "fastify";
import { z } from "zod";
import { MessageKey, VALIDATION_MESSAGES, SERVER_MESSAGES } from "../constants/error-messages";

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  messageKey?: MessageKey;
  data?: T;
  errors?: any;
  meta?: any;
}

/**
 * Handle ZodError validation errors consistently with i18n support
 */
export function handleZodError(error: unknown, reply: FastifyReply): boolean {
  if (error instanceof z.ZodError) {
    reply.status(400).send({
      success: false,
      message: "Validation error",
      messageKey: VALIDATION_MESSAGES.GENERAL_ERROR,
      errors: error.issues,
    } as ApiResponse);
    return true;
  }
  return false;
}

/**
 * Handle general errors with consistent logging and response
 */
export function handleError(
  error: unknown,
  reply: FastifyReply,
  logMessage: string,
  logFn: (error: Error, message: string) => void
): void {
  if (!handleZodError(error, reply)) {
    logFn(error as Error, logMessage);
    reply.status(500).send({
      success: false,
      message: "Internal server error",
      messageKey: SERVER_MESSAGES.INTERNAL_ERROR,
    } as ApiResponse);
  }
}

/**
 * Send standardized error response with i18n key
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  messageKey: MessageKey,
  fallbackMessage: string,
  errors?: any,
  meta?: any
): void {
  reply.status(statusCode).send({
    success: false,
    message: fallbackMessage,
    messageKey,
    errors,
    meta,
  } as ApiResponse);
}

/**
 * Send standardized success response with i18n key
 */
export function sendSuccess<T = any>(
  reply: FastifyReply,
  statusCode: number = 200,
  messageKey: MessageKey,
  fallbackMessage: string,
  data?: T,
  meta?: any
): void {
  reply.status(statusCode).send({
    success: true,
    message: fallbackMessage,
    messageKey,
    data,
    meta,
  } as ApiResponse);
}

/**
 * Send standardized not found response
 */
export function sendNotFound(
  reply: FastifyReply,
  messageKey: MessageKey,
  fallbackMessage: string
): void {
  sendError(reply, 404, messageKey, fallbackMessage);
}

/**
 * Send standardized unauthorized response
 */
export function sendUnauthorized(
  reply: FastifyReply,
  messageKey: MessageKey,
  fallbackMessage: string
): void {
  sendError(reply, 401, messageKey, fallbackMessage);
}

/**
 * Send standardized forbidden response
 */
export function sendForbidden(
  reply: FastifyReply,
  messageKey: MessageKey,
  fallbackMessage: string
): void {
  sendError(reply, 403, messageKey, fallbackMessage);
}

/**
 * Send standardized bad request response
 */
export function sendBadRequest(
  reply: FastifyReply,
  messageKey: MessageKey,
  fallbackMessage: string,
  errors?: any
): void {
  sendError(reply, 400, messageKey, fallbackMessage, errors);
}
