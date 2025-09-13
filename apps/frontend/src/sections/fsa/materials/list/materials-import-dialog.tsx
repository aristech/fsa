'use client';

import type { BulkImportResult } from 'src/lib/models/Material';

import { useRef, useState } from 'react';

import {
  Box,
  Chip,
  Stack,
  Paper,
  Alert,
  Table,
  Dialog,
  Button,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Accordion,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  TableContainer,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';

import { MaterialService } from 'src/lib/services/material-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface MaterialsImportDialogProps {
  open: boolean;
  onClose: () => void;
}

// ----------------------------------------------------------------------

export function MaterialsImportDialog({ open, onClose }: MaterialsImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [csvContent, setCsvContent] = useState<string>('');
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sampleCSV = MaterialService.generateSampleCSVData();
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'materials_sample.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImport = async () => {
    if (!csvContent) {
      toast.error('Please select a CSV file first');
      return;
    }

    setLoading(true);
    try {
      const materials = MaterialService.parseCSVToMaterials(csvContent);
      const result = await MaterialService.bulkImportMaterials(materials);
      
      if (result.success) {
        setImportResult(result.data);
        if (result.data.success > 0) {
          toast.success(`Successfully imported ${result.data.success} materials`);
        }
        if (result.data.failed > 0) {
          toast.warning(`${result.data.failed} materials failed to import`);
        }
      } else {
        toast.error('Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
    }
    setLoading(false);
  };

  const handleClose = () => {
    setCsvContent('');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:import-bold" />
          <Typography variant="h6">Import Materials from CSV</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {!importResult && (
            <>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  CSV Import Instructions
                </Typography>
                <Typography variant="body2">
                  • Download the sample CSV file to see the required format<br />
                  • Include headers: name, description, category, sku, unit, unitCost, quantity, etc.<br />
                  • Custom fields should be prefixed with &quot;customField_&quot; (e.g., &quot;customField_weight&quot;)<br />
                  • Required fields: name, unit, unitCost, quantity
                </Typography>
              </Alert>

              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:download-bold" />}
                  onClick={handleDownloadSample}
                >
                  Download Sample CSV
                </Button>
                
                <Typography variant="body2" color="text.secondary">
                  Use this template to format your data correctly
                </Typography>
              </Stack>

              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: 'grey.300',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                
                <Iconify icon="solar:cloud-upload-bold" sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  {csvContent ? 'CSV file loaded' : 'Click to upload CSV file'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  {csvContent 
                    ? `Ready to import ${csvContent.split('\n').length - 1} materials`
                    : 'Drag and drop your CSV file here, or click to browse'
                  }
                </Typography>
                
                {csvContent && (
                  <Chip
                    label="File Ready"
                    color="success"
                    sx={{ mt: 1 }}
                    icon={<Iconify icon="solar:check-circle-bold" />}
                  />
                )}
              </Paper>

              {loading && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Importing materials...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </>
          )}

          {importResult && (
            <Stack spacing={2}>
              <Alert severity={importResult.failed === 0 ? 'success' : 'warning'}>
                <Typography variant="subtitle2">
                  Import Completed
                </Typography>
                <Typography variant="body2">
                  {importResult.success} materials imported successfully
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}
                </Typography>
              </Alert>

              <Stack direction="row" spacing={2}>
                <Chip
                  label={`${importResult.success} Successful`}
                  color="success"
                  icon={<Iconify icon="solar:check-circle-bold" />}
                />
                
                {importResult.failed > 0 && (
                  <Chip
                    label={`${importResult.failed} Failed`}
                    color="error"
                    icon={<Iconify icon="solar:close-circle-bold" />}
                  />
                )}
              </Stack>

              {importResult.errors.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
                    <Typography variant="subtitle2">
                      View Import Errors ({importResult.errors.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Error</TableCell>
                            <TableCell>Data</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {importResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row}</TableCell>
                              <TableCell>
                                <Typography variant="body2" color="error">
                                  {error.error}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {JSON.stringify(error.data)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {importResult ? 'Close' : 'Cancel'}
        </Button>
        
        {!importResult && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!csvContent || loading}
            startIcon={loading ? undefined : <Iconify icon="solar:import-bold" />}
          >
            {loading ? 'Importing...' : 'Import Materials'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}