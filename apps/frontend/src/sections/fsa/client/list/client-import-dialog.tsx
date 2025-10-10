'use client';

import * as XLSX from 'xlsx';
import { useState, useCallback } from 'react';

import {
  Box,
  Step,
  Chip,
  Alert,
  Table,
  Paper,
  Stack,
  Button,
  Dialog,
  Select,
  Stepper,
  MenuItem,
  TableRow,
  StepLabel,
  TextField,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  InputLabel,
  DialogTitle,
  FormControl,
  DialogContent,
  DialogActions,
  TableContainer,
} from '@mui/material';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Upload } from 'src/components/upload';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type ColumnMapping = {
  [excelColumn: string]: string; // Maps Excel column names to Client model fields
};

type ClientImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

// Define the available Client model fields for mapping
const CLIENT_FIELDS = [
  { value: '', label: 'Do not import' },
  { value: 'name', label: 'Client Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'vatNumber', label: 'VAT Number' },
  { value: 'address.street', label: 'Address - Street' },
  { value: 'address.city', label: 'Address - City' },
  { value: 'address.state', label: 'Address - State' },
  { value: 'address.zipCode', label: 'Address - Postal Code' },
  { value: 'address.country', label: 'Address - Country' },
  { value: 'contactPerson.name', label: 'Contact Person - Name' },
  { value: 'contactPerson.email', label: 'Contact Person - Email' },
  { value: 'contactPerson.phone', label: 'Contact Person - Phone' },
  { value: 'notes', label: 'Notes' },
];

// Fields that can be used as primary keys for update/create logic
const PRIMARY_KEY_FIELDS = [
  { value: 'vatNumber', label: 'VAT Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
];

// Default mapping suggestions based on common Greek column names
const DEFAULT_MAPPINGS: { [key: string]: string } = {
  'Επωνυμία': 'company',
  'Α.Φ.Μ.': 'vatNumber',
  'Διεύθυνση': 'address.street',
  'Περιοχή': 'address.city',
  'Τ.Κ.': 'address.zipCode',
  'Τηλ.1': 'phone',
  'Τηλ.2': 'contactPerson.phone',
  'email': 'email',
  'Email': 'email',
  'Fax': 'notes',
  'Web page': 'notes',
};

// ----------------------------------------------------------------------

export function ClientImportDialog({ open, onClose, onSuccess }: ClientImportDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [headerRowIndex, setHeaderRowIndex] = useState(6); // Default to row 6 for Greek format
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    updated: number;
    created: number;
    skipped: number;
    limitReached?: boolean;
    availableSlots?: number;
    totalAttempted?: number;
    errors: string[];
  } | null>(null);
  const [primaryKey, setPrimaryKey] = useState('vatNumber'); // Primary key for update/create logic
  const [skipEmptyPrimaryKey, setSkipEmptyPrimaryKey] = useState(true); // Skip entries with empty primary key
  const [sampleRowIndex, setSampleRowIndex] = useState(0); // Index for viewing sample data

  const steps = ['Upload File', 'Map Columns', 'Preview & Import'];

  const handleReset = () => {
    setActiveStep(0);
    setFile(null);
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({});
    setHeaderRowIndex(6);
    setIsImporting(false);
    setImportResults(null);
    setPrimaryKey('vatNumber');
    setSkipEmptyPrimaryKey(true);
    setSampleRowIndex(0);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const readExcelFile = useCallback((uploadedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

        // Extract headers from the specified row
        const headers = jsonData[headerRowIndex] || [];
        const dataRows = jsonData.slice(headerRowIndex + 1).filter((row) => row.some((cell) => cell));

        setExcelColumns(headers);
        setExcelData(dataRows);

        // Auto-suggest mappings based on column names
        const autoMapping: ColumnMapping = {};
        headers.forEach((header: string) => {
          if (DEFAULT_MAPPINGS[header]) {
            autoMapping[header] = DEFAULT_MAPPINGS[header];
          }
        });
        setColumnMapping(autoMapping);

        toast.success('File loaded successfully');
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Failed to read Excel file');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  }, [headerRowIndex]);

  const handleDropSingleFile = useCallback((acceptedFiles: File[]) => {
    const newFile = acceptedFiles[0];
    if (newFile) {
      setFile(newFile);
      readExcelFile(newFile);
    }
  }, [readExcelFile]);

  const handleMappingChange = (excelColumn: string, modelField: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [excelColumn]: modelField,
    }));
  };

  const handleNext = () => {
    if (activeStep === 0 && !file) {
      toast.error('Please upload a file first');
      return;
    }
    if (activeStep === 1) {
      // Validate that at least company or name is mapped
      const hasCriticalField = Object.values(columnMapping).some(
        (field) => field === 'company' || field === 'name'
      );
      if (!hasCriticalField) {
        toast.warning('Please map at least Company or Client Name field');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const transformData = () => excelData.map((row, idx) => {
      const client: any = {
        address: {},
        contactPerson: {},
      };

      excelColumns.forEach((col, colIdx) => {
        const mappedField = columnMapping[col];
        if (mappedField && row[colIdx]) {
          const value = row[colIdx];
          
          // Handle nested fields
          if (mappedField.includes('.')) {
            const [parent, child] = mappedField.split('.');
            if (!client[parent]) client[parent] = {};
            client[parent][child] = value;
          } else {
            client[mappedField] = value;
          }
        }
      });

      // Clean up empty nested objects
      if (Object.keys(client.address).length === 0) delete client.address;
      if (Object.keys(client.contactPerson).length === 0) delete client.contactPerson;

      // Use company as name if name is not provided
      if (!client.name && client.company) {
        client.name = client.company;
      }

      return client;
    });

  const handleImport = async () => {
    setIsImporting(true);
    const transformedData = transformData();

    // Filter out entries with empty primary key if skipEmptyPrimaryKey is true
    const dataToImport = skipEmptyPrimaryKey
      ? transformedData.filter((client) => {
          const pkValue = primaryKey.includes('.')
            ? primaryKey.split('.').reduce((obj, key) => obj?.[key], client)
            : client[primaryKey];
          return pkValue && String(pkValue).trim() !== '';
        })
      : transformedData;

    try {
      const response = await axiosInstance.post(endpoints.fsa.clients.bulkImport, {
        clients: dataToImport,
        primaryKey,
        skipEmptyPrimaryKey,
      });

      const results = response.data.data;
      setImportResults(results);

      const successMsg = [];
      if (results.created > 0) successMsg.push(`${results.created} created`);
      if (results.updated > 0) successMsg.push(`${results.updated} updated`);
      if (results.skipped > 0) successMsg.push(`${results.skipped} skipped`);

      if (results.success > 0) {
        if (results.limitReached) {
          toast.warning(
            `Imported ${results.success} clients (${successMsg.join(', ')}). Subscription limit reached.`
          );
        } else {
          toast.success(`Successfully imported ${results.success} clients (${successMsg.join(', ')})`);
        }
        onSuccess();
      }
      if (results.failed > 0 && results.success === 0) {
        toast.error(`Failed to import ${results.failed} clients`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import clients');
    } finally {
      setIsImporting(false);
    }
  };

  const previewData = transformData().slice(0, 5);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="eva:cloud-upload-fill" width={24} />
          <Typography variant="h6">Import Clients from Excel</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Upload File */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Upload an Excel file (.xlsx, .xls) containing your client data. The file should have
              headers in row 7 (or adjust the header row number below).
            </Alert>

            <TextField
              type="number"
              label="Header Row Number"
              value={headerRowIndex + 1}
              onChange={(e) => setHeaderRowIndex(parseInt(e.target.value, 10) - 1)}
              fullWidth
              sx={{ mb: 2 }}
              helperText="Row number where column headers are located (default: 7)"
            />

            <Upload
              value={file}
              onDrop={handleDropSingleFile}
              accept={{
                'application/vnd.ms-excel': ['.xls'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              }}
              onDelete={() => {
                setFile(null);
                setExcelData([]);
                setExcelColumns([]);
              }}
            />

            {file && excelColumns.length > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                File loaded: {excelColumns.length} columns, {excelData.length} rows detected
              </Alert>
            )}
          </Box>
        )}

        {/* Step 2: Map Columns */}
        {activeStep === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Map your Excel columns to client fields. Common mappings have been suggested
              automatically.
            </Alert>

            <Stack spacing={2} sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Primary Key Field</InputLabel>
                <Select
                  value={primaryKey}
                  label="Primary Key Field"
                  onChange={(e) => setPrimaryKey(e.target.value)}
                >
                  {PRIMARY_KEY_FIELDS.map((field) => (
                    <MenuItem key={field.value} value={field.value}>
                      {field.label}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                  Used to match existing clients. If a client with this value exists, it will be
                  updated; otherwise, a new client will be created.
                </Typography>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  id="skipEmptyPrimaryKey"
                  checked={skipEmptyPrimaryKey}
                  onChange={(e) => setSkipEmptyPrimaryKey(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="skipEmptyPrimaryKey" style={{ cursor: 'pointer' }}>
                  <Typography variant="body2">
                    Skip entries with empty {PRIMARY_KEY_FIELDS.find((f) => f.value === primaryKey)?.label}
                  </Typography>
                </label>
              </Box>
            </Stack>

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Viewing sample from row {sampleRowIndex + 1} of {excelData.length}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={sampleRowIndex === 0}
                    onClick={() => setSampleRowIndex((prev) => Math.max(0, prev - 1))}
                    startIcon={<Iconify icon="eva:arrow-up-fill" />}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={sampleRowIndex >= excelData.length - 1}
                    onClick={() => setSampleRowIndex((prev) => Math.min(excelData.length - 1, prev + 1))}
                    endIcon={<Iconify icon="eva:arrow-down-fill" />}
                  >
                    Next
                  </Button>
                </Stack>
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Excel Column</TableCell>
                      <TableCell>Sample Data</TableCell>
                      <TableCell>Map to Client Field</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {excelColumns.map((col, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Chip label={col} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {excelData[sampleRowIndex]?.[idx] || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={columnMapping[col] || ''}
                              onChange={(e) => handleMappingChange(col, e.target.value)}
                            >
                              {CLIENT_FIELDS.map((field) => (
                                <MenuItem key={field.value} value={field.value}>
                                  {field.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}

        {/* Step 3: Preview & Import */}
        {activeStep === 2 && (
          <Box>
            {!importResults ? (
              <>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Preview of first 5 records. Click &quot;Import&quot; to proceed with importing{' '}
                  {excelData.length} clients.
                </Alert>

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        {Object.entries(columnMapping)
                          .filter(([, field]) => field)
                          .map(([col]) => (
                            <TableCell key={col}>{col}</TableCell>
                          ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.map((client, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          {Object.entries(columnMapping)
                            .filter(([, field]) => field)
                            .map(([col, field]) => {
                              // Get value from nested field
                              const value = field.includes('.')
                                ? field.split('.').reduce((obj, key) => obj?.[key], client)
                                : client[field];
                              return (
                                <TableCell key={col}>
                                  <Typography variant="caption">{value || '-'}</Typography>
                                </TableCell>
                              );
                            })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Box>
                {importResults.limitReached && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      ⚠️ Subscription Limit Reached
                    </Typography>
                    <Typography variant="body2">
                      Your plan has a limit for clients. Only {importResults.created} new clients were
                      imported. Updates to existing clients were processed normally.
                    </Typography>
                  </Alert>
                )}

                <Alert severity={importResults.failed === 0 && !importResults.limitReached ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Import completed: {importResults.success} successful, {importResults.failed} failed
                  </Typography>
                  <Typography variant="body2">
                    Created: {importResults.created} | Updated: {importResults.updated} | Skipped:{' '}
                    {importResults.skipped}
                  </Typography>
                </Alert>

                {importResults.errors.length > 0 && (
                  <Alert severity="error">
                    <Typography variant="subtitle2" gutterBottom>
                      Errors:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {importResults.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx}>
                          <Typography variant="caption">{error}</Typography>
                        </li>
                      ))}
                      {importResults.errors.length > 10 && (
                        <li>
                          <Typography variant="caption">
                            ... and {importResults.errors.length - 10} more errors
                          </Typography>
                        </li>
                      )}
                    </ul>
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          {importResults ? 'Close' : 'Cancel'}
        </Button>
        {!importResults && (
          <>
            <Button onClick={handleBack} disabled={activeStep === 0}>
              Back
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button onClick={handleNext} variant="contained">
                Next
              </Button>
            ) : (
              <Button
                onClick={handleImport}
                variant="contained"
                disabled={isImporting}
                startIcon={
                  isImporting ? <Iconify icon="svg-spinners:ring-resize" /> : <Iconify icon="eva:checkmark-fill" />
                }
              >
                {isImporting ? 'Importing...' : `Import ${excelData.length} Clients`}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
