import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface ICounter {
  _id: string; // key: `${tenantId}:${sequenceName}`
  tenantId: string;
  name: string; // sequence name, e.g., 'workOrder'
  value: number;
}

// ----------------------------------------------------------------------

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  value: { type: Number, required: true, default: 0 },
});

CounterSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Counter =
  models.Counter || model<ICounter>("Counter", CounterSchema);

export async function getNextSequence(
  tenantId: string,
  name: string,
): Promise<number> {
  const id = `${tenantId}:${name}`;
  const updated = await Counter.findOneAndUpdate(
    { _id: id },
    { $inc: { value: 1 }, $setOnInsert: { tenantId, name } },
    { new: true, upsert: true },
  );
  return updated.value;
}
