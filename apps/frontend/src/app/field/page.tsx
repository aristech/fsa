'use client';

import { Box, Card, CardContent, Typography, Grid, Chip } from '@mui/material';
import { CalendarToday, Assignment, CheckCircle, Schedule, TrendingUp } from '@mui/icons-material';

export default function FieldDashboard() {
  // Mock data - will be replaced with real data
  const stats = [
    { label: "Today's Tasks", value: 8, icon: Assignment, color: 'primary' },
    { label: 'Completed', value: 5, icon: CheckCircle, color: 'success' },
    { label: 'Pending', value: 3, icon: Schedule, color: 'warning' },
    { label: 'This Week', value: 24, icon: TrendingUp, color: 'info' },
  ];

  const upcomingTasks = [
    { id: 1, title: 'Install HVAC System', time: '9:00 AM', priority: 'high' },
    { id: 2, title: 'Electrical Inspection', time: '11:30 AM', priority: 'medium' },
    { id: 3, title: 'Material Pickup', time: '2:00 PM', priority: 'low' },
  ];

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Good Morning! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's your schedule for today
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card
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
                  <stat.icon
                    sx={{
                      fontSize: { xs: '2rem', sm: '1.5rem' },
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
          </Grid>
        ))}
      </Grid>

      {/* Upcoming Tasks */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Upcoming Tasks
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upcomingTasks.map((task) => (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  // Mobile-friendly touch target
                  minHeight: '60px',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '1rem', sm: '0.875rem' },
                    }}
                  >
                    {task.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' } }}
                  >
                    {task.time}
                  </Typography>
                </Box>
                <Chip
                  label={task.priority}
                  size="small"
                  color={
                    task.priority === 'high'
                      ? 'error'
                      : task.priority === 'medium'
                        ? 'warning'
                        : 'default'
                  }
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.625rem' },
                    height: { xs: '28px', sm: '24px' },
                  }}
                />
              </Box>
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
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card
                variant="outlined"
                sx={{
                  padding: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                  minHeight: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box>
                  <CalendarToday sx={{ fontSize: '2rem', mb: 1 }} />
                  <Typography variant="body2">View Calendar</Typography>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card
                variant="outlined"
                sx={{
                  padding: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                  minHeight: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box>
                  <Assignment sx={{ fontSize: '2rem', mb: 1 }} />
                  <Typography variant="body2">Start Task</Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
