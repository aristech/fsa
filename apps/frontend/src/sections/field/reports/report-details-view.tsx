'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import {
  Box,
  Chip,
  Table,
  Avatar,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Typography,
  TableContainer,
  InputAdornment,
} from '@mui/material';

import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import {
  MobileCard,
  MobileModal,
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileDatePicker,
} from 'src/components/mobile';

// ----------------------------------------------------------------------

interface ReportDetailsViewProps {
  report: IReport;
  onUpdate: (updatedReport: IReport) => void;
}

interface AddMaterialDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (materialId: string, quantity: number, notes?: string) => void;
}

interface AddTimeEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    description: string;
    startTime: Date;
    endTime: Date;
    category: 'labor' | 'travel' | 'waiting' | 'equipment' | 'other';
  }) => void;
}

// Mock materials data
const mockMaterials = [
  {
    _id: 'mat-1',
    name: 'Steel Pipe 50mm',
    sku: 'SP-50-001',
    unit: 'pcs',
    unitCost: 25.5,
    quantity: 100,
  },
  {
    _id: 'mat-2',
    name: 'PVC Elbow 90°',
    sku: 'PVC-E90-001',
    unit: 'pcs',
    unitCost: 5.25,
    quantity: 250,
  },
  {
    _id: 'mat-3',
    name: 'Copper Wire 2.5mm²',
    sku: 'CW-25-001',
    unit: 'm',
    unitCost: 2.75,
    quantity: 1000,
  },
];

const timeCategories = [
  { value: 'labor', label: 'Labor' },
  { value: 'travel', label: 'Travel' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

function AddMaterialDialog({ open, onClose, onAdd }: AddMaterialDialogProps) {
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleAdd = useCallback(() => {
    if (selectedMaterial && quantity > 0) {
      onAdd(selectedMaterial, quantity, notes.trim() || undefined);
      setSelectedMaterial('');
      setQuantity(1);
      setNotes('');
      onClose();
    }
  }, [selectedMaterial, quantity, notes, onAdd, onClose]);

  const selectedMaterialData = mockMaterials.find((m) => m._id === selectedMaterial);

  return (
    <MobileModal
      open={open}
      onClose={onClose}
      title="Add Material Usage"
      size="medium"
      actions={
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          <MobileButton variant="outline" onClick={onClose}>
            Cancel
          </MobileButton>
          <MobileButton
            variant="primary"
            onClick={handleAdd}
            disabled={!selectedMaterial || quantity <= 0}
          >
            Add Material
          </MobileButton>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <MobileSelect
          label="Material"
          value={selectedMaterial}
          onChange={setSelectedMaterial}
          options={[
            { value: '', label: 'Select material...' },
            ...mockMaterials.map((m) => ({
              value: m._id,
              label: `${m.name} (${m.sku}) - $${m.unitCost}/${m.unit}`,
            })),
          ]}
        />

        {selectedMaterialData && (
          <MobileCard variant="outlined" size="small">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light' }}>
                <Iconify icon="solar:box-bold" />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{selectedMaterialData.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  ${selectedMaterialData.unitCost} per {selectedMaterialData.unit} • Stock:{' '}
                  {selectedMaterialData.quantity}
                </Typography>
              </Box>
            </Box>
          </MobileCard>
        )}

        <MobileInput
          label="Quantity Used"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          inputProps={{ min: 1, step: 1 }}
          slotProps={{
            input: {
              endAdornment: selectedMaterialData && (
                <InputAdornment position="end">{selectedMaterialData.unit}</InputAdornment>
              ),
            },
          }}
        />

        <MobileInput
          label="Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about material usage..."
          multiline
          rows={3}
        />

        {selectedMaterialData && quantity > 0 && (
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
            <Typography variant="body2" color="success.darker">
              Total Cost: ${(selectedMaterialData.unitCost * quantity).toFixed(2)}
            </Typography>
          </Box>
        )}
      </Box>
    </MobileModal>
  );
}

function AddTimeEntryDialog({ open, onClose, onAdd }: AddTimeEntryDialogProps) {
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState<dayjs.Dayjs | null>(dayjs());
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(dayjs().add(1, 'hour'));
  const [category, setCategory] = useState('labor');

  const handleAdd = useCallback(() => {
    if (description.trim() && startTime && endTime && endTime.isAfter(startTime)) {
      onAdd({
        description: description.trim(),
        startTime: startTime.toDate(),
        endTime: endTime.toDate(),
        category: category as 'labor' | 'travel' | 'waiting' | 'equipment' | 'other',
      });
      setDescription('');
      setStartTime(dayjs());
      setEndTime(dayjs().add(1, 'hour'));
      setCategory('labor');
      onClose();
    }
  }, [description, startTime, endTime, category, onAdd, onClose]);

  const duration =
    startTime && endTime && endTime.isAfter(startTime) ? endTime.diff(startTime, 'minute') : 0;

  return (
    <MobileModal
      open={open}
      onClose={onClose}
      title="Add Time Entry"
      size="medium"
      actions={
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          <MobileButton variant="outline" onClick={onClose}>
            Cancel
          </MobileButton>
          <MobileButton
            variant="primary"
            onClick={handleAdd}
            disabled={!description.trim() || !startTime || !endTime || !endTime.isAfter(startTime)}
          >
            Add Time Entry
          </MobileButton>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <MobileInput
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the work performed..."
          multiline
          rows={3}
        />

        <MobileSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={timeCategories}
        />

        <MobileDatePicker label="Start Time" value={startTime} onChange={setStartTime} />

        <MobileDatePicker label="End Time" value={endTime} onChange={setEndTime} />

        {duration > 0 && (
          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="body2" color="info.darker">
              Duration: {Math.floor(duration / 60)}h {duration % 60}m
            </Typography>
          </Box>
        )}
      </Box>
    </MobileModal>
  );
}

export function ReportDetailsView({ report, onUpdate }: ReportDetailsViewProps) {
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [addTimeEntryOpen, setAddTimeEntryOpen] = useState(false);

  const handleAddMaterial = useCallback(
    async (materialId: string, quantityUsed: number, notes?: string) => {
      try {
        const response = await ReportService.addMaterialUsage(report._id, {
          materialId,
          quantityUsed,
          notes,
        });

        if (response.success) {
          toast.success('Material added to report');
          // In a real app, refetch the report data
          // onUpdate(updatedReport);
        } else {
          toast.error('Failed to add material');
        }
      } catch (error) {
        console.error('Error adding material:', error);
        toast.error('Failed to add material');
      }
    },
    [report._id]
  );

  const handleAddTimeEntry = useCallback(
    async (data: {
      description: string;
      startTime: Date;
      endTime: Date;
      category: 'labor' | 'travel' | 'waiting' | 'equipment' | 'other';
    }) => {
      try {
        const response = await ReportService.addTimeEntry(report._id, data);

        if (response.success) {
          toast.success('Time entry added to report');
          // In a real app, refetch the report data
          // onUpdate(updatedReport);
        } else {
          toast.error('Failed to add time entry');
        }
      } catch (error) {
        console.error('Error adding time entry:', error);
        toast.error('Failed to add time entry');
      }
    },
    [report._id]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'submitted':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'published':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <MobileCard>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
            <Iconify icon="solar:document-text-bold" width={24} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip label={report.type} size="small" sx={{ textTransform: 'capitalize' }} />
              <Chip
                label={report.status}
                color={getStatusColor(report.status) as any}
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
              <Chip
                label={report.priority}
                color={
                  report.priority === 'high' || report.priority === 'urgent' ? 'error' : 'default'
                }
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {dayjs(report.reportDate).format('MMM DD, YYYY')} • Created by {report.createdBy.name}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body1" sx={{ mb: 2 }}>
          {report.location || 'No location specified'}
        </Typography>

        {report.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Iconify icon="eva:pin-fill" width={16} />
            <Typography variant="body2" color="text.secondary">
              {report.location}
            </Typography>
          </Box>
        )}

        {report.weather && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="eva:cloud-fill" width={16} />
            <Typography variant="body2" color="text.secondary">
              {report.weather}
            </Typography>
          </Box>
        )}
      </MobileCard>

      {/* Materials Used */}
      <MobileCard>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Materials Used ({report.materialsUsed?.length || 0})
          </Typography>
          <MobileButton
            variant="outline"
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setAddMaterialOpen(true)}
          >
            Add Material
          </MobileButton>
        </Box>

        {report.materialsUsed && report.materialsUsed.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.materialsUsed.map((material) => (
                  <TableRow key={material._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.lighter' }}>
                          <Iconify icon="solar:box-bold" width={12} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {material.material.name}
                          </Typography>
                          {material.material.sku && (
                            <Typography variant="caption" color="text.secondary">
                              {material.material.sku}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {material.quantityUsed} {material.material.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatCurrency(material.totalCost)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography variant="subtitle2">Total Material Cost</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="primary">
                      {formatCurrency(report.totalMaterialCost)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Iconify icon="solar:box-outline" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No materials used yet
            </Typography>
          </Box>
        )}
      </MobileCard>

      {/* Time Entries */}
      <MobileCard>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Time Entries ({report.timeEntries?.length || 0})
          </Typography>
          <MobileButton
            variant="outline"
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setAddTimeEntryOpen(true)}
          >
            Add Time
          </MobileButton>
        </Box>

        {report.timeEntries && report.timeEntries.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {report.timeEntries.map((entry) => (
              <Box
                key={entry._id}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {entry.description}
                  </Typography>
                  <Chip label={entry.category} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {dayjs(entry.startTime).format('HH:mm')} - {dayjs(entry.endTime).format('HH:mm')}
                </Typography>
                <Typography variant="body2" color="primary">
                  Duration: {formatDuration(entry.duration)}
                </Typography>
              </Box>
            ))}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                pt: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2">Total Hours</Typography>
              <Typography variant="subtitle2" color="primary">
                {report.totalHours ? `${report.totalHours.toFixed(1)}h` : '0h'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Iconify
              icon="solar:clock-circle-outline"
              width={48}
              sx={{ color: 'text.disabled', mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No time entries yet
            </Typography>
          </Box>
        )}
      </MobileCard>

      {/* Cost Summary */}
      {(report.totalMaterialCost > 0 || report.totalLaborCost > 0) && (
        <MobileCard>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Cost Summary
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Material Cost</Typography>
              <Typography variant="body2">{formatCurrency(report.totalMaterialCost)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Labor Cost</Typography>
              <Typography variant="body2">{formatCurrency(report.totalLaborCost)}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                pt: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Total Cost
              </Typography>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                {formatCurrency(report.totalCost)}
              </Typography>
            </Box>
          </Box>
        </MobileCard>
      )}

      {/* Add Material Dialog */}
      <AddMaterialDialog
        open={addMaterialOpen}
        onClose={() => setAddMaterialOpen(false)}
        onAdd={handleAddMaterial}
      />

      {/* Add Time Entry Dialog */}
      <AddTimeEntryDialog
        open={addTimeEntryOpen}
        onClose={() => setAddTimeEntryOpen(false)}
        onAdd={handleAddTimeEntry}
      />
    </Box>
  );
}
