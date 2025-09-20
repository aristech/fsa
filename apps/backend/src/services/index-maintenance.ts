import { WorkOrder } from "../models";

export async function fixWorkOrderIndexes() {
  const collection = WorkOrder.collection;

  try {
    const INDEX_NAME = "tenantId_1_workOrderNumber_1";
    const INDEX_KEY = { tenantId: 1, workOrderNumber: 1 } as const;
    const INDEX_OPTS = {
      name: INDEX_NAME,
      unique: true,
      partialFilterExpression: {
        workOrderNumber: { $exists: true, $type: "string", $gt: "" },
      },
    } as const;

    const indexes = await collection.indexes();

    // Drop legacy single-field index if present
    if (indexes.some((idx: any) => idx.name === "workOrderNumber_1")) {
      await collection.dropIndex("workOrderNumber_1");
      console.log(
        "🗑️ Dropped legacy unique index workOrderNumber_1 on workorders",
      );
    }

    const existing = indexes.find((idx: any) => idx.name === INDEX_NAME);
    const sameKey =
      existing && JSON.stringify(existing.key) === JSON.stringify(INDEX_KEY);
    const isUnique = !!existing?.unique;
    const samePartial =
      JSON.stringify(existing?.partialFilterExpression || {}) ===
      JSON.stringify(INDEX_OPTS.partialFilterExpression);

    if (existing && sameKey && isUnique && samePartial) {
      console.log("✅ Compound unique index already in correct shape");
      return;
    }

    if (existing) {
      await collection.dropIndex(INDEX_NAME);
      console.log(
        `🗑️ Dropped existing index ${INDEX_NAME} to recreate with correct options`,
      );
    }

    try {
      await collection.createIndex(INDEX_KEY, INDEX_OPTS);
      console.log(
        "✅ Ensured compound unique index (tenantId, workOrderNumber) on workorders",
      );
    } catch (err: any) {
      const message = err?.message || String(err);
      if (
        message.toLowerCase().includes("duplicate key") ||
        err?.code === 11000
      ) {
        console.error(
          "❌ Duplicate (tenantId, workOrderNumber) values detected. Resolve before creating the unique index.",
        );
        console.error(
          "👉 Run this aggregation to see duplicates:\n" +
            `db.workorders.aggregate([
  { $match: { workOrderNumber: { $exists: true, $type: "string", $ne: "" } } },
  { $group: { _id: { tenantId: "$tenantId", workOrderNumber: "$workOrderNumber" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
])`,
        );
      } else {
        console.error("❌ Failed to create compound index:", err);
      }
    }
  } catch (error) {
    console.error("❌ Failed to fix WorkOrder indexes:", error);
  }
}
