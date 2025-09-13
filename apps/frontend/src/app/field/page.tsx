'use client';

import { useRouter } from 'next/navigation';

import { Box, Card, Typography, CardContent } from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { MobileCard, MobileButton } from 'src/components/mobile';

// Mock data based on backend models
interface MockTask {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  location: string;
  assignees: string[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface MockMaterial {
  _id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  barcode: string;
  unit: string;
  unitCost: number;
  quantity: number;
  minimumStock: number;
  location: string;
  supplier: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export default function FieldDashboard() {
  const router = useRouter();

  // Mock data based on backend models
  const stats = [
    { label: 'Today&apos;s Tasks', value: 8, icon: 'solar:clipboard-list-bold', color: 'primary' },
    { label: 'Completed', value: 5, icon: 'solar:check-circle-bold', color: 'success' },
    { label: 'Pending', value: 3, icon: 'solar:clock-circle-bold', color: 'warning' },
    { label: 'This Week', value: 24, icon: 'solar:chart-bold', color: 'info' },
  ];

  const upcomingTasks: MockTask[] = [
    {
      _id: '1',
      title: 'Install HVAC System',
      description: 'Complete installation of the new HVAC system in Building A',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2024-01-15T09:00:00Z',
      estimatedHours: 8,
      actualHours: 4,
      location: 'Building A - Floor 2',
      assignees: ['personnel1'],
      projectId: 'project1',
      createdAt: '2024-01-10T08:00:00Z',
      updatedAt: '2024-01-14T10:30:00Z',
    },
    {
      _id: '2',
      title: 'Electrical Inspection',
      description: 'Perform electrical safety inspection and testing',
      status: 'pending',
      priority: 'medium',
      dueDate: '2024-01-15T11:30:00Z',
      estimatedHours: 4,
      location: 'Building B - Basement',
      assignees: ['personnel2'],
      projectId: 'project2',
      createdAt: '2024-01-12T09:00:00Z',
      updatedAt: '2024-01-14T14:20:00Z',
    },
    {
      _id: '3',
      title: 'Material Pickup',
      description: 'Pick up materials from supplier warehouse',
      status: 'pending',
      priority: 'low',
      dueDate: '2024-01-15T14:00:00Z',
      estimatedHours: 2,
      location: 'Supplier Warehouse - Downtown',
      assignees: ['personnel1'],
      projectId: 'project1',
      createdAt: '2024-01-13T16:00:00Z',
      updatedAt: '2024-01-14T16:00:00Z',
    },
  ];

  const lowStockMaterials: MockMaterial[] = [
    {
      _id: '1',
      name: 'Steel Bolts M8x20',
      description: 'Stainless steel bolts for structural connections',
      category: 'Hardware',
      sku: 'SB-M8-20',
      barcode: '1234567890123',
      unit: 'pcs',
      unitCost: 0.25,
      quantity: 15,
      minimumStock: 50,
      location: 'Warehouse A - Shelf 3',
      supplier: 'SteelCorp Inc.',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-14T12:00:00Z',
    },
    {
      _id: '2',
      name: 'Electrical Wire 12AWG',
      description: 'Copper electrical wire for installations',
      category: 'Electrical',
      sku: 'EW-12AWG-100',
      barcode: '1234567890124',
      unit: 'ft',
      unitCost: 1.5,
      quantity: 25,
      minimumStock: 100,
      location: 'Warehouse B - Rack 2',
      supplier: 'WireWorks Ltd.',
      status: 'active',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-14T15:30:00Z',
    },
  ];

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
              const dueTime = new Date(task.dueDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              const progress =
                task.actualHours && task.estimatedHours
                  ? Math.round((task.actualHours / task.estimatedHours) * 100)
                  : 0;

              return (
                <MobileCard
                  key={task._id}
                  title={task.title}
                  subtitle={task.location}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  progress={progress}
                  timestamp={dueTime}
                  onTap={() => console.log('Navigate to task:', task._id)}
                  swipeable
                  onSwipeRight={() => console.log('Start task:', task._id)}
                  onSwipeLeft={() => console.log('Complete task:', task._id)}
                />
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
              title="View Reports"
              icon={<Iconify icon="solar:document-text-bold" width={24} />}
              onTap={() => router.push('/field/reports')}
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
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
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
    </Box>
  );
}
