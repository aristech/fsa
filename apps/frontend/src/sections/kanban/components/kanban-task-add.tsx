import type { IKanbanTask } from 'src/types/kanban';

import { uuidv4 } from 'minimal-shared/utils';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import FormHelperText from '@mui/material/FormHelperText';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import InputBase, { inputBaseClasses } from '@mui/material/InputBase';

import { fAdd, today } from 'src/utils/format-time';

import { _mock } from 'src/_mock';
import { useClient } from 'src/contexts/client-context';

// ----------------------------------------------------------------------

type Props = {
  status: string;
  openAddTask: boolean;
  onCloseAddTask: () => void;
  onAddTask: (task: IKanbanTask) => void;
};

export function KanbanTaskAdd({ status, openAddTask, onAddTask, onCloseAddTask }: Props) {
  const [taskName, setTaskName] = useState('');
  const { selectedClient } = useClient();

  const defaultTask: IKanbanTask = useMemo(
    () => ({
      id: uuidv4(),
      status,
      name: taskName.trim() ? taskName : 'Untitled',
      priority: 'medium',
      attachments: [],
      labels: [],
      comments: [],
      assignee: [],
      due: [today(), fAdd({ days: 1 })],
      reporter: { id: _mock.id(16), name: _mock.fullName(16), avatarUrl: _mock.image.avatar(16) },
      // Add client information if available
      ...(selectedClient && {
        clientId: selectedClient._id,
        clientName: selectedClient.name,
        clientCompany: selectedClient.company,
      }),
    }),
    [status, taskName, selectedClient]
  );

  const handleChangeName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTaskName(event.target.value);
  }, []);

  const handleKeyUpAddTask = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        onAddTask(defaultTask);
        setTaskName('');
      }
    },
    [defaultTask, onAddTask]
  );

  const handleCancel = useCallback(() => {
    setTaskName('');
    onCloseAddTask();
  }, [onCloseAddTask]);

  if (!openAddTask) return null;

  return (
    <ClickAwayListener onClickAway={handleCancel}>
      <Box sx={{ px: 'var(--kanban-column-px)' }}>
        <Paper
          sx={[
            (theme) => ({
              borderRadius: 1.5,
              bgcolor: 'background.default',
              boxShadow: theme.vars.customShadows.z1,
            }),
          ]}
        >
          <InputBase
            autoFocus
            fullWidth
            placeholder="Untitled"
            id={status}
            value={taskName}
            onChange={handleChangeName}
            onKeyUp={handleKeyUpAddTask}
            sx={{
              px: 2,
              height: 56,
              [`& .${inputBaseClasses.input}`]: { p: 0, typography: 'subtitle2' },
            }}
          />
        </Paper>

        {/* Client indicator */}
        {selectedClient && (
          <Box sx={{ mt: 1, mx: 1 }}>
            <Chip
              size="small"
              label={`Client: ${selectedClient.name}${selectedClient.company ? ` (${selectedClient.company})` : ''}`}
              color="info"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        )}

        <FormHelperText sx={{ mx: 1 }}>
          Press Enter to create the task. 
          {!selectedClient && ' Task will not be associated with any client.'}
          {selectedClient && ' Task will be associated with the selected client.'}
        </FormHelperText>
      </Box>
    </ClickAwayListener>
  );
}
