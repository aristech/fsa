import type { BoxProps } from '@mui/material/Box';

import useSWR from 'swr';
import { useState } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';
import { RealtimeIndicator } from 'src/components/realtime-indicator';
// Status dropdown has been removed; statuses remain static and used elsewhere

// ----------------------------------------------------------------------

type Props = BoxProps & {
  taskName: string;
  taskStatus: string;
  workOrderId?: string;
  workOrderNumber?: string;
  onDelete: () => void;
  onCloseDetails: () => void;
  onChangeWorkOrder?: (workOrder: { id: string; number?: string; label: string } | null) => void;
  // onChangeStatus removed from toolbar per latest requirements
  completeStatus?: boolean;
  onToggleComplete?: (newValue: boolean) => void;
};

export function KanbanDetailsToolbar({
  sx,
  taskName,
  onDelete,
  taskStatus,
  workOrderId,
  workOrderNumber,
  onCloseDetails,
  onChangeWorkOrder,

  completeStatus,
  onToggleComplete,
  ...other
}: Props) {
  const smUp = useMediaQuery((theme) => theme.breakpoints.up('sm'));

  const menuActions = usePopover();

  const confirmDialog = useBoolean();

  const [completed, setCompleted] = useState<boolean>(!!completeStatus);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<{
    id: string;
    number?: string;
    label: string;
  } | null>(
    workOrderId
      ? { id: workOrderId, number: workOrderNumber, label: workOrderNumber || workOrderId }
      : null
  );

  const axiosFetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);
  const { data: workOrdersResp } = useSWR(endpoints.fsa.workOrders.list, axiosFetcher);
  const workOrders: Array<{ _id: string; number?: string; title?: string }> =
    workOrdersResp?.data?.workOrders || [];

  // When work orders load, hydrate selected label with title if available
  if (selectedWorkOrder && workOrders.length) {
    const match = workOrders.find((wo) => wo._id === selectedWorkOrder.id);
    if (match) {
      const newLabel = match.title || match.number || match._id;
      if (newLabel !== selectedWorkOrder.label) {
        setSelectedWorkOrder({ id: match._id, number: match.number, label: newLabel });
      }
    }
  }

  // No status change via toolbar

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'top-right' } }}
    >
      <MenuList>
        <MenuItem
          selected={!selectedWorkOrder}
          onClick={() => {
            setSelectedWorkOrder(null);
            menuActions.onClose();
            onChangeWorkOrder?.(null);
          }}
        >
          No Work Order
        </MenuItem>
        <Box
          component="div"
          sx={{ my: 0.5, borderTop: (theme) => `1px dashed ${theme.vars?.palette.divider}` }}
        />
        {workOrders.map((wo) => {
          const label = wo.title || wo.number || wo._id;
          return (
            <MenuItem
              key={wo._id}
              selected={selectedWorkOrder?.id === wo._id}
              onClick={() => {
                const newSelection = { id: wo._id, number: wo.number, label };
                setSelectedWorkOrder(newSelection);
                menuActions.onClose();
                onChangeWorkOrder?.(newSelection);
              }}
            >
              {label}
            </MenuItem>
          );
        })}
      </MenuList>
    </CustomPopover>
  );

  // No status popover

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {taskName} </strong>?
        </>
      }
      action={
        <Button variant="contained" color="error" onClick={onDelete}>
          Delete
        </Button>
      }
    />
  );

  return (
    <>
      <Box
        sx={[
          (theme) => ({
            display: 'flex',
            alignItems: 'center',
            p: theme.spacing(2.5, 1, 2.5, 2.5),
            borderBottom: `solid 1px ${theme.vars?.palette.divider}`,
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {!smUp && (
          <Tooltip title="Close">
            <IconButton onClick={onCloseDetails} sx={{ mr: 2, ml: -1 }}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Tooltip>
        )}

        <RealtimeIndicator variant="icon" sx={{ mr: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Button
              size="small"
              variant="soft"
              endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} sx={{ ml: -0.5 }} />}
              onClick={menuActions.onOpen}
            >
              Work Order
            </Button>
          </Box>
        </Box>

        <Box component="span" sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex' }}>
          <Button
            size="small"
            variant="soft"
            color={completed ? 'success' : 'primary'}
            startIcon={
              <Iconify icon={completed ? 'eva:checkmark-fill' : 'eva:checkmark-circle-2-outline'} />
            }
            onClick={() => {
              const next = !completed;
              setCompleted(next);
              onToggleComplete?.(next);
            }}
          >
            {completed ? 'Completed' : 'Mark complete'}
          </Button>
          <Tooltip title="Delete task">
            <IconButton onClick={confirmDialog.onTrue}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ display: 'flex' }}>
        {selectedWorkOrder && (
          <Tooltip title={selectedWorkOrder.label} placement="top">
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ m: 0.8, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {selectedWorkOrder.label}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {renderMenuActions()}
      {renderConfirmDialog()}
    </>
  );
}
