import { WorkOrder } from "../models";

export async function fixWorkOrderIndexes() {
  const collection = WorkOrder.collection;

  try {
    const indexes = await collection.indexes();
    const hasLegacyUnique = indexes.some(
      (idx: any) => idx.name === "workOrderNumber_1",
    );

    if (hasLegacyUnique) {
      await collection.dropIndex("workOrderNumber_1");
      console.log(
        "🗑️ Dropped legacy unique index workOrderNumber_1 on workorders",
      );
    }

    // Ensure the compound unique index exists (idempotent)
    await collection.createIndex(
      { tenantId: 1, workOrderNumber: 1 },
      { unique: true },
    );
    console.log(
      "✅ Ensured compound unique index (tenantId, workOrderNumber) on workorders",
    );
  } catch (error) {
    console.error("❌ Failed to fix WorkOrder indexes:", error);
  }
}
