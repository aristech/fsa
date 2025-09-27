import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import { config } from "./config";
import { connectDB } from "./utils/database";
import { registerRoutes } from "./routes";
import { realtimeService } from "./services/realtime-service";
import { ensureSuperUsers } from "./services/superuser-bootstrap";
import { fixWorkOrderIndexes } from "./services/index-maintenance";
import { TaskMigrationService } from "./services/task-migration";
import * as path from "path";

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === "production" ? "info" : "debug",
  },
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost on any port for development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }

      // Allow the configured CORS origin
      if (origin === config.CORS_ORIGIN) {
        return callback(null, true);
      }

      // Allow progressnet.io domains
      if (origin.endsWith('.progressnet.io') || origin === 'https://progressnet.io' || origin === 'https://www.progressnet.io') {
        return callback(null, true);
      }

      // For API key authenticated requests, allow all HTTPS origins
      // API key authentication provides the security layer
      if (origin.startsWith('https://')) {
        return callback(null, true);
      }

      // Reject other origins
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "Pragma",
    ],
  });

  // Security headers
  await fastify.register(helmet);

  // JWT
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  // Multipart support with configurable limits
  await fastify.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
      files: config.MAX_FILES_PER_REQUEST, // Max files per request
      fieldSize: 1024 * 1024, // 1MB for form fields
    },
  });

  // Static file serving for uploads
  await fastify.register(staticFiles, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  // Register routes
  await registerRoutes(fastify);
}

// Start server
async function start() {
  try {
    // Connect to database
    await connectDB();

    // Register plugins and routes
    await registerPlugins();

    // Start server first
    await fastify.listen({
      port: config.PORT,
      host: "0.0.0.0",
    });

    // Run startup operations after server is listening (non-blocking)
    setImmediate(async () => {
      try {
        // Ensure superusers exist (from env)
        await ensureSuperUsers();
        console.log("✅ Superuser bootstrap completed");
      } catch (error) {
        console.error("❌ Superuser bootstrap failed:", error);
      }

      try {
        // Ensure indexes and drop legacy ones
        await fixWorkOrderIndexes();
      } catch (error) {
        console.error("❌ Index maintenance failed:", error);
      }

      try {
        // Migrate tasks to use columnId architecture
        await TaskMigrationService.migrateTasksToColumnIds();
        const migrationValid = await TaskMigrationService.verifyMigration();
        if (!migrationValid) {
          console.warn(
            "⚠️  Task migration verification failed - some tasks may not display correctly",
          );
        } else {
          console.log("✅ Task migration verification successful");
        }
      } catch (error) {
        console.error("❌ Task migration failed:", error);
      }
    });

    // Initialize real-time service with the HTTP server
    realtimeService.initialize(fastify.server);

    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`📚 API Documentation: http://localhost:${config.PORT}/docs`);
    console.log(`🔌 WebSocket server ready for real-time communication`);
    console.log(`✅ Server startup completed successfully`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down server...");
  realtimeService.shutdown();
  await fastify.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down server...");
  realtimeService.shutdown();
  await fastify.close();
  process.exit(0);
});

start();
