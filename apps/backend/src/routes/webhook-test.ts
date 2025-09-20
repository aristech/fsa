import { FastifyInstance } from "fastify";

// ----------------------------------------------------------------------

/**
 * Simple webhook test endpoint that can be used to test webhook deliveries
 * This endpoint accepts any POST request and logs the details
 */
export async function webhookTestRoutes(fastify: FastifyInstance) {

  // Test webhook endpoint - accepts any payload
  fastify.post("/webhook-test", async (request, reply) => {
    const timestamp = new Date().toISOString();
    const headers = request.headers;
    const payload = request.body;

    // Log the webhook details
    console.log(`[${timestamp}] Webhook Test Received:`);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));

    // Return a successful response
    reply.status(200).send({
      success: true,
      message: "Webhook received successfully",
      timestamp,
      receivedHeaders: {
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent'],
        'x-fsa-signature': headers['x-fsa-signature'],
        'x-fsa-topic': headers['x-fsa-topic'],
        'x-fsa-webhook-id': headers['x-fsa-webhook-id'],
        'x-fsa-delivery-id': headers['x-fsa-delivery-id'],
        'x-fsa-attempt': headers['x-fsa-attempt'],
      },
      payloadSize: JSON.stringify(payload).length,
    });
  });

  // Health check for the test endpoint
  fastify.get("/webhook-test", async (request, reply) => {
    reply.send({
      message: "Webhook test endpoint is ready",
      usage: "POST to this endpoint to test webhook deliveries",
      timestamp: new Date().toISOString(),
    });
  });

  // Webhook test endpoint that simulates failures
  fastify.post("/webhook-test/fail", async (request, reply) => {
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Webhook Test (Fail) Received:`, JSON.stringify(request.body, null, 2));

    // Simulate different types of failures randomly
    const failureType = Math.floor(Math.random() * 4);

    switch (failureType) {
      case 0:
        // Timeout simulation (close connection without response)
        request.raw.destroy();
        return;

      case 1:
        // 400 Bad Request
        reply.status(400).send({
          error: "Bad Request",
          message: "Invalid webhook payload format",
          timestamp,
        });
        return;

      case 2:
        // 500 Internal Server Error
        reply.status(500).send({
          error: "Internal Server Error",
          message: "Webhook processing failed",
          timestamp,
        });
        return;

      default:
        // 422 Unprocessable Entity
        reply.status(422).send({
          error: "Unprocessable Entity",
          message: "Webhook payload could not be processed",
          timestamp,
        });
        return;
    }
  });

  // Webhook test endpoint that simulates slow responses
  fastify.post("/webhook-test/slow", async (request, reply) => {
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Webhook Test (Slow) Received:`, JSON.stringify(request.body, null, 2));

    // Simulate slow processing (5-15 seconds)
    const delay = Math.random() * 10000 + 5000;
    await new Promise(resolve => setTimeout(resolve, delay));

    reply.status(200).send({
      success: true,
      message: "Webhook processed after delay",
      timestamp,
      processingTimeMs: delay,
    });
  });
}