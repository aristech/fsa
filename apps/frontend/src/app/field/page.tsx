'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Box, Card, Typography, CardContent, Avatar, AvatarGroup, Chip, Stack } from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { MobileCard, MobileButton } from 'src/components/mobile';
import axios, { endpoints } from 'src/lib/axios';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';

export default function FieldDashboard() {
  const router = useRouter();
  const { authenticated, loading } = useAuthContext();

  // Real data
  const [tasks, setTasks] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    if (!authenticated) return;

    let active = true;
    const load = async () => {
      try {
        const [kanbanRes, materialsRes] = await Promise.all([
          axios.get(endpoints.kanban),
          axios.get(endpoints.fsa.materials.list),
        ]);
        if (!active) return;
        const board = kanbanRes.data?.data?.board || kanbanRes.data?.board || null;
        const boardTasks = board?.tasks || [];
        setTasks(Array.isArray(boardTasks) ? boardTasks : []);
        setMaterials(
          Array.isArray(materialsRes.data?.data) ? materialsRes.data.data : materialsRes.data || []
        );
      } catch (e) {
        // Soft-fail to empty lists
        setTasks([]);
        setMaterials([]);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [authenticated]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => {
      const s = (t?.status?.slug || t?.status || t?.columnSlug || '').toString().toLowerCase();
      return s.includes('done') || s.includes('complete');
    }).length;
    const pending = tasks.filter((t) => {
      const s = (t?.status?.slug || t?.status || t?.columnSlug || '').toString().toLowerCase();
      return s.includes('pending') || s.includes('todo') || s.includes('backlog') || s === '';
    }).length;
    return [
      { label: "Today's Tasks", value: total, icon: 'solar:clipboard-list-bold', color: 'primary' },
      { label: 'Completed', value: completed, icon: 'solar:check-circle-bold', color: 'success' },
      { label: 'Pending', value: pending, icon: 'solar:clock-circle-bold', color: 'warning' },
      { label: 'This Week', value: Math.max(total, completed + pending), icon: 'solar:chart-bold', color: 'info' },
    ];
  }, [tasks]);

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const upcomingTasks = useMemo(() => {
    return tasks.slice(0, 5).map((t) => {
      const start = Array.isArray(t.due) ? t.due[0] : undefined;
      const end = Array.isArray(t.due) ? t.due[1] : undefined;
      const attachmentsCount = Array.isArray(t.attachments) ? t.attachments.length : 0;
      return {
        _id: t.id || t._id || t.uid || String(t.taskId || ''),
        title: t.name || t.title || 'Untitled Task',
        description: t.description || '',
        status: (t?.status?.slug || t?.status || t?.columnSlug || 'pending').toString().toLowerCase(),
        priority: (t?.priority?.slug || t?.priority || 'medium').toString().toLowerCase(),
        startDate: start,
        dueDate: end || new Date().toISOString(),
        estimatedHours: t.estimatedHours || t.estimated_hours || 0,
        actualHours: t.actualHours || t.actual_hours || 0,
        location: t.location || t.site || '—',
        clientName: t.clientName || t.clientCompany || undefined,
        workOrderNumber: t.workOrderNumber || undefined,
        workOrderTitle: t.workOrderTitle || undefined,
        attachmentsCount,
        assignees: Array.isArray(t.assignee) ? t.assignee : [],
        completeStatus: !!t.completeStatus,
      };
    });
  }, [tasks]);

  const lowStockMaterials = useMemo(() => {
    return materials
      .filter((m) => (m.quantity ?? 0) <= (m.minimumStock ?? m.minimum_stock ?? 0))
      .slice(0, 5)
      .map((m) => ({
        _id: m.id || m._id,
        name: m.name,
        sku: m.sku || '—',
        unit: m.unit || '',
        quantity: m.quantity ?? 0,
        minimumStock: m.minimumStock ?? m.minimum_stock ?? 0,
        location: m.location || '—',
      }));
  }, [materials]);

  if (loading) {
    return <Box sx={{ p: 3 }} />;
  }

  if (!authenticated) {
    return (
      <Box sx={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Field Portal
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please sign in to view your schedule and tasks.
        </Typography>
        <MobileButton
          variant="primary"
          size="large"
          fullWidth
          icon={<Iconify icon="solar:login-2-bold" width={20} />}
          onClick={() => router.push('/auth/jwt/sign-in?returnTo=/field')}
        >
          Sign in
        </MobileButton>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Good Morning! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here is your schedule for today
        </Typography>
      </Box>
        {/* Action Buttons */}
      <Box sx={{ m: 3, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <MobileButton
          variant="primary"
          size="large"
          fullWidth
          icon={<Iconify icon="solar:calendar-bold" width={20} />}
          onClick={() => router.push('/field/calendar')}
        >
          View Calendar
        </MobileButton>
        <MobileButton
          variant="secondary"
          size="large"
          fullWidth
          icon={<Iconify icon="solar:clipboard-list-bold" width={20} />}
          onClick={() => router.push('/field/tasks')}
        >
          View Tasks
        </MobileButton>
        <MobileButton
          variant="outline"
          size="large"
          fullWidth
          icon={<Iconify icon="solar:document-text-bold" width={20} />}
          onClick={() => router.push('/field/reports')}
        >
          Create Report
        </MobileButton>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        {stats.map((stat, index) => (
          <Card
            key={index}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 2,
              textAlign: 'center',
              // Mobile-first: larger touch targets
              minHeight: { xs: '120px', sm: '100px' },
            }}
          >
            <CardContent sx={{ padding: '16px !important' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Iconify
                  icon={stat.icon}
                  width={24}
                  sx={{
                    color: `${stat.color}.main`,
                  }}
                />
                <Typography
                  variant="h4"
                  component="div"
                  sx={{
                    fontSize: { xs: '1.5rem', sm: '1.25rem' },
                    fontWeight: 'bold',
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '0.75rem' },
                    textAlign: 'center',
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Upcoming Tasks */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Upcoming Tasks
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upcomingTasks.map((task) => {
              const dueTime = formatTime(task.dueDate);
              const startTime = formatTime(task.startDate);
              const subtitleParts = [task.clientName, task.workOrderNumber && `${task.workOrderNumber}`].filter(Boolean);

              return (
                <MobileCard
                  key={task._id}
                  title={task.title}
                  subtitle={subtitleParts.join(' • ') || undefined}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  progress={task.actualHours && task.estimatedHours ? Math.round((task.actualHours / task.estimatedHours) * 100) : 0}
                  timestamp={dueTime}
                  badge={task.attachmentsCount > 0 ? task.attachmentsCount : undefined}
                  onTap={() => console.log('Navigate to task:', task._id)}
                  swipeable
                  onSwipeRight={() => console.log('Start task:', task._id)}
                  onSwipeLeft={() => console.log('Complete task:', task._id)}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                    {/* Assignees */}
                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                      {task.assignees?.map((a: any) => (
                        <Avatar key={a.id} src={a.avatarUrl || ''}>{a.initials || a.name?.[0] || 'A'}</Avatar>
                      ))}
                    </AvatarGroup>

                    {/* Start - Due time and Completed chip */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      {(startTime || dueTime) && (
                        <Typography variant="caption" color="text.secondary">
                          {startTime && dueTime ? `${startTime} – ${dueTime}` : (startTime || dueTime)}
                        </Typography>
                      )}
                      {task.completeStatus && (
                        <Chip size="small" color="success" label="Completed" sx={{ height: 20, fontSize: 10 }} />
                      )}
                    </Stack>
                  </Stack>
                </MobileCard>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Low Stock Materials */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Low Stock Materials
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {lowStockMaterials.map((material) => (
              <MobileCard
                key={material._id}
                title={material.name}
                subtitle={`SKU: ${material.sku}`}
                description={`${material.quantity} ${material.unit} remaining (Min: ${material.minimumStock})`}
                status="pending"
                priority="high"
                badge={`${material.quantity}`}
                timestamp={material.location}
                onTap={() => console.log('View material:', material._id)}
                swipeable
                onSwipeRight={() => console.log('Request material:', material._id)}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Quick Actions
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            <MobileCard
              size="small"
              variant="outlined"
              title="View Calendar"
              icon={<Iconify icon="solar:calendar-bold" width={24} />}
              onTap={() => router.push('/field/calendar')}
              sx={{ textAlign: 'center', cursor: 'pointer' }}
            />
             <MobileCard
              size="small"
              variant="outlined"
              title="View Tasks"
              icon={<Iconify icon="solar:clipboard-list-bold" width={24} />}
              onTap={() => router.push('/field/tasks')}
              sx={{ textAlign: 'center', cursor: 'pointer' }}
            />
            <MobileCard
              size="small"
              variant="outlined"
              title="View Reports"
              icon={<Iconify icon="solar:document-text-bold" width={24} />}
              onTap={() => router.push('/field/reports')}
              sx={{ textAlign: 'center', cursor: 'pointer' }}
            />
           
          </Box>
        </CardContent>
      </Card>

    
    </Box>
  );
}
