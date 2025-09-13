'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';

import { Box, Chip, Divider, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface ReportOverviewTabProps {
  report: IReport;
  onUpdate: (updatedReport: IReport) => void;
}

export function ReportOverviewTab({ report }: ReportOverviewTabProps) {
  const formatDateTime = (date: string | Date) => dayjs(date).format('MMM DD, YYYY HH:mm');

  const renderInfoRow = (label: string, value: any, icon?: string) => {
    if (!value) return null;

    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
          {icon && <Iconify icon={icon} width={16} />}
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {label}:
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {value}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Description */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Description
        </Typography>
        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
          {report.description}
        </Typography>
      </Box>

      <Divider />

      {/* Basic Information */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Report Information
        </Typography>

        {renderInfoRow('Report Date', dayjs(report.reportDate).format('MMMM DD, YYYY'), 'eva:calendar-fill')}
        {renderInfoRow('Type', report.type.charAt(0).toUpperCase() + report.type.slice(1), 'eva:file-text-fill')}
        {renderInfoRow('Priority', report.priority.charAt(0).toUpperCase() + report.priority.slice(1), 'eva:flag-fill')}
        {renderInfoRow('Location', report.location, 'eva:pin-fill')}
        {renderInfoRow('Weather', report.weather, 'eva:cloud-fill')}
      </Box>

      <Divider />

      {/* Related Records */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Related Information
        </Typography>

        {report.client && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Iconify icon="eva:people-fill" width={16} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Client:
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ ml: 3 }}>
              {report.client.name}
              {report.client.company && ` (${report.client.company})`}
            </Typography>
            {report.client.email && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                {report.client.email}
              </Typography>
            )}
          </Box>
        )}

        {report.workOrder && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Iconify icon="eva:folder-fill" width={16} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Work Order:
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ ml: 3 }}>
              {report.workOrder.number} - {report.workOrder.title}
            </Typography>
            {report.workOrder.description && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                {report.workOrder.description}
              </Typography>
            )}
          </Box>
        )}

        {report.tasks && report.tasks.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Iconify icon="eva:checkmark-square-fill" width={16} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Related Tasks:
              </Typography>
            </Box>
            <Box sx={{ ml: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {report.tasks.map((task) => (
                <Chip
                  key={task._id}
                  label={task.name}
                  size="small"
                  variant="outlined"
                  color={task.status === 'completed' ? 'success' : 'default'}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Equipment */}
      {report.equipment && report.equipment.length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Equipment Used
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {report.equipment.map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  icon={<Iconify icon="eva:settings-fill" width={14} />}
                />
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Tags */}
      {report.tags && report.tags.length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {report.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Cost Summary */}
      {(report.totalMaterialCost > 0 || report.totalLaborCost > 0) && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Cost Summary
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Material Cost:</Typography>
                <Typography variant="body2">${report.totalMaterialCost.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Labor Cost:</Typography>
                <Typography variant="body2">${report.totalLaborCost.toFixed(2)}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Total Cost:
                </Typography>
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                  ${report.totalCost.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </>
      )}

      {/* Quality Checks */}
      {report.qualityChecks && report.qualityChecks.length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Quality Checks
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {report.qualityChecks.map((check) => (
                <Box key={check._id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Iconify
                    icon={
                      check.status === 'pass'
                        ? 'eva:checkmark-circle-fill'
                        : check.status === 'fail'
                        ? 'eva:close-circle-fill'
                        : 'eva:minus-circle-fill'
                    }
                    color={
                      check.status === 'pass'
                        ? 'success.main'
                        : check.status === 'fail'
                        ? 'error.main'
                        : 'grey.500'
                    }
                    width={20}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">{check.item}</Typography>
                    {check.notes && (
                      <Typography variant="caption" color="text.secondary">
                        {check.notes}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={check.status.toUpperCase()}
                    size="small"
                    color={
                      check.status === 'pass'
                        ? 'success'
                        : check.status === 'fail'
                        ? 'error'
                        : 'default'
                    }
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Safety Incidents */}
      {report.safetyIncidents && report.safetyIncidents.length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
              Safety Incidents
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {report.safetyIncidents.map((incident) => (
                <Box
                  key={incident._id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'error.light',
                    borderRadius: 1,
                    bgcolor: 'error.lighter',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {incident.type}
                    </Typography>
                    <Chip
                      label={incident.severity}
                      size="small"
                      color={incident.severity === 'high' ? 'error' : incident.severity === 'medium' ? 'warning' : 'default'}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {incident.description}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Action Taken:</strong> {incident.actionTaken}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reported: {formatDateTime(incident.reportedAt)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Client Feedback */}
      {report.clientFeedback && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Client Feedback
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2">Rating:</Typography>
              {Array.from({ length: 5 }).map((_, index) => (
                <Iconify
                  key={index}
                  icon="eva:star-fill"
                  width={16}
                  color={index < report.clientFeedback!.rating ? 'warning.main' : 'grey.300'}
                />
              ))}
              <Typography variant="body2" color="text.secondary">
                ({report.clientFeedback.rating}/5)
              </Typography>
            </Box>
            {report.clientFeedback.comments && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                &ldquo;{report.clientFeedback.comments}&rdquo;
              </Typography>
            )}
            {report.clientFeedback.submittedAt && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Submitted: {formatDateTime(report.clientFeedback.submittedAt)}
                {report.clientFeedback.submittedBy && ` by ${report.clientFeedback.submittedBy}`}
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* System Information */}
      <Divider />
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          System Information
        </Typography>

        {renderInfoRow('Created', formatDateTime(report.createdAt), 'eva:plus-circle-fill')}
        {renderInfoRow('Last Updated', formatDateTime(report.updatedAt), 'eva:edit-fill')}

        {report.submittedAt && renderInfoRow('Submitted', formatDateTime(report.submittedAt), 'eva:paper-plane-fill')}

        {report.approvedAt && report.approvedBy && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Iconify icon="eva:checkmark-circle-fill" width={16} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Approved:
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ ml: 3 }}>
              {formatDateTime(report.approvedAt)} by {report.approvedBy.name}
            </Typography>
          </Box>
        )}

        {report.rejectedAt && report.rejectedBy && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Iconify icon="eva:close-circle-fill" width={16} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Rejected:
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ ml: 3 }}>
              {formatDateTime(report.rejectedAt)} by {report.rejectedBy.name}
            </Typography>
            {report.rejectionReason && (
              <Typography variant="caption" color="error.main" sx={{ ml: 3, display: 'block', mt: 0.5 }}>
                Reason: {report.rejectionReason}
              </Typography>
            )}
          </Box>
        )}

        {renderInfoRow('Version', report.version, 'eva:archive-fill')}
      </Box>
    </Box>
  );
}