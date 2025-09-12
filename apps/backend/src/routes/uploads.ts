import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { User } from '../models';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { log } from 'node:console';

export async function uploadsRoutes(fastify: FastifyInstance) {
  // Auth required only for POST uploads; GET uses token or auth header
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    fastify.log.info('uploads: start parsing multipart');
    
    try {
      // Use Fastify's built-in saveRequestFiles for robust multipart handling
      const parts = await (request as any).saveRequestFiles();
      
      // Extract form fields from multipart data
      const body = request.body as any;
      let scope = 'task';
      let taskId = '';
      let workOrderId = '';
      
      // Extract form fields from body (available in some versions)
      if (body?.scope) {
        scope = body.scope;
      }
      if (body?.taskId) {
        taskId = body.taskId;
      }
      if (body?.workOrderId) {
        workOrderId = body.workOrderId;
      }
      
      // Fallback: look for form fields in parts if not in body
      if (!body?.scope && parts.length > 0) {
        // Check if any parts contain form field data
        for (const part of parts) {
          if (part.fieldname === 'scope') {
            const fieldData = await fs.readFile(part.filepath, 'utf-8');
            scope = fieldData;
          } else if (part.fieldname === 'taskId') {
            const fieldData = await fs.readFile(part.filepath, 'utf-8');
            taskId = fieldData;
          } else if (part.fieldname === 'workOrderId') {
            const fieldData = await fs.readFile(part.filepath, 'utf-8');
            workOrderId = fieldData;
          }
        }
      }
      
      fastify.log.info({ partsCount: parts.length, scope, taskId, workOrderId, body }, 'uploads: parsed multipart data');

      if (parts.length === 0) {
        fastify.log.error('uploads: no file parts found');
        return reply.code(400).send({ success: false, error: 'No files found' });
      }

      const user: any = (request as any).user;
      const tenantId = user.tenantId;
      const scopeDir = scope === 'workOrder' ? 'work_orders' : 'tasks';
      const ownerId = taskId || workOrderId || 'misc';

      const baseDir = path.join(process.cwd(), 'uploads', String(tenantId), scopeDir, String(ownerId));
      await fs.mkdir(baseDir, { recursive: true });
      
      fastify.log.info({ tenantId, scopeDir, ownerId, baseDir, fileCount: parts.length }, 'uploads: saving files to directory');

      const saved: Array<{ url: string; path: string; name: string; size: number; mime: string }> = [];
      
      // Filter out form field parts, only process file parts
      const fileParts = parts.filter((part: any) => 
        part.fieldname === 'files' || (part.filename && !['scope', 'taskId', 'workOrderId'].includes(part.fieldname))
      );
      
      fastify.log.info({ totalParts: parts.length, fileParts: fileParts.length }, 'uploads: filtered file parts');
      
      for (const part of fileParts) {
        const filename = `${Date.now()}-${part.filename}`;
        const destPath = path.join(baseDir, filename);
        
        // Copy the temp file to final destination (handles cross-device)
        await fs.copyFile(part.filepath, destPath);
        // Clean up the temp file
        await fs.unlink(part.filepath);
        
        const st = await fs.stat(destPath);
        const rel = `/api/v1/uploads/${tenantId}/${scopeDir}/${ownerId}/${filename}`;
        const host = request.headers.host;
        const protocol = (request.headers['x-forwarded-proto'] as string) || request.protocol;
        const abs = `${protocol}://${host}${rel}`;
        const token = (fastify as any).jwt.sign({ tenantId, userId: user.id }, { expiresIn: '7d' });
        const absWithToken = `${abs}?token=${token}`;
        
        saved.push({ 
          url: absWithToken, 
          path: rel, 
          name: part.filename, 
          size: st.size, 
          mime: part.mimetype 
        });
      }

      fastify.log.info({ savedCount: saved.length }, 'uploads: completed successfully');
      return reply.send({ success: true, data: saved });
      
    } catch (err: any) {
      if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
        fastify.log.warn({ err }, 'uploads: file too large');
        return reply.code(413).send({ success: false, error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB per file.` });
      }
      fastify.log.error({ err }, 'uploads: error processing multipart data');
      return reply.code(500).send({ success: false, error: 'Upload processing failed' });
    }
  });

  // Secure serving by tenancy
  fastify.get('/:tenantId/:scope/:ownerId/:filename', async (request, reply) => {
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
            tenantId = Array.isArray(u) ? u[0]?.tenantId?.toString() : u?.tenantId?.toString();
          }
          user = { tenantId, id: userId };
        } catch {
          return reply.code(401).send({ success: false, error: 'Invalid token' });
        }
      }
    }
    if (!user || String(user.tenantId) !== String(params.tenantId)) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }

    const filePath = path.join(process.cwd(), 'uploads', params.tenantId, params.scope, params.ownerId, params.filename);

    try {
      await fs.access(filePath);
    } catch {
      return reply.code(404).send({ success: false, error: 'File not found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    reply.header('Content-Type', contentType);
    // Allow images/files to be embedded across origins (frontend on a different port)
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    return reply.send(createReadStream(filePath));
  });
}


