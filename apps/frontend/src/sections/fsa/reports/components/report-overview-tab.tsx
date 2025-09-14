'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';

import { Box, Grid, Card, Chip, Stack, Typography, CardContent } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface ReportOverviewTabProps {
  report: IReport;
  onUpdate: (report: IReport) => void;
}

export function ReportOverviewTab({ report, onUpdate }: ReportOverviewTabProps) {
  return (
    <Stack spacing={3}>
      {/* Basic Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Report Type
                </Typography>
                <Chip label={report.type} size="small" sx={{ textTransform: 'capitalize' }} />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Status
                </Typography>
                <Chip
                  label={report.status.replace('_', ' ')}
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Priority
                </Typography>
                <Chip label={report.priority} size="small" sx={{ textTransform: 'capitalize' }} />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Report Date
                </Typography>
                <Typography variant="body2">
                  {dayjs(report.reportDate).format('MMM DD, YYYY')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Location
                </Typography>
                <Typography variant="body2">{report.location || 'Not specified'}</Typography>
              </Box>
            </Grid>
            {report.weather && (
              <Grid size={{ xs: 12 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Weather Conditions
                  </Typography>
                  <Typography variant="body2">{report.weather}</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
      {/* Related Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Related Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Created By
                </Typography>
                <Typography variant="body2">
                  {report.createdBy?.name ||
                    report.createdByData?.name ||
                    report.createdBy?.email ||
                    report.createdByData?.email ||
                    'Unknown User'}
                </Typography>
              </Box>
            </Grid>
            {report.assignedTo && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Assigned To
                  </Typography>
                  <Typography variant="body2">{report.assignedTo.name}</Typography>
                </Box>
              </Grid>
            )}
            {(report.clientId || report.client) && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Client
                  </Typography>
                  <Typography variant="body2">
                    {report.client?.name || report.clientData?.name}
                    {(report.client?.company || report.clientData?.company) &&
                      ` (${report.client?.company || report.clientData?.company})`}
                  </Typography>
                </Box>
              </Grid>
            )}
            {(report.workOrderId || report.workOrder) && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Work Order
                  </Typography>
                  <Typography variant="body2">
                    {report.workOrder?.number || report.workOrderData?.number} -{' '}
                    {report.workOrder?.title || report.workOrderData?.title}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
      {/* Cost Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Cost Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  ${report.totalCost.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Cost
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                  ${report.totalMaterialCost.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Material Cost
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                  ${report.totalLaborCost.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Labor Cost
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Time Summary */}
      {report?.totalHours !== undefined && report.totalHours > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Time Summary
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                {report.totalHours.toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Hours
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
      {/* Equipment */}
      {report.equipment && report.equipment.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Equipment Used
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {report.equipment.map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  size="small"
                  icon={<Iconify icon="eva:settings-fill" width={16} />}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
      {/* Tags */}
      {report.tags && report.tags.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {report.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" color="primary" variant="outlined" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
      {/* System Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            System Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Created At
                </Typography>
                <Typography variant="body2">
                  {dayjs(report.createdAt).format('MMM DD, YYYY HH:mm')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {dayjs(report.updatedAt).format('MMM DD, YYYY HH:mm')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Version
                </Typography>
                <Typography variant="body2">v{report.version}</Typography>
              </Box>
            </Grid>
            {report.submittedAt && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Submitted At
                  </Typography>
                  <Typography variant="body2">
                    {dayjs(report.submittedAt).format('MMM DD, YYYY HH:mm')}
                  </Typography>
                </Box>
              </Grid>
            )}
            {report.approvedAt && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Approved At
                  </Typography>
                  <Typography variant="body2">
                    {dayjs(report.approvedAt).format('MMM DD, YYYY HH:mm')}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}
