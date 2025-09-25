import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { User } from "../models";
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
          finalScopeDir: scope === "workOrder" ? "work_orders" : scope === "report" ? "reports" : "tasks",
          finalOwnerId: taskId || workOrderId || reportId || "misc",
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
      const scopeDir =
        scope === "workOrder"
          ? "work_orders"
          : scope === "report"
            ? "reports"
            : "tasks";
      const ownerId = taskId || workOrderId || reportId || "misc";

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

      for (const file of files) {
        const filename = `${Date.now()}-${file.filename}`;
        const destPath = path.join(baseDir, filename);

        // Write buffer to final destination
        await fs.writeFile(destPath, file.buffer);

        const st = await fs.stat(destPath);
        const rel = `/api/v1/uploads/${tenantId}/${scopeDir}/${ownerId}/${filename}`;
        const host = request.headers.host;
        const protocol =
          (request.headers["x-forwarded-proto"] as string) || request.protocol;
        const abs = `${protocol}://${host}${rel}`;
        const token = (fastify as any).jwt.sign(
          { tenantId, userId: user.id },
          { expiresIn: "7d" },
        );
        const absWithToken = `${abs}?token=${token}`;

        saved.push({
          url: absWithToken,
          path: rel,
          name: file.filename,
          size: st.size,
          mime: file.mimetype,
        });
      }

      fastify.log.info(
        { savedCount: saved.length },
        "uploads: completed successfully",
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
