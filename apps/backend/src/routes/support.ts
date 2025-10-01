import type { FastifyInstance } from 'fastify';

import { SupportController } from '../controllers/support';

export default async function supportRoutes(fastify: FastifyInstance) {
  // Submit support request
  fastify.post('/submit', SupportController.submitRequest);

  // Test email configuration
  fastify.post('/test-email', SupportController.testEmail);
}