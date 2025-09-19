'use client';

import type { CreateMaterialData } from 'src/lib/models/Material';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';

import {
  Box,
  Chip,
  Paper,
  Stack,
  Button,
  Drawer,
  TextField,
  IconButton,
  Typography,
  Autocomplete,
} from '@mui/material';

import { MaterialService } from 'src/lib/services/material-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

interface MaterialsCreateViewProps {
  open: boolean;
  onClose: () => void;
}

interface FormData extends CreateMaterialData {
  customFieldKey?: string;
  customFieldValue?: string;
}

// ----------------------------------------------------------------------

export function MaterialsCreateView({ open, onClose }: MaterialsCreateViewProps) {
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      sku: '',
      barcode: '',
      unit: 'pcs',
      unitCost: 0,
      quantity: 0,
      minimumStock: 0,
      location: '',
      supplier: '',
      customFieldKey: '',
      customFieldValue: '',
    },
  });

  const customFieldKey = watch('customFieldKey');
  const customFieldValue = watch('customFieldValue');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await MaterialService.getCategories();
        if (result.success) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    if (open) {
      loadCategories();
    }
  }, [open]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { customFieldKey: _key, customFieldValue: _value, ...createData } = data;
      createData.customFields = customFields;

      await MaterialService.createMaterial(createData);
      toast.success('Material created successfully');
      handleClose();
    } catch (error) {
      console.error('Failed to create material:', error);
      toast.error('Failed to create material');
    }
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    setCustomFields({});
    onClose();
  };

  const handleAddCustomField = () => {
    if (!customFieldKey?.trim() || !customFieldValue?.trim()) {
      toast.error('Please enter both field name and value');
      return;
    }

    setCustomFields((prev) => ({
      ...prev,
      [customFieldKey.trim()]: customFieldValue.trim(),
    }));

    setValue('customFieldKey', '');
    setValue('customFieldValue', '');
  };

  const handleRemoveCustomField = (key: string) => {
    setCustomFields((prev) => {
      const newFields = { ...prev };
      delete newFields[key];
      return newFields;
    });
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the category "${categoryName}"? This will only work if no materials use this category.`
      )
    ) {
      return;
    }

    try {
      await MaterialService.deleteCategory(categoryName);
      toast.success(`Category "${categoryName}" deleted successfully`);

      // Refresh categories list
      const result = await MaterialService.getCategories();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const renderHeader = () => (
    <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:package-bold" />
          <Typography variant="h6">Create New Material</Typography>
        </Stack>
        <IconButton onClick={handleClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>
    </Box>
  );

  const renderActions = () => (
    <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={loading}
          startIcon={loading ? undefined : <Iconify icon="solar:check-circle-bold" />}
        >
          {loading ? 'Creating...' : 'Create Material'}
        </Button>
      </Stack>
    </Box>
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: { sx: { width: { xs: 1, sm: 480 } } },
      }}
    >
      {renderHeader()}

      <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
        <Stack spacing={3}>
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Material name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Name"
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
                required
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Description" multiline rows={3} fullWidth />
            )}
          />

          <Stack direction="row" spacing={2}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  fullWidth
                  options={categories}
                  freeSolo
                  value={field.value || ''}
                  onChange={(_, newValue) => field.onChange(newValue || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      placeholder="Select or enter category"
                      fullWidth
                    />
                  )}
                  filterOptions={(options, params) => {
                    const filtered = options.filter((option) =>
                      option.toLowerCase().includes(params.inputValue.toLowerCase())
                    );

                    const { inputValue } = params;
                    const isExisting = options.some((option) => inputValue === option);
                    if (inputValue !== '' && !isExisting) {
                      filtered.push(`Add "${inputValue}"`);
                    }

                    return filtered;
                  }}
                  getOptionLabel={(option) => {
                    if (option.startsWith('Add "')) {
                      return option.replace('Add "', '').replace('"', '');
                    }
                    return option;
                  }}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    const isAddOption = option.startsWith('Add "');

                    return (
                      <li key={key} {...optionProps}>
                        {isAddOption ? (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon="solar:add-circle-bold" />
                            <span>{option}</span>
                          </Stack>
                        ) : (
                          option
                        )}
                      </li>
                    );
                  }}
                />
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Controller
              name="sku"
              control={control}
              render={({ field }) => <TextField {...field} label="SKU" fullWidth />}
            />

            <Controller
              name="barcode"
              control={control}
              render={({ field }) => <TextField {...field} label="Barcode" fullWidth />}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Controller
              name="unit"
              control={control}
              rules={{ required: 'Unit is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Unit"
                  error={!!errors.unit}
                  helperText={errors.unit?.message}
                  fullWidth
                  required
                  placeholder="e.g., pcs, m, kg, l"
                />
              )}
            />

            <Controller
              name="unitCost"
              control={control}
              rules={{
                required: 'Unit cost is required',
                min: { value: 0, message: 'Unit cost must be positive' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Unit Cost"
                  type="number"
                  inputProps={{ step: '0.01', min: 0 }}
                  error={!!errors.unitCost}
                  helperText={errors.unitCost?.message}
                  fullWidth
                  required
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Controller
              name="quantity"
              control={control}
              rules={{
                required: 'Quantity is required',
                min: { value: 0, message: 'Quantity must be positive' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Initial Quantity"
                  type="number"
                  inputProps={{ min: 0 }}
                  error={!!errors.quantity}
                  helperText={errors.quantity?.message}
                  fullWidth
                  required
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                />
              )}
            />

            <Controller
              name="minimumStock"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Minimum Stock"
                  type="number"
                  inputProps={{ min: 0 }}
                  fullWidth
                  helperText="Alert when stock falls below this level"
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                />
              )}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Storage Location"
                  fullWidth
                  placeholder="e.g., Warehouse A - Section 1"
                />
              )}
            />

            <Controller
              name="supplier"
              control={control}
              render={({ field }) => <TextField {...field} label="Supplier" fullWidth />}
            />
          </Stack>

          {/* Custom Fields Section */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Custom Fields
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Add custom properties like weight, color, dimensions, etc.
            </Typography>

            {Object.keys(customFields).length > 0 && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {Object.entries(customFields).map(([key, value]) => (
                  <Stack key={key} direction="row" alignItems="center" spacing={1}>
                    <Chip
                      label={`${key}: ${value}`}
                      size="small"
                      onDelete={() => handleRemoveCustomField(key)}
                      deleteIcon={<Iconify icon="solar:close-circle-bold" />}
                    />
                  </Stack>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1} alignItems="flex-end">
              <Controller
                name="customFieldKey"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Field Name"
                    size="small"
                    sx={{ flex: 1 }}
                    placeholder="e.g., weight, color"
                  />
                )}
              />
              <Controller
                name="customFieldValue"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Field Value"
                    size="small"
                    sx={{ flex: 1 }}
                    placeholder="e.g., 3kg, red"
                  />
                )}
              />
              <IconButton
                onClick={handleAddCustomField}
                disabled={!customFieldKey?.trim() || !customFieldValue?.trim()}
                color="primary"
              >
                <Iconify icon="solar:add-circle-bold" />
              </IconButton>
            </Stack>
          </Paper>

          {/* Category Management Section */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Category Management
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Remove unused categories to keep your list clean.
            </Typography>

            {categories.length > 0 && (
              <Stack spacing={1}>
                {categories.map((category) => (
                  <Stack
                    key={category}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">{category}</Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={loading}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Scrollbar>

      {renderActions()}
    </Drawer>
  );
}
