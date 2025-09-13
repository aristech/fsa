import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Material } from "../models";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

// Material creation schema
const createMaterialSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.string().min(1, "Unit is required").default("pcs"),
  unitCost: z.coerce.number().min(0, "Unit cost must be positive").default(0),
  quantity: z.coerce.number().min(0, "Quantity must be positive").default(0),
  minimumStock: z.coerce
    .number()
    .min(0, "Minimum stock must be positive")
    .optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
});

// Allow partial updates on PUT
const updateMaterialSchema = createMaterialSchema.partial();

// Search schema
const searchMaterialsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Material routes
export async function materialsRoutes(fastify: FastifyInstance) {
  // Add authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/v1/materials/categories - Get distinct categories
  fastify.get(
    "/categories",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;

        const categories = await Material.distinct("category", {
          tenantId: tenant._id,
          category: { $nin: [null, ""] },
        });

        return reply.send({
          success: true,
          data: categories.sort(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: "Failed to fetch categories",
        });
      }
    },
  );

  // DELETE /api/v1/materials/categories/:categoryName - Delete empty category
  fastify.delete(
    "/categories/:categoryName",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { categoryName } = request.params as { categoryName: string };

        // Check if category has any materials
        const materialsCount = await Material.countDocuments({
          tenantId: tenant._id,
          category: categoryName,
        });

        if (materialsCount > 0) {
          return reply.status(400).send({
            success: false,
            message: `Cannot delete category "${categoryName}" because it contains ${materialsCount} material(s)`,
          });
        }

        // Category is empty, so it doesn't exist in materials collection
        // This endpoint succeeds even if the category doesn't exist
        return reply.send({
          success: true,
          message: `Category "${categoryName}" deleted successfully`,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: "Failed to delete category",
        });
      }
    },
  );

  // GET /api/v1/materials - Get all materials with search/filter
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;

      const query = searchMaterialsSchema.parse(request.query);
      const {
        q,
        category,
        status,
        location,
        supplier,
        limit,
        offset,
        sortBy,
        sortOrder,
      } = query;

      // Build search filters
      const filters: any = { tenantId: tenant._id };

      // Text search across multiple fields
      if (q) {
        filters.$or = [
          { name: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { category: { $regex: q, $options: "i" } },
          { sku: { $regex: q, $options: "i" } },
          { barcode: { $regex: q, $options: "i" } },
          { location: { $regex: q, $options: "i" } },
          { supplier: { $regex: q, $options: "i" } },
        ];
      }

      if (category) {
        filters.category = { $regex: category, $options: "i" };
      }

      if (status && status !== "all") {
        filters.status = status;
      }

      if (location) {
        filters.location = { $regex: location, $options: "i" };
      }

      if (supplier) {
        filters.supplier = { $regex: supplier, $options: "i" };
      }

      // Build sort
      const sort: any = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sort.createdAt = -1; // Default sort by creation date
      }

      // Execute query
      const materials = await Material.find(filters)
        .sort(sort)
        .limit(limit)
        .skip(offset);

      // Get total count for pagination
      const total = await Material.countDocuments(filters);

      return reply.send({
        success: true,
        data: materials,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch materials",
      });
    }
  });

  // GET /api/v1/materials/:id - Get single material
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const { id } = request.params as { id: string };

      const material = await Material.findOne({
        _id: id,
        tenantId: tenant._id,
      });

      if (!material) {
        return reply.status(404).send({
          success: false,
          message: "Material not found or access denied",
        });
      }

      return reply.send({
        success: true,
        data: material,
        message: "Material fetched successfully",
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch material",
      });
    }
  });

  // POST /api/v1/materials - Create new material
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const validatedData = createMaterialSchema.parse(request.body);

      // Check for duplicate SKU if provided
      if (validatedData.sku) {
        const existingSku = await Material.findOne({
          tenantId: tenant._id,
          sku: validatedData.sku,
        });
        if (existingSku) {
          return reply.status(400).send({
            success: false,
            message: "Material with this SKU already exists",
          });
        }
      }

      // Check for duplicate barcode if provided
      if (validatedData.barcode) {
        const existingBarcode = await Material.findOne({
          tenantId: tenant._id,
          barcode: validatedData.barcode,
        });
        if (existingBarcode) {
          return reply.status(400).send({
            success: false,
            message: "Material with this barcode already exists",
          });
        }
      }

      const material = new Material({
        ...validatedData,
        tenantId: tenant._id,
        customFields: new Map(Object.entries(validatedData.customFields || {})),
      });

      await material.save();

      return reply.send({
        success: true,
        data: material,
        message: "Material created successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(error as Error, "Error creating material");
      return reply.status(500).send({
        success: false,
        message: "Failed to create material",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // PUT /api/v1/materials/:id - Update material
  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const { id } = request.params as { id: string };
      const validatedData = updateMaterialSchema.parse(request.body);

      const material = await Material.findOne({
        _id: id,
        tenantId: tenant._id,
      });

      if (!material) {
        return reply.status(404).send({
          success: false,
          message: "Material not found",
        });
      }

      // Check for duplicate SKU if provided and different from current
      if (validatedData.sku && validatedData.sku !== material.sku) {
        const existingSku = await Material.findOne({
          tenantId: tenant._id,
          sku: validatedData.sku,
          _id: { $ne: id },
        });
        if (existingSku) {
          return reply.status(400).send({
            success: false,
            message: "Material with this SKU already exists",
          });
        }
      }

      // Check for duplicate barcode if provided and different from current
      if (validatedData.barcode && validatedData.barcode !== material.barcode) {
        const existingBarcode = await Material.findOne({
          tenantId: tenant._id,
          barcode: validatedData.barcode,
          _id: { $ne: id },
        });
        if (existingBarcode) {
          return reply.status(400).send({
            success: false,
            message: "Material with this barcode already exists",
          });
        }
      }

      // Handle custom fields update
      if (validatedData.customFields !== undefined) {
        material.customFields = new Map(
          Object.entries(validatedData.customFields),
        );
        delete validatedData.customFields;
      }

      // Update material
      Object.assign(material, validatedData);
      await material.save();

      return reply.send({
        success: true,
        data: material,
        message: "Material updated successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(error as Error, "Error updating material");
      return reply.status(500).send({
        success: false,
        message: "Failed to update material",
      });
    }
  });

  // DELETE /api/v1/materials/:id - Delete material
  fastify.delete(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const material = await Material.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!material) {
          return reply.status(404).send({
            success: false,
            message: "Material not found",
          });
        }

        await Material.findOneAndDelete({ _id: id, tenantId: tenant._id });

        return reply.send({
          success: true,
          message: "Material deleted successfully",
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error deleting material");
        return reply.status(500).send({
          success: false,
          message: "Failed to delete material",
        });
      }
    },
  );

  // PUT /api/v1/materials/:id/toggle-active - Toggle material active status
  fastify.put(
    "/:id/toggle-active",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const material = await Material.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!material) {
          return reply.status(404).send({
            success: false,
            message: "Material not found",
          });
        }

        material.isActive = !material.isActive;
        await material.save();

        return reply.send({
          success: true,
          data: { isActive: material.isActive },
          message: `Material ${material.isActive ? "activated" : "deactivated"} successfully`,
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error toggling material status");
        return reply.status(500).send({
          success: false,
          message: "Failed to toggle material status",
        });
      }
    },
  );

  // POST /api/v1/materials/bulk-import - Bulk import materials from CSV
  fastify.post(
    "/bulk-import",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;

        const { materials } = request.body as { materials: any[] };

        if (!Array.isArray(materials) || materials.length === 0) {
          return reply.status(400).send({
            success: false,
            message: "Materials array is required and cannot be empty",
          });
        }

        const results = {
          success: 0,
          failed: 0,
          updated: 0,
          errors: [] as any[],
          created: [] as any[],
          updatedMaterials: [] as any[],
        };

        for (let i = 0; i < materials.length; i++) {
          try {
            const materialData = createMaterialSchema.parse(materials[i]);

            let existingMaterial = null;

            // Check for existing material by SKU and barcode (only if they're not empty)
            const searchConditions: any[] = [];

            if (materialData.sku && materialData.sku.trim()) {
              searchConditions.push({ sku: materialData.sku.trim() });
            }

            if (materialData.barcode && materialData.barcode.trim()) {
              searchConditions.push({ barcode: materialData.barcode.trim() });
            }

            if (searchConditions.length > 0) {
              // Find material that matches either SKU or barcode
              existingMaterial = await Material.findOne({
                tenantId: tenant._id,
                $or: searchConditions,
              });
            }

            if (existingMaterial) {
              // Update existing material
              if (materialData.customFields !== undefined) {
                existingMaterial.customFields = new Map(
                  Object.entries(materialData.customFields),
                );
                delete materialData.customFields;
              }

              Object.assign(existingMaterial, materialData);
              await existingMaterial.save();

              results.updated++;
              results.updatedMaterials.push(existingMaterial);
            } else {
              const material = new Material({
                ...materialData,
                tenantId: tenant._id,
                customFields: new Map(
                  Object.entries(materialData.customFields || {}),
                ),
              });

              await material.save();
              results.success++;
              results.created.push(material);
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: error instanceof Error ? error.message : "Unknown error",
              data: materials[i],
            });
          }
        }

        return reply.send({
          success: true,
          data: results,
          message: `Bulk import completed. ${results.success} materials created, ${results.failed} failed.`,
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error in bulk import");
        return reply.status(500).send({
          success: false,
          message: "Failed to process bulk import",
        });
      }
    },
  );
}
