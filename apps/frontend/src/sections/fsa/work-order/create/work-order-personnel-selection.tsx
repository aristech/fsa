'use client';

import useSWR from 'swr';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

import { WorkOrderPersonnelDialog } from './work-order-personnel-dialog';

// ----------------------------------------------------------------------

type PersonnelFromAPI = {
  _id: string;
  employeeId: string;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  role?: {
    name?: string;
  };
};

// Type that matches the dialog's expected format
type DialogPersonnel = {
  _id: string;
  employeeId: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  role?: {
    name: string;
  };
};

// ----------------------------------------------------------------------

type Props = {
  value: string[];
  onChangeAction: (value: string[]) => void;
  disabled?: boolean;
};

export function WorkOrderPersonnelSelection({ value = [], onChangeAction, disabled = false }: Props) {
  const contactsDialog = useBoolean();
  const { t } = useTranslate('common');

  // Fetch personnel data
  const axiosFetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);
  const {
    data: personnelResp,
    error,
    isLoading,
  } = useSWR(endpoints.fsa.personnel.list, axiosFetcher);
  const personnel: PersonnelFromAPI[] = personnelResp?.data || [];

  // Get selected personnel details
  const selectedPersonnel = personnel.filter((p: PersonnelFromAPI) => value.includes(p._id));

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
        {error ? (
          <Typography variant="body2" sx={{ color: 'error.main', lineHeight: '40px' }}>
            {t('errorLoadingPersonnel', { defaultValue: 'Error loading personnel' })}
          </Typography>
        ) : isLoading ? (
          <CircularProgress size={24} sx={{ my: 1 }} />
        ) : selectedPersonnel.length > 0 ? (
          selectedPersonnel.map((person: PersonnelFromAPI) => {
            const displayName = person.user?.name || person.employeeId;
            const initials =
              person.user?.name
                ?.split(' ')
                .map((n: string) => n.charAt(0))
                .join('')
                .toUpperCase() ||
              person.employeeId?.charAt(0)?.toUpperCase() ||
              'P';

            const tooltipText = [displayName, person.user?.email, person.role?.name]
              .filter(Boolean)
              .join(' • ');

            return (
              <Tooltip key={person._id} title={tooltipText}>
                <Avatar sx={{ width: 32, height: 32 }}>{initials}</Avatar>
              </Tooltip>
            );
          })
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: '40px' }}>
            {t('noPersonnelAssigned', { defaultValue: 'No personnel assigned' })}
          </Typography>
        )}

        {!disabled && (
          <>
            <Tooltip title={t('assignPersonnel', { defaultValue: 'Assign personnel' })}>
              <IconButton
                onClick={contactsDialog.onTrue}
                sx={[
                  (theme) => ({
                    border: `dashed 1px ${theme.vars?.palette?.divider || theme.palette.divider}`,
                    bgcolor: varAlpha(
                      theme.vars?.palette?.grey?.['500Channel'] ||
                        theme.palette.grey[500] + 'Channel',
                      0.08
                    ),
                    width: 32,
                    height: 32,
                  }),
                ]}
              >
                <Iconify icon="mingcute:add-line" width={16} />
              </IconButton>
            </Tooltip>

            <WorkOrderPersonnelDialog
              selectedPersonnel={selectedPersonnel.filter((p): p is DialogPersonnel =>
                Boolean(p.user?.name && p.user?.email && p.role?.name)
              )}
              open={contactsDialog.value}
              onCloseAction={contactsDialog.onFalse}
              onAssignAction={(personnelList: DialogPersonnel[]) => {
                const personnelIds = personnelList.map((p) => p._id);
                onChangeAction(personnelIds);
              }}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
