import { Task, Status } from "../models";

export class TaskMigrationService {
  /**
   * Migrate existing tasks from status-based to columnId-based architecture
   */
  static async migrateTasksToColumnIds(): Promise<void> {

    try {
      // Get all tenants that have tasks
      const distinctTenants = await Task.distinct("tenantId");
    

      for (const tenantId of distinctTenants) {
        await this.migrateTenantTasks(tenantId);
      }

    } catch (error) {
      console.error("❌ Task migration failed:", error);
      throw error;
    }
  }

  private static async migrateTenantTasks(tenantId: string): Promise<void> {

    // Get all active statuses for this tenant
    const statuses = await Status.find({
      tenantId,
      isActive: true,
    }).lean();

    if (statuses.length === 0) {
    

      // Create default columns if none exist
      const defaults = [
        { name: "Todo", color: "#2196f3" },
        { name: "In Progress", color: "#ff9800" },
        { name: "Review", color: "#9c27b0" },
        { name: "Done", color: "#4caf50" },
      ];

      const createdStatuses = await Status.insertMany(
        defaults.map((d, idx) => ({
          tenantId,
          name: d.name,
          color: d.color,
          order: idx,
          isDefault: idx === 0,
          isActive: true,
        })),
      );

    
      statuses.push(...createdStatuses);
    }

    // Create mapping from status strings to column IDs
    const statusToColumnMap: Record<string, string> = {};

    statuses.forEach((status: any) => {
      const slug = status.name.toLowerCase().trim().replace(/\s+/g, "-");
      statusToColumnMap[slug] = status._id.toString();

      // Also map common variations
      if (slug.includes("in-progress") || slug.includes("progress")) {
        statusToColumnMap["in-progress"] = status._id.toString();
      }
      if (slug.includes("review")) {
        statusToColumnMap["review"] = status._id.toString();
      }
      if (slug.includes("done") || slug.includes("complete")) {
        statusToColumnMap["done"] = status._id.toString();
      }
      if (slug.includes("cancel")) {
        statusToColumnMap["cancel"] = status._id.toString();
      }
      if (slug.includes("todo")) {
        statusToColumnMap["todo"] = status._id.toString();
      }
    });

    // Get all tasks for this tenant that need migration (have status but no columnId)
    const tasksToMigrate = await Task.find({
      tenantId,
      status: { $exists: true },
      $or: [
        { columnId: { $exists: false } },
        { columnId: null },
        { columnId: "" },
      ],
    });

 

    if (tasksToMigrate.length === 0) {
      console.log(`✅ No tasks need migration for tenant ${tenantId}`);
      return;
    }

    // Migrate each task
    let migratedCount = 0;
    const defaultColumnId = statuses[0]._id.toString(); // First column as fallback

    for (const task of tasksToMigrate) {
      const taskStatus = task.status;
      let columnId = statusToColumnMap[taskStatus] || defaultColumnId;

      // If we couldn't find a matching column, use the first column
      if (!columnId) {
        columnId = defaultColumnId;
      }

      try {
        await Task.updateOne(
          { _id: task._id },
          {
            $set: { columnId },
            // Keep status field for backward compatibility during transition
          },
        );
        migratedCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate task ${task._id}:`, error);
      }
    }

  }

  /**
   * Verify migration completed successfully
   */
  static async verifyMigration(): Promise<boolean> {
    console.log("🔍 Verifying task migration...");

    try {
      // Count tasks without columnId
      const tasksWithoutColumnId = await Task.countDocuments({
        $or: [
          { columnId: { $exists: false } },
          { columnId: null },
          { columnId: "" },
        ],
      });

      if (tasksWithoutColumnId > 0) {
        console.log(
          `⚠️  Found ${tasksWithoutColumnId} tasks still without columnId`,
        );
        return false;
      }

      // Count tasks with invalid columnId references
      const allTasks = await Task.find({
        columnId: { $exists: true, $ne: null, $ne: "" },
      }).lean();

      let invalidReferences = 0;

      for (const task of allTasks) {
        const columnExists = await Status.findById(task.columnId);
        if (!columnExists) {
          console.log(
            `⚠️  Task ${task._id} references non-existent column ${task.columnId}`,
          );
          invalidReferences++;
        }
      }

      if (invalidReferences > 0) {
        console.log(
          `⚠️  Found ${invalidReferences} tasks with invalid column references`,
        );
        return false;
      }

      console.log(
        "✅ Migration verification successful - all tasks have valid columnId references",
      );
      return true;
    } catch (error) {
      console.error("❌ Migration verification failed:", error);
      return false;
    }
  }
}
