import { Task, WorkOrder } from "../models";

export class WorkOrderProgressService {
  static async recomputeForWorkOrder(tenantId: string, workOrderId: string) {
    // Load tasks for this work order
    const tasks = await Task.find({ tenantId, workOrderId }).lean();
    const totals = {
      total: tasks.length,
      done: 0,
      inProgress: 0,
      blocked: 0,
      startedAt: undefined as Date | undefined,
      completedAt: undefined as Date | undefined,
    };

    for (const t of tasks) {
      // Completion based on completeStatus, fallback to status===done
      const isComplete = (t as any).completeStatus === true || t.status === 'done';
      if (isComplete) totals.done += 1;
      else if (t.status === "in-progress" || t.status === "review")
        totals.inProgress += 1;
      else if (t.status === "blocked") totals.blocked += 1;
      if ((t as any).startedAt) {
        const s = (t as any).startedAt as Date;
        totals.startedAt =
          !totals.startedAt || s < totals.startedAt ? s : totals.startedAt;
      }
      if ((t as any).completedAt) {
        const c = (t as any).completedAt as Date;
        totals.completedAt =
          !totals.completedAt || c > totals.completedAt
            ? c
            : totals.completedAt;
      }
    }

    const workOrder = await WorkOrder.findOne({ _id: workOrderId, tenantId });
    if (!workOrder) return;

    const mode = workOrder.progressMode || "computed";

    let progress = 0;
    if (mode === "manual") {
      progress = Math.max(0, Math.min(100, workOrder.progressManual ?? 0));
    } else if (mode === "weighted") {
      // For now, fallback to computed by status; add weighting later if tasks contain progress/effort
      progress =
        totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100);
    } else {
      progress =
        totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100);
    }

    workOrder.progress = progress;
    workOrder.tasksTotal = totals.total;
    workOrder.tasksCompleted = totals.done;
    workOrder.tasksInProgress = totals.inProgress;
    workOrder.tasksBlocked = totals.blocked;
    workOrder.startedAt = totals.startedAt;
    workOrder.completedAt = totals.completedAt;

    // Optional: derive status from tasks
    if (totals.total > 0) {
      if (totals.done === totals.total) workOrder.status = "completed";
      else if (totals.blocked > 0) workOrder.status = "on-hold";
      else if (totals.inProgress > 0) workOrder.status = "in-progress";
      else workOrder.status = "assigned";
    }

    await workOrder.save();
  }
}
