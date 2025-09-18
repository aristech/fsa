'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { AnalyticsCurrentVisits } from '../analytics-current-visits';
import { AnalyticsOrderTimeline } from '../analytics-order-timeline';
import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';
import { AnalyticsCurrentSubject } from '../analytics-current-subject';
import { AnalyticsConversionRates } from '../analytics-conversion-rates';

// ----------------------------------------------------------------------

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday as start
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
}

function formatWeekLabel(d: Date) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// ----------------------------------------------------------------------

export function OverviewAnalyticsView() {
  const { t } = useTranslate('common');

  // Personnel
  const { data: personnelResp } = useSWR('/api/v1/personnel?limit=500', async (url: string) => {
    const res = await axiosInstance.get(url);
    return res.data?.data || [];
  });
  const personnel: any[] = Array.isArray(personnelResp) ? personnelResp : [];

  // Kanban tasks
  const { data: kanbanResp } = useSWR(endpoints.kanban, async (url: string) => {
    const res = await axiosInstance.get(url);
    return res.data?.data?.board || res.data?.board || null;
  });
  const tasks: any[] = Array.isArray(kanbanResp?.tasks) ? kanbanResp!.tasks : [];

  // Work orders list (limited)
  const { data: workOrdersResp } = useSWR('/api/v1/work-orders?limit=500&sort=-createdAt', async (url: string) => {
    const res = await axiosInstance.get(url);
    return res.data?.data?.workOrders || res.data?.data || [];
  });
  const workOrders: any[] = Array.isArray(workOrdersResp) ? workOrdersResp : [];

  // Fetch timeline data for work orders
  const workOrderIds = workOrders.slice(0, 10).map(wo => wo._id).filter(Boolean); // Get top 10 work orders
  const { data: timelinesResp } = useSWR(
    workOrderIds.length > 0 ? ['work-order-timelines', ...workOrderIds] : null,
    async () => {
      const results = await Promise.all(
        workOrderIds.map(async (id) => {
          try {
            const res = await axiosInstance.get(`/api/v1/work-orders/${id}/timeline?limit=5`);
            return {
              workOrderId: id,
              timeline: res.data?.data?.timeline || []
            };
          } catch {
            return { workOrderId: id, timeline: [] };
          }
        })
      );
      return results;
    }
  );

  // Notifications (for weekly messages count)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: notificationsResp } = useSWR('/api/v1/notifications?limit=200&sort=-createdAt', async (url: string) => {
    try {
      const res = await axiosInstance.get(url);
      return res.data?.data || [];
    } catch {
      return [] as any[];
    }
  });
  const notifications: any[] = Array.isArray(notificationsResp) ? notificationsResp : [];

  // Time entries (for personnel radar) - stabilize since parameter
  const sinceISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d.toISOString();
  }, []);
  const { data: timeResp } = useSWR(
    `/api/v1/time-entries?since=${encodeURIComponent(sinceISO)}`,
    async (url: string) => {
      try {
        const res = await axiosInstance.get(url);
        return res.data?.data || [];
      } catch {
        return [] as any[];
      }
    }
  );
  const timeEntries: any[] = Array.isArray(timeResp) ? timeResp : [];

  // Maps
  const personnelById = new Map<string, any>();
  personnel.forEach((p) => personnelById.set(p._id, p));

  // Helper function to resolve personnel name consistently
  const resolvePersonnelName = (personId: string, fallbackName?: string) => {
    const personDoc = personnelById.get(personId);

    // Try different name sources in order of preference
    if (personDoc?.user?.firstName || personDoc?.user?.lastName) {
      return [personDoc.user.firstName, personDoc.user.lastName].filter(Boolean).join(' ') || 'Personnel';
    }
    if (personDoc?.user?.name) {
      return personDoc.user.name;
    }
    if (personDoc?.name) {
      return personDoc.name;
    }
    if (personDoc?.firstName || personDoc?.lastName) {
      return [personDoc.firstName, personDoc.lastName].filter(Boolean).join(' ') || 'Personnel';
    }

    return fallbackName || 'Personnel';
  };

  // ----------------- Personnel performance (radar) -----------------
  const agg = new Map<
    string,
    {
      name: string;
      tasksCompleted: number;
      totalCompletionDays: number;
      completedCount: number;
      hoursLogged: number;
      lateCount: number;
      woSet: Set<string>;
    }
  >();
  const upsert = (personId: string, name: string) => {
    if (!agg.has(personId)) {
      agg.set(personId, {
        name,
        tasksCompleted: 0,
        totalCompletionDays: 0,
        completedCount: 0,
        hoursLogged: 0,
        lateCount: 0,
        woSet: new Set<string>(),
      });
    } else {
      // If entry exists but has a generic name, update it with a better name
      const existing = agg.get(personId)!;
      if (existing.name === 'Personnel' && name !== 'Personnel') {
        existing.name = name;
      }
    }
    return agg.get(personId)!;
  };
  tasks.forEach((task: any, taskIndex: number) => {
    // Handle different assignee field names and structures
    let assignees: any[] = [];
    if (Array.isArray(task.assignee)) {
      assignees = task.assignee;
    } else if (Array.isArray(task.assignees)) {
      assignees = task.assignees;
    } else if (Array.isArray(task.personnelIds)) {
      assignees = task.personnelIds.map((id: string) => ({ id, _id: id }));
    } else if (task.assignee) {
      assignees = [task.assignee];
    }

    // Debug logging for first few tasks
    if (process.env.NODE_ENV === 'development' && taskIndex < 3) {
      console.log(`🔍 Task ${taskIndex} Debug:`, {
        taskTitle: task.title || task.name,
        taskId: task._id || task.id,
        rawAssignee: task.assignee,
        rawAssignees: task.assignees,
        rawPersonnelIds: task.personnelIds,
        processedAssignees: assignees,
        workOrderId: task.workOrderId || task.workOrder
      });
    }

    const createdAt = task.createdAt ? new Date(task.createdAt) : undefined;
    const updatedAt = task.updatedAt ? new Date(task.updatedAt) : undefined;

    // Handle different due date structures
    let dueEnd: Date | undefined;
    if (Array.isArray(task.due) && task.due[1]) {
      dueEnd = new Date(task.due[1]);
    } else if (task.dueDate) {
      dueEnd = new Date(task.dueDate);
    } else if (task.due && typeof task.due === 'string') {
      dueEnd = new Date(task.due);
    }

    // Improved completion status detection
    const isComplete = !!(
      task.completeStatus ||
      task.completed ||
      String(task.status || '').toLowerCase().includes('done') ||
      String(task.status || '').toLowerCase().includes('completed') ||
      String(task.status || '').toLowerCase().includes('complete')
    );

    const workOrderId = task.workOrderId || task.workOrder;

    assignees.forEach((a, assigneeIndex) => {
      const personId = a.id || a._id || a;
      if (!personId) return;

      // Use consistent name resolution
      const name = a.name || resolvePersonnelName(personId);

      // Debug logging for assignee processing
      if (process.env.NODE_ENV === 'development' && taskIndex < 3) {
        const personDoc = personnelById.get(personId);
        console.log(`🔍 Assignee ${assigneeIndex} Processing:`, {
          assigneeRaw: a,
          personId,
          personDoc: personDoc ? {
            _id: personDoc._id,
            user: personDoc.user,
            firstName: personDoc.firstName,
            lastName: personDoc.lastName
          } : null,
          resolvedName: name
        });
      }

      const m = upsert(personId, name);
      if (workOrderId) m.woSet.add(String(workOrderId));

      if (isComplete) {
        m.tasksCompleted += 1;
        if (createdAt && updatedAt) {
          const days = Math.max(0, (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          m.totalCompletionDays += days;
          m.completedCount += 1;
        }
        if (dueEnd && updatedAt && updatedAt.getTime() > dueEnd.getTime()) {
          m.lateCount += 1;
        }
      }
    });
  });
  timeEntries.forEach((te: any, teIndex: number) => {
    const pid = te.personnelId || te.userId || te.technicianId || te.personnel;
    if (!pid) return;

    const personDoc = personnelById.get(pid);

    // Use the consistent name resolution helper
    const name = resolvePersonnelName(pid, te.personnelName);

    // Debug logging for first few time entries
    if (process.env.NODE_ENV === 'development' && teIndex < 3) {
      console.log(`🔍 TimeEntry ${teIndex} Debug:`, {
        timeEntryId: te._id || te.id,
        personnelId: pid,
        personnelName: te.personnelName,
        personDoc: personDoc ? {
          _id: personDoc._id,
          name: personDoc.name,
          firstName: personDoc.firstName,
          lastName: personDoc.lastName,
          user: personDoc.user ? {
            _id: personDoc.user._id,
            name: personDoc.user.name,
            firstName: personDoc.user.firstName,
            lastName: personDoc.user.lastName,
            email: personDoc.user.email
          } : null
        } : null,
        resolvedName: name,
        durationData: {
          durationMinutes: te.durationMinutes,
          minutes: te.minutes,
          duration: te.duration,
          hours: te.hours,
          start: te.start,
          end: te.end
        }
      });
    }

    const m = upsert(pid, name);

    // Calculate duration from various possible fields
    let durationMin = 0;
    if (te.durationMinutes) {
      durationMin = Number(te.durationMinutes) || 0;
    } else if (te.minutes) {
      durationMin = Number(te.minutes) || 0;
    } else if (te.duration) {
      durationMin = Number(te.duration) || 0;
    } else if (te.end && te.start) {
      const start = new Date(te.start);
      const end = new Date(te.end);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        durationMin = Math.max(0, (end.getTime() - start.getTime()) / 60000);
      }
    } else if (te.hours) {
      durationMin = (Number(te.hours) || 0) * 60;
    }

    m.hoursLogged += durationMin / 60;
  });
  const rows = Array.from(agg.entries()).map(([id, v]) => {
    const avgDays = v.completedCount > 0 ? v.totalCompletionDays / v.completedCount : 0;
    const lateRatio = v.completedCount > 0 ? v.lateCount / v.completedCount : 0;
    return {
      id,
      name: v.name,
      tasksCompleted: v.tasksCompleted,
      avgCompletionDays: Math.round(avgDays * 100) / 100, // Round to 2 decimals
      hoursLogged: Math.round(v.hoursLogged * 100) / 100, // Round to 2 decimals
      lateRatio: Math.round(lateRatio * 10000) / 100, // Convert to percentage and round to 2 decimals
      woParticipations: v.woSet.size,
    };
  });

  // Debug logging for personnel performance
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Personnel Performance Debug:', {
      totalPersonnel: personnel.length,
      totalTasks: tasks.length,
      totalTimeEntries: timeEntries.length,
      personnelAggregation: Array.from(agg.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        tasksCompleted: data.tasksCompleted,
        hoursLogged: data.hoursLogged,
        woParticipations: data.woSet.size
      })),
      allRows: rows,
      activeRowsCount: rows.filter(r => r.tasksCompleted > 0 || r.hoursLogged > 0 || r.woParticipations > 0).length
    });
  }

  // Filter out personnel with no activity and sort by activity
  const activeRows = rows.filter(r => r.tasksCompleted > 0 || r.hoursLogged > 0 || r.woParticipations > 0);
  const top = activeRows
    .sort((a, b) => {
      // Primary sort: tasks completed
      if (b.tasksCompleted !== a.tasksCompleted) {
        return b.tasksCompleted - a.tasksCompleted;
      }
      // Secondary sort: hours logged
      return b.hoursLogged - a.hoursLogged;
    })
    .slice(0, 6);

  // Ensure unique series names to avoid legend key collisions
  const uniqueNameById = (() => {
    const counts = new Map<string, number>();
    const mapping = new Map<string, string>();
    top.forEach((r) => {
      const base = r.name && r.name.trim() ? r.name.trim() : 'Personnel';
      const c = counts.get(base) || 0;
      counts.set(base, c + 1);
      if (c === 0) {
        mapping.set(r.id, base);
      } else {
        const suffix = String(r.id).slice(-4);
        mapping.set(r.id, `${base} ${suffix}`);
      }
    });
    return mapping;
  })();

  const categoriesRadar = ['Tasks Completed', 'Avg Completion Days', 'Hours Logged', 'Late Rate %', 'Work Orders'];
  const tasksArr = top.map((r) => r.tasksCompleted);
  const avgDaysArr = top.map((r) => r.avgCompletionDays);
  const hoursArr = top.map((r) => r.hoursLogged);
  const lateArr = top.map((r) => r.lateRatio);
  const woArr = top.map((r) => r.woParticipations);

  // Improve normalization with better handling of edge cases
  const normalizeRadarData = (values: number[], invert = false) => {
    if (values.length === 0) return [];
    const capped = values.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
    const min = Math.min(...capped);
    const max = Math.max(...capped);

    // If all values are the same, return middle values
    if (max === min) return capped.map(() => max > 0 ? 80 : 20);

    // Normalize to 10-100 range for better radar visualization
    return capped.map((v) => {
      const ratio = (v - min) / (max - min);
      const normalized = Math.round(10 + (ratio * 90)); // Scale to 10-100
      return invert ? 110 - normalized : normalized;
    });
  };

  const seriesRadar = top.map((r, idx) => ({
    name: uniqueNameById.get(r.id) || r.name || 'Personnel',
    data: [
      normalizeRadarData(tasksArr)[idx] || 10,
      normalizeRadarData(avgDaysArr, true)[idx] || 10, // Inverted: lower days = better
      normalizeRadarData(hoursArr)[idx] || 10,
      normalizeRadarData(lateArr, true)[idx] || 10, // Inverted: lower late rate = better
      normalizeRadarData(woArr)[idx] || 10,
    ],
  }));

  // ----------------- Workload per client (pie) -----------------
  const workloadByClient = workOrders.reduce((acc: Record<string, number>, wo: any) => {
    const name = wo.clientName || wo.client?.name || (typeof wo.clientId === 'object' ? wo.clientId?.name : undefined) || 'Unknown client';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const workloadEntries = Object.entries(workloadByClient).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const workloadSeries = workloadEntries.map(([label, value]) => ({ label, value }));
  const workloadColors = useMemo(() => workloadEntries.map(() => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`), [workloadEntries.length]);


  // ----------------- Tasks created vs completed (line) -----------------
  const now = new Date();
  const weeks: Date[] = [];
  const wStart = startOfWeek(now);
  for (let i = 8; i >= 0; i -= 1) {
    const d = new Date(wStart);
    d.setDate(d.getDate() - i * 7);
    weeks.push(d);
  }
  const categoriesLine = weeks.map((w) => formatWeekLabel(w));
  const createdSeries = weeks.map((w) => {
    const start = new Date(w);
    const end = new Date(w);
    end.setDate(end.getDate() + 7);
    return tasks.filter((task: any) => {
      const c = task.createdAt ? new Date(task.createdAt) : null;
      return c && c >= start && c < end;
    }).length;
  });
  const completedSeries = weeks.map((w) => {
    const start = new Date(w);
    const end = new Date(w);
    end.setDate(end.getDate() + 7);
    return tasks.filter((task: any) => {
      const done = !!task.completeStatus || String(task.status || '').toLowerCase().includes('done');
      const u = task.updatedAt ? new Date(task.updatedAt) : null;
      return done && u && u >= start && u < end;
    }).length;
  });

  // ----------------- Widget summaries (weekly) -----------------
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weeklyWorkOrders = workOrders.filter((wo) => {
    const c = wo.createdAt ? new Date(wo.createdAt) : null;
    return c && c >= weekStart && c < weekEnd;
  }).length;
  const weeklyNewPersonnel = personnel.filter((p: any) => {
    const c = p.createdAt ? new Date(p.createdAt) : null;
    return c && c >= weekStart && c < weekEnd;
  }).length;
  const weeklyTasksCompleted = tasks.filter((task: any) => {
    const done = !!task.completeStatus || String(task.status || '').toLowerCase().includes('done');
    const u = task.updatedAt ? new Date(task.updatedAt) : null;
    return done && u && u >= weekStart && u < weekEnd;
  }).length;
  const weeklyNotifications = notifications.filter((n: any) => {
    const c = n.createdAt ? new Date(n.createdAt) : null;
    return c && c >= weekStart && c < weekEnd;
  }).length;

  // ----------------- On-time completion by client (bar) -----------------
  const byClient: Record<string, { ontime: number; total: number }> = {};
  tasks.forEach((task: any) => {
    const clientName = (task as any).clientName || (task as any).clientCompany || 'Unknown';
    const done = !!task.completeStatus || String(task.status || '').toLowerCase().includes('done');
    if (!done) return;
    const dueEnd = Array.isArray(task.due) ? (task.due[1] ? new Date(task.due[1]) : undefined) : undefined;
    const u = task.updatedAt ? new Date(task.updatedAt) : undefined;
    if (!byClient[clientName]) byClient[clientName] = { ontime: 0, total: 0 };
    byClient[clientName].total += 1;
    if (dueEnd && u && u.getTime() <= dueEnd.getTime()) byClient[clientName].ontime += 1;
  });

  // Prepare names per week for tooltip meta
  const createdNamesByWeek = useMemo(() => weeks.map((w) => {
      const start = new Date(w);
      const end = new Date(w);
      end.setDate(end.getDate() + 7);
      return tasks
        .filter((task: any) => {
          const c = task.createdAt ? new Date(task.createdAt) : null;
          return c && c >= start && c < end;
        })
        .map((task: any) => task.name || task.title || 'Untitled task');
    }), [weeks, tasks]);

  const completedNamesByWeek = useMemo(() => weeks.map((w) => {
      const start = new Date(w);
      const end = new Date(w);
      end.setDate(end.getDate() + 7);
      return tasks
        .filter((task: any) => {
          const done = !!task.completeStatus || String(task.status || '').toLowerCase().includes('done');
          const u = task.updatedAt ? new Date(task.updatedAt) : null;
          return done && u && u >= start && u < end;
        })
        .map((task: any) => task.name || task.title || 'Untitled task');
    }), [weeks, tasks]);

  // Compute taskIds (limit to 500 to avoid overload)
  const taskIds = useMemo(() => {
    const ids = (Array.isArray(tasks) ? tasks : [])
      .map((task: any) => task.id || task._id)
      .filter(Boolean) as string[];
    return ids.slice(0, 500);
  }, [tasks]);

  // Fetch subtask counts per taskId in parallel
  const { data: subtaskCountsResp } = useSWR(
    taskIds.length ? ['subtask-counts', ...taskIds] : null,
    async () => {
      const results = await Promise.all(
        taskIds.map(async (id) => {
          try {
            const res = await axiosInstance.get(`/api/v1/subtasks/${id}`);
            const arr = res.data?.data || res.data || [];
            const count = Array.isArray(arr) ? arr.length : 0;
            return { id, count };
          } catch {
            return { id, count: 0 };
          }
        })
      );
      return results.reduce((acc, { id, count }) => {
        acc[id] = count;
        return acc;
      }, {} as Record<string, number>);
    }
  );

  const subtaskCountByTask = useMemo(() => {
    const map = new Map<string, number>();
    const obj = subtaskCountsResp || {};
    Object.entries(obj).forEach(([id, count]) => map.set(id, Number(count) || 0));
    return map;
  }, [subtaskCountsResp]);

  // Top clients by workload


  // ----------------- Tasks & Subtasks per Client -----------------
  const clientAgg = useMemo(() => {
    const clientMap = new Map<string, { tasks: number; subtasks: number }>();
    (tasks || []).forEach((task: any) => {
      const clientName = (task as any).clientName || (task as any).clientCompany || 'Unknown client';
      if (!clientMap.has(clientName)) clientMap.set(clientName, { tasks: 0, subtasks: 0 });
      const entry = clientMap.get(clientName)!;
      entry.tasks += 1;
      entry.subtasks += subtaskCountByTask.get(String(task.id || task._id)) || 0;
    });
    return clientMap;
  }, [tasks, subtaskCountByTask]);

  const topClientAgg = useMemo(() => Array.from(clientAgg.entries())
      .sort((a, b) => b[1].tasks - a[1].tasks)
      .slice(0, 6), [clientAgg]);

  const categoriesClients = topClientAgg.map(([name]) => name);
  const seriesClients = [
    { name: 'Tasks', data: topClientAgg.map(([, v]) => v.tasks) },
    { name: 'Subtasks', data: topClientAgg.map(([, v]) => v.subtasks) },
  ];


  // ----------------- Work Order Timeline (Combined) -----------------
  const workOrderTimeline = useMemo(() => {
    if (!timelinesResp || !workOrders.length) {
      return {
        entries: [],
        colors: new Map()
      };
    }

    // Create a map of work orders for easy lookup
    const workOrderMap = new Map();
    workOrders.forEach(wo => {
      workOrderMap.set(wo._id, wo);
    });

    // Generate consistent colors for each work order
    const workOrderColors = new Map();
    const generateColor = (index: number) => {
      const hue = (index * 137.508) % 360; // Golden angle approximation
      return `hsl(${hue}, 70%, 55%)`;
    };

    let colorIndex = 0;
    workOrders.slice(0, 10).forEach(wo => {
      workOrderColors.set(wo.title || wo.workOrderNumber || wo._id, generateColor(colorIndex++));
    });

    // Combine all timeline entries
    const allEntries: Array<{
      id: string;
      type: string;
      title: string;
      time: string;
    }> = [];

    timelinesResp.forEach(({ workOrderId, timeline }) => {
      const workOrder = workOrderMap.get(workOrderId);
      if (!workOrder) return;

      timeline.forEach((entry: any) => {
        allEntries.push({
          id: entry._id,
          type: workOrder.title || workOrder.workOrderNumber || workOrderId, // Use work order title as type to map to colors
          title: `${workOrder.title || workOrder.workOrderNumber || 'Work Order'}: ${entry.title}`,
          time: entry.timestamp
        });
      });
    });

    // Sort by timestamp (newest first)
    allEntries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return {
      entries: allEntries.slice(0, 20), // Limit to 20 most recent entries
      colors: workOrderColors
    };
  }, [timelinesResp, workOrders]);

  // ----------------- Work Orders Estimated vs Actual -----------------
  // Pick top 10 recent work orders (we already fetched workOrders)
  const top10WO = useMemo(() => {
    const arr = Array.isArray(workOrders) ? workOrders : [];
    return arr.slice(0, 10);
  }, [workOrders]);

  // Fetch details per WO to ensure estimatedDuration/actualDuration
  const woIds = top10WO.map((wo: any) => wo._id || wo.id).filter(Boolean) as string[];
  const { data: woDetailsMap } = useSWR(
    woIds.length ? ['wo-details', ...woIds] : null,
    async () => {
      const results = await Promise.all(
        woIds.map(async (id) => {
          try {
            const res = await axiosInstance.get(endpoints.fsa.workOrders.details(id));
            return { id, data: res.data?.data || res.data };
          } catch {
            return { id, data: null };
          }
        })
      );
      const map: Record<string, any> = {};
      results.forEach(({ id, data }) => {
        map[id] = data || null;
      });
      return map;
    }
  );

  const woDurCategories = useMemo(() => top10WO.map((wo: any) => wo.title || wo.workOrderNumber || (wo._id || '').slice(-6)), [top10WO]);

  const { estSeries, actSeries } = useMemo(() => {
    const est: number[] = [];
    const act: number[] = [];

    top10WO.forEach((wo: any) => {
      const id = wo._id || wo.id;
      const details = woDetailsMap?.[id] || wo;

      // Parse estimatedDuration object: {value: 10, unit: "hours"}
      let estHours = 0;
      const estimatedDuration = (details as any)?.estimatedDuration;
      if (estimatedDuration && typeof estimatedDuration === 'object') {
        const value = Number(estimatedDuration.value) || 0;
        const unit = estimatedDuration.unit || 'minutes';

        // Convert to hours based on unit
        if (unit === 'hours') {
          estHours = value;
        } else if (unit === 'minutes') {
          estHours = value / 60;
        } else if (unit === 'days') {
          estHours = value * 24;
        } else {
          // Default to minutes if unknown unit
          estHours = value / 60;
        }
      } else if (typeof estimatedDuration === 'number') {
        // Fallback for direct number (assume minutes)
        estHours = estimatedDuration / 60;
      }

      // Parse actualDuration (should be in minutes)
      const actMin = (details as any)?.actualDuration ?? 0;
      const actHours = (Number(actMin) || 0) / 60;

      // Round to one decimal place
      est.push(Math.round(estHours * 10) / 10);
      act.push(Math.round(actHours * 10) / 10);
    });
    return { estSeries: est, actSeries: act };
  }, [top10WO, woDetailsMap]);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        {t('analytics.title')}
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title={t('analytics.workOrdersEstVsAct')}
            percent={0}
            total={weeklyWorkOrders}
            icon={
              <img
                alt="Work orders"
                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-bag.svg`}
              />
            }
            chart={{
              categories: categoriesLine,
              series: createdSeries,
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title={t('analytics.newPersonnel', { defaultValue: 'New personnel (this week)' })}
            percent={0}
            total={weeklyNewPersonnel}
            color="secondary"
            icon={
              <img
                alt="New personnel"
                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-users.svg`}
              />
            }
            chart={{
              categories: categoriesLine,
              series: createdSeries,
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title={t('analytics.tasksCreatedVsCompleted')}
            percent={0}
            total={weeklyTasksCompleted}
            color="warning"
            icon={
              <img
                alt="Tasks completed"
                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-buy.svg`}
              />
            }
            chart={{
              categories: categoriesLine,
              series: completedSeries,
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AnalyticsWidgetSummary
            title={t('analytics.notifications', { defaultValue: 'Notifications (this week)' })}
            percent={0}
            total={weeklyNotifications}
            color="error"
            icon={
              <img
                alt="Notifications"
                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-message.svg`}
              />
            }
            chart={{
              categories: categoriesLine,
              series: createdSeries,
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsCurrentVisits
            title={t('analytics.clientWorkload')}
            chart={{
              series: workloadSeries,
              colors: workloadColors,
              options: {
                tooltip: {
                  y: {
                    formatter: (val: number) => `${val} ${t('analytics.workOrders', { defaultValue: 'work orders' })}`,
                  },
                },
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsWebsiteVisits
            title={t('analytics.tasksCreatedVsCompleted')}
            subheader={t('analytics.lastWeeks', { defaultValue: 'Last 9 weeks' })}
            chart={{
              categories: categoriesLine,
              series: [
                { name: t('analytics.created', { defaultValue: 'Created' }), data: createdSeries },
                { name: t('analytics.completed', { defaultValue: 'Completed' }), data: completedSeries },
              ],
              options: {
                meta: {
                  createdTaskNames: createdNamesByWeek,
                  completedTaskNames: completedNamesByWeek,
                },
              },
            }}
          />
        </Grid>

        {/* Replace conversion card with tasks/subtasks buckets */}
        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsConversionRates
            title={t('analytics.tasksAndSubtasksPerClient')}
            subheader={t('analytics.topClients', { defaultValue: 'Top clients by task count' })}
            chart={{
              categories: categoriesClients,
              series: seriesClients,
              colors: ['#4dabf5', '#f6c343'],
              options: {
                chart: { stacked: false },
                plotOptions: { bar: { horizontal: true } },
                tooltip: { shared: true, intersect: false },
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsCurrentSubject
            title={t('analytics.personnelPerformance')}
            chart={{
              categories: categoriesRadar,
              series: seriesRadar,
            }}
          />
        </Grid>

       {/* Work Orders Estimated vs Actual */}
        <Grid size={{ xs: 12, md: 12, lg: 8 }}>
          <AnalyticsWebsiteVisits
            title={t('analytics.workOrdersEstVsAct')}
            subheader={t('analytics.topRecentWorkOrders', { defaultValue: 'Top 10 recent work orders' })}
            chart={{
              categories: woDurCategories,
              series: [
                { name: t('analytics.estimated', { defaultValue: 'Estimated (h)' }), data: estSeries },
                { name: t('analytics.actual', { defaultValue: 'Actual (h)' }), data: actSeries },
              ],
              colors: ['#64b5f6', '#ef5350'],
              options: {
                plotOptions: { bar: { horizontal: false } },
                tooltip: { y: { formatter: (val: number) => `${val} h` } },
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsOrderTimeline
            title={t('analytics.orderTimeline', { defaultValue: 'Order timeline' })}
            subheader={t('analytics.latestUpdates')}
            list={workOrderTimeline.entries || []}
            colorMap={workOrderTimeline.colors}
          />
        </Grid>

     

       
      </Grid>
    </DashboardContent>
  );
}
