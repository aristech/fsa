'use client';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import { Chip, Alert, Stack, Container, Typography } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

import { PersonnelList } from '../personnel-list';
import { PersonnelFilters } from '../personnel-filters';
import { PersonnelFiltersButton } from '../personnel-filters-button';
import { PersonnelCreateView } from '../../create/personnel-create-view';

// ----------------------------------------------------------------------

export function PersonnelListView() {
  const { t } = useTranslate('dashboard');
  const openFilters = useBoolean();
  const openCreate = useBoolean();

  const [filters, setFilters] = useState({
    name: '',
    role: '',
    status: 'all',
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
      role: '',
      status: 'all',
    });
  }, []);

  const canReset = !!filters.name || !!filters.role || filters.status !== 'all';

  return (
    <Container maxWidth="xl">
      <Stack
        spacing={4}
        sx={{
          p: 3,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={1}>
            <Typography variant="h4">{t('personnel.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('personnel.subtitle')}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <PersonnelFiltersButton
              open={openFilters.value}
              onOpen={openFilters.onTrue}
              onClose={openFilters.onFalse}
              canReset={canReset}
              onResetFilters={handleResetFilters}
            />
          </Stack>
        </Stack>

        {canReset && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle2">{t('personnel.filtersApplied')}</Typography>
              {filters.name && (
                <Chip
                  label={`${t('personnel.filters.name')}: ${filters.name}`}
                  size="small"
                  onDelete={() => handleFilters('name', '')}
                />
              )}
              {filters.role && (
                <Chip
                  label={`${t('personnel.filters.role')}: ${filters.role}`}
                  size="small"
                  onDelete={() => handleFilters('role', '')}
                />
              )}
              {filters.status !== 'all' && (
                <Chip
                  label={`${t('personnel.filters.status')}: ${filters.status}`}
                  size="small"
                  onDelete={() => handleFilters('status', 'all')}
                />
              )}
            </Stack>
          </Alert>
        )}

        <PersonnelFilters
          open={openFilters.value}
          onClose={openFilters.onFalse}
          filters={filters}
          onFilters={handleFilters}
          canReset={canReset}
          onResetFilters={handleResetFilters}
        />

        <PersonnelList filters={filters} />
      </Stack>
      <PersonnelCreateView open={openCreate.value} onClose={openCreate.onFalse} />
    </Container>
  );
}
