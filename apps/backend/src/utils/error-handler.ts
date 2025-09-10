import { FastifyReply } from "fastify";
import { z } from "zod";

/**
 * Handle ZodError validation errors consistently
 */
export function handleZodError(error: unknown, reply: FastifyReply): boolean {
  if (error instanceof z.ZodError) {
    reply.status(400).send({
      success: false,
      message: "Validation error",
      errors: error.issues,
    });
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
    });
  }
}
