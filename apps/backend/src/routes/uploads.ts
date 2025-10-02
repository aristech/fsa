import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { User } from "../models";
import EnhancedSubscriptionMiddleware from "../middleware/enhanced-subscription-middleware";
import { EnvSubscriptionService } from "../services/env-subscription-service";
import { FileTrackingService } from "../services/file-tracking-service";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { log } from "node:console";

export async function uploadsRoutes(fastify: FastifyInstance) {
  // Auth required only for POST uploads; GET uses token or auth header
  fastify.post("/", { preHandler: authenticate }, async (request, reply) => {
    fastify.log.info("uploads: start parsing multipart");

    try {
      // Use multipart iterator instead of saveRequestFiles to get both fields and files
      const parts = request.parts();
      const files: any[] = [];
      let scope = "task";
      let taskId = "";
      let workOrderId = "";
      let reportId = "";
      let logoType = "";

      // Process all multipart parts
      for await (const part of parts) {
        if ('file' in part && part.file) {
          // This is a file part

          const buf = await (part as any).toBuffer();
          files.push({
            fieldname: part.fieldname,
            filename: (part as any).filename,
            encoding: (part as any).encoding,
            mimetype: (part as any).mimetype,
            buffer: buf,
          });
        } else {
          // This is a form field
          const value = (part as any).value as string;
          
          
          if (part.fieldname === "scope") {
            scope = value.trim();
          } else if (part.fieldname === "taskId") {
            taskId = value.trim();
          } else if (part.fieldname === "workOrderId") {
            workOrderId = value.trim();
          } else if (part.fieldname === "reportId") {
            reportId = value.trim();
          } else if (part.fieldname === "logoType") {
            logoType = value.trim();
          }
        }
      }

      

      fastify.log.info(
        {
          filesCount: files.length,
          scope,
          taskId,
          workOrderId,
          reportId,
          finalScopeDir: scope === "workOrder" ? "work_orders" : scope === "report" ? "reports" : scope === "logo" ? "branding" : "tasks",
          finalOwnerId: taskId || workOrderId || reportId || logoType || "misc",
        },
        "uploads: parsed multipart data",
      );

      if (files.length === 0) {
        fastify.log.error("uploads: no file parts found");
        return reply
          .code(400)
          .send({ success: false, error: "No files found" });
      }

      const user: any = (request as any).user;
      const tenantId = user.tenantId;

      // Check storage limits before processing files
      const totalUploadSize = files.reduce((sum, file) => sum + file.buffer.length, 0);

      // Get tenant to check current storage usage
      const { Tenant } = require("../models");
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return reply.code(404).send({
          success: false,
          error: "Tenant not found",
        });
      }

      // Check if the upload would exceed storage limits
      const storageCheck = EnvSubscriptionService.canPerformAction(tenant, 'upload_file', totalUploadSize);
      if (!storageCheck.allowed) {
        return reply.code(413).send({
          success: false,
          error: storageCheck.reason || "Storage limit exceeded",
          details: {
            currentUsage: `${storageCheck.currentUsage?.toFixed(2)}GB`,
            limit: `${storageCheck.limit}GB`,
            uploadSize: `${(totalUploadSize / (1024 * 1024 * 1024)).toFixed(2)}GB`,
          },
        });
      }
      const scopeDir =
        scope === "workOrder"
          ? "work_orders"
          : scope === "report"
            ? "reports"
            : scope === "logo"
            ? "branding"
            : "tasks";
      const ownerId = taskId || workOrderId || reportId || logoType || "misc";

      const baseDir = path.join(
        process.cwd(),
        "uploads",
        String(tenantId),
        scopeDir,
        String(ownerId),
      );
      await fs.mkdir(baseDir, { recursive: true });

      fastify.log.info(
        { tenantId, scopeDir, ownerId, baseDir, fileCount: files.length },
        "uploads: saving files to directory",
      );

      const saved: Array<{
        url: string;
        path: string;
        name: string;
        size: number;
        mime: string;
      }> = [];

      fastify.log.info(
        { fileCount: files.length },
        "uploads: processing files",
      );

      // Validate logo uploads if scope is logo
      if (scope === "logo") {
        // Check if user has custom branding feature
        const { Tenant } = require("../models");
        const tenant = await Tenant.findById(tenantId);
        if (!tenant?.subscription?.limits?.features?.customBranding) {
          return reply.status(403).send({
            success: false,
            error: "Custom branding is not available on your current plan",
          });
        }

        // Only tenant owners can upload logos
        if (!user.isTenantOwner) {
          return reply.status(403).send({
            success: false,
            error: "Only tenant owners can upload logos",
          });
        }

        // Validate file types for logos (only images)
        for (const file of files) {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
          ];

          if (!allowedMimeTypes.includes(file.mimetype)) {
            return reply.status(400).send({
              success: false,
              error: `Invalid file type for logo: ${file.mimetype}. Only image files are allowed.`,
            });
          }

          // Validate file size for logos (max 2MB)
          if (file.buffer.length > 2 * 1024 * 1024) {
            return reply.status(413).send({
              success: false,
              error: `Logo file too large. Maximum size is 2MB.`,
            });
          }
        }
      }

      for (const file of files) {
        // Properly sanitize filename to handle Greek characters and spaces
        const sanitizedOriginalName = file.filename
          .replace(/[<>:"/\\|?*]/g, '_') // Remove invalid characters
          .replace(/\s+/g, '_'); // Replace spaces with underscores

        const filename = `${Date.now()}-${sanitizedOriginalName}`;
        const destPath = path.join(baseDir, filename);

        // Write buffer to final destination
        await fs.writeFile(destPath, file.buffer);

        const st = await fs.stat(destPath);
        // Properly encode filename in URL to handle Greek characters and special chars
        const encodedFilename = encodeURIComponent(filename);
        const rel = `/api/v1/uploads/${tenantId}/${scopeDir}/${ownerId}/${encodedFilename}`;
        const host = request.headers.host;
        const protocol =
          (request.headers["x-forwarded-proto"] as string) || request.protocol;
        const abs = `${protocol}://${host}${rel}`;
        const token = (fastify as any).jwt.sign(
          { tenantId, userId: user.id },
          { expiresIn: "7d" },
        );
        const absWithToken = `${abs}?token=${token}`;

        fastify.log.info({
          originalFilename: file.filename,
          sanitizedFilename: sanitizedOriginalName,
          finalFilename: filename,
          encodedUrl: encodedFilename,
        }, "uploads: processed filename");

        saved.push({
          url: absWithToken,
          path: rel,
          name: file.filename,
          size: st.size,
          mime: file.mimetype,
        });

        // Track individual file in FileTrackingService to prevent deletion by cleanup
        try {
          await FileTrackingService.trackFileUpload(
            tenantId,
            filename,
            file.filename,
            file.mimetype,
            st.size,
            scope === "logo" ? 'logo' : scope === "workOrder" ? 'workorder_attachment' : 'other',
            destPath
          );
        } catch (trackingError) {
          console.error('Error tracking file upload:', trackingError);
          // Don't fail the upload if tracking fails, but log it
          fastify.log.error({ trackingError, filename }, 'Failed to track file upload');
        }
      }

      // NOTE: Storage usage is already tracked by FileTrackingService.trackFileUpload() above
      // DO NOT track storage again here to avoid double-counting

      fastify.log.info(
        {
          savedCount: saved.length,
          totalSizeGB: (totalUploadSize / (1024 * 1024 * 1024)).toFixed(4),
          tenantId
        },
        "uploads: completed successfully with storage tracking",
      );
      return reply.send({ success: true, data: saved });
    } catch (err: any) {
      if (err.code === "FST_REQ_FILE_TOO_LARGE") {
        fastify.log.warn({ err }, "uploads: file too large");
        return reply
          .code(413)
          .send({
            success: false,
            error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB per file.`,
          });
      }
      fastify.log.error({ err }, "uploads: error processing multipart data");
      return reply
        .code(500)
        .send({ success: false, error: "Upload processing failed" });
    }
  });

  // Secure serving by tenancy
  fastify.get(
    "/:tenantId/:scope/:ownerId/:filename",
    async (request, reply) => {
      const params = request.params as any;
      let user: any = (request as any).user;
      // Allow token via query for non-AJAX image requests
      if (!user) {
        const token = (request.query as any)?.token;
        if (token) {
          try {
            const decoded: any = (fastify as any).jwt.verify(token);
            let tenantId = decoded.tenantId;
            let userId = decoded.userId;
            if (!tenantId && userId) {
              const u = await User.findById(userId).lean();
              tenantId = Array.isArray(u)
                ? u[0]?.tenantId?.toString()
                : u?.tenantId?.toString();
            }
            user = { tenantId, id: userId };
          } catch {
            return reply
              .code(401)
              .send({ success: false, error: "Invalid token" });
          }
        }
      }
      if (!user || String(user.tenantId) !== String(params.tenantId)) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }

      // Decode URL-encoded filename to handle special characters (Greek, etc.)
      const decodedFilename = decodeURIComponent(params.filename);

      const filePath = path.join(
        process.cwd(),
        "uploads",
        params.tenantId,
        params.scope,
        params.ownerId,
        decodedFilename,
      );

      fastify.log.info({
        originalFilename: params.filename,
        decodedFilename,
        filePath,
        tenantId: params.tenantId,
        scope: params.scope,
        ownerId: params.ownerId,
      }, "uploads: attempting to serve file");

      try {
        await fs.access(filePath);
      } catch (error) {
        fastify.log.error({
          filePath,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, "uploads: file not found");
        return reply
          .code(404)
          .send({ success: false, error: "File not found" });
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
        ".svg": "image/svg+xml",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
      };
      const contentType = mimeMap[ext] || "application/octet-stream";

      reply.header("Content-Type", contentType);
      // Allow images/files to be embedded across origins (frontend on a different port)
      reply.header("Cross-Origin-Resource-Policy", "cross-origin");

      // Add explicit CORS headers for file serving - match main server logic
      const origin = request.headers.origin;
      if (origin) {
        // Allow localhost on any port for development
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
          reply.header("Access-Control-Allow-Origin", origin);
          reply.header("Access-Control-Allow-Credentials", "true");
        }
        // Allow progressnet.io domains
        else if (origin.endsWith('.progressnet.io') || origin === 'https://progressnet.io' || origin === 'https://www.progressnet.io') {
          reply.header("Access-Control-Allow-Origin", origin);
          reply.header("Access-Control-Allow-Credentials", "true");
        }
        // For other HTTPS origins, allow them (they are authenticated via JWT)
        else if (origin.startsWith('https://')) {
          reply.header("Access-Control-Allow-Origin", origin);
          reply.header("Access-Control-Allow-Credentials", "true");
        }
        else {
          reply.header("Access-Control-Allow-Origin", "*");
        }
      } else {
        // No origin header (mobile apps, etc.)
        reply.header("Access-Control-Allow-Origin", "*");
      }
      reply.header("Access-Control-Allow-Methods", "GET, OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      return reply.send(createReadStream(filePath));
    },
  );

  // Handle OPTIONS preflight requests for file serving
  fastify.options(
    "/:tenantId/:scope/:ownerId/:filename",
    async (request, reply) => {
      const origin = request.headers.origin;
      if (origin) {
        // Allow localhost on any port for development
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
          reply.header("Access-Control-Allow-Origin", origin);
          reply.header("Access-Control-Allow-Credentials", "true");
        }
        // Allow progressnet.io domains
        else if (origin.endsWith('.progressnet.io') || origin === 'https://progressnet.io' || origin === 'https://www.progressnet.io') {
          reply.header("Access-Control-Allow-Origin", origin);
          reply.header("Access-Control-Allow-Credentials", "true");
        }
        // For other HTTPS origins, allow them (they are authenticated via JWT)
        else if (origin.startsWith('https://')) {
          reply.header("Access-Control-Allow-Origin", origin);
          reply.header("Access-Control-Allow-Credentials", "true");
        }
        else {
          reply.header("Access-Control-Allow-Origin", "*");
        }
      } else {
        // No origin header (mobile apps, etc.)
        reply.header("Access-Control-Allow-Origin", "*");
      }
      reply.header("Access-Control-Allow-Methods", "GET, OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      reply.header("Access-Control-Max-Age", "86400"); // 24 hours
      reply.code(200).send();
    }
  );
}
