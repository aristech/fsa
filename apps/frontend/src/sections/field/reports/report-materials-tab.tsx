'use client';

import type { IReport } from 'src/lib/models/Report';

import { Box, Typography } from '@mui/material';

// ----------------------------------------------------------------------

interface ReportMaterialsTabProps {
  report: IReport;
  onUpdate: (updatedReport: IReport) => void;
  canEdit: boolean;
}

export function ReportMaterialsTab({ report, onUpdate, canEdit }: ReportMaterialsTabProps) {
  // For now, reuse the materials section from ReportDetailsView
  // In a full implementation, this would be a dedicated materials management component

  if (!canEdit && (!report.materialsUsed || report.materialsUsed.length === 0)) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Materials Used
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No materials were recorded for this report.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Materials Used in Report
      </Typography>
      {/* This would integrate the materials section from ReportDetailsView */}
      {/* For now, showing basic info */}
      <Typography variant="body2" color="text.secondary">
        Materials functionality is integrated in the main report view. Navigate to the Materials tab
        in task details for full material management.
      </Typography>
    </Box>
  );
}
