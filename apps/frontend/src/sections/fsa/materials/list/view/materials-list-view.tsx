'use client';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import { Chip, Alert, Stack, Button, Container, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { MaterialsList } from '../materials-list';
import { MaterialsImportDialog } from '../materials-import-dialog';
import { MaterialsCreateView } from '../../create/materials-create-view';

// ----------------------------------------------------------------------

export function MaterialsListView() {
  const openCreate = useBoolean();
  const openImport = useBoolean();

  const [filters, setFilters] = useState({
    name: '',
    category: '',
    status: '',
  });

  const handleFilters = useCallback((name: string, value: string) => {
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      name: '',
      category: '',
      status: '',
    });
  }, []);

  const canReset = !!filters.name || !!filters.category || !!filters.status;

  return (
    <>
      <Container maxWidth={false}>
        <Stack
          spacing={4}
          sx={{
            p: 3,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack spacing={1}>
              <Typography variant="h4">Materials Management</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your inventory, materials, and supplies
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={openCreate.onTrue}
              >
                New Material
              </Button>
            </Stack>
          </Stack>

          {canReset && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2">Filters applied:</Typography>
                {filters.name && (
                  <Chip
                    label={`Name: ${filters.name}`}
                    size="small"
                    onDelete={() => handleFilters('name', '')}
                  />
                )}
                {filters.category && (
                  <Chip
                    label={`Category: ${filters.category}`}
                    size="small"
                    onDelete={() => handleFilters('category', '')}
                  />
                )}
                {filters.status && (
                  <Chip
                    label={`Status: ${filters.status}`}
                    size="small"
                    onDelete={() => handleFilters('status', '')}
                  />
                )}
                <Button
                  size="small"
                  onClick={handleResetFilters}
                  startIcon={<Iconify icon="solar:restart-bold" />}
                >
                  Clear All
                </Button>
              </Stack>
            </Alert>
          )}

          <MaterialsList
            filters={filters}
            onFilters={handleFilters}
            onImport={openImport.onTrue}
            onCreate={openCreate.onTrue}
          />
        </Stack>
      </Container>

      <MaterialsCreateView open={openCreate.value} onClose={openCreate.onFalse} />
      <MaterialsImportDialog open={openImport.value} onClose={openImport.onFalse} />
    </>
  );
}
