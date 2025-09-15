'use client';

import type { IReport } from 'src/lib/models/Report';

import {
  Box,
  Stack,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
} from '@mui/material';

import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

interface ReportMaterialsTabProps {
  report: IReport;
  onUpdate: (report: IReport) => void;
  canEdit: boolean;
}

export function ReportMaterialsTab({ report, onUpdate, canEdit }: ReportMaterialsTabProps) {
  const materials = report.materialsUsed || [];

  if (materials.length === 0) {
    return (
      <EmptyContent
        title="No materials used"
        description="No materials have been added to this report yet"
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Materials Used ({materials.length})
        </Typography>

        <TableContainer>
          <Scrollbar>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">Total Cost</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {material.material.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {material.material.unit}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{material.material.sku || '-'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {material.quantityUsed}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">${material.unitCost.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${material.totalCost.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {material.notes || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>
      </Box>

      {/* Summary */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
          border: 1,
          borderColor: 'grey.200',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Total Material Cost:</Typography>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            ${report.totalMaterialCost.toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}
