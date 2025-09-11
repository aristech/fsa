import type { ITimeEntry } from 'src/types/kanban';

import useSWR, { mutate } from 'swr';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

type Props = {
  taskId: string;
  workOrderId?: string;
};

export function KanbanDetailsTime({ taskId, workOrderId }: Props) {
  const listKey = useMemo(
    () => [endpoints.fsa.timeEntries.list, { params: { taskId, limit: 100 } }] as const,
    [taskId]
  );

  const { data, isLoading } = useSWR<{ success: boolean; data: ITimeEntry[] }>(
    listKey,
    ([url, cfg]: [string, any]) => axiosInstance.get(url, cfg).then((r) => r.data)
  );

  const entries = useMemo(() => data?.data || [], [data]);

  const totals = useMemo(() => {
    const hours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const cost = entries.reduce((sum, e) => sum + (e.cost || 0), 0);
    return { hours, cost };
  }, [entries]);

  const [hours, setHours] = useState<string>('');
  const [days, setDays] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const canSubmit = !!date && (!!hours || !!days);

  const handleCreate = async () => {
    const payload: any = {
      taskId,
      date,
      notes: notes || undefined,
    };
    if (workOrderId) payload.workOrderId = workOrderId;
    if (hours) payload.hours = parseFloat(hours);
    if (days) payload.days = parseFloat(days);

    await axiosInstance.post(endpoints.fsa.timeEntries.create, payload);
    setHours('');
    setDays('');
    setDate('');
    setNotes('');
    mutate(listKey);
  };

  const handleDelete = async (id: string) => {
    await axiosInstance.delete(endpoints.fsa.timeEntries.delete(id));
    mutate(listKey);
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Log time
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
          <TextField
            label="Date"
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } as any }}
          />
          <TextField
            label="Hours"
            type="number"
            size="small"
            inputProps={{ step: 0.25, min: 0 }}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <TextField
            label="Days"
            type="number"
            size="small"
            inputProps={{ step: 0.25, min: 0 }}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <TextField
            label="Notes"
            size="small"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button variant="contained" disabled={!canSubmit} onClick={handleCreate}>
            Add
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Time entries</Typography>
          <Typography variant="body2" color="text.secondary">
            Total: {totals.hours.toFixed(2)}h • Cost: {totals.cost.toFixed(2)}
          </Typography>
        </Stack>

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        ) : entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No time entries yet.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {entries.map((e) => (
              <Box
                key={e._id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 140 }}>
                  {new Date(e.date).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ minWidth: 100 }}>
                  {e.hours?.toFixed(2)} h{e.days ? ` (${e.days.toFixed(2)} d)` : ''}
                </Typography>
                <Typography variant="body2" sx={{ flexGrow: 1 }} color="text.secondary">
                  {e.notes || ''}
                </Typography>
                <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'right' }}>
                  {typeof e.cost === 'number' ? e.cost.toFixed(2) : '-'}
                </Typography>
                <IconButton color="error" onClick={() => handleDelete(e._id)}>
                  <Iconify icon="mingcute:delete-2-line" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
