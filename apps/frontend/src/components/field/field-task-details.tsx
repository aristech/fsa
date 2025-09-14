import type { IKanbanTask } from 'src/types/kanban';

import React, { useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import { Box, Tooltip, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { KanbanDetails } from 'src/sections/kanban/details/kanban-details';
import { ReportCreateDrawer } from 'src/sections/field/reports/report-create-drawer';

// ----------------------------------------------------------------------

type Props = {
  task: IKanbanTask | null;
  open: boolean;
  onClose: () => void;
  onUpdateTask: (task: IKanbanTask) => void;
  onDeleteTask: () => void;
  onConvertToReport?: (task: IKanbanTask) => void;
};

export function FieldTaskDetails({
  task,
  open,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onConvertToReport,
}: Props) {
  const reportCreateDrawer = useBoolean();

  const handleConvertToReport = useCallback(() => {
    if (task && onConvertToReport) {
      onConvertToReport(task);
      reportCreateDrawer.onTrue();
    }
  }, [task, onConvertToReport, reportCreateDrawer]);

  const getTaskLocation = (taskData: IKanbanTask) => 'Field Location';

  if (!task) return null;

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <KanbanDetails
          task={task}
          open={open}
          onClose={onClose}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />

        {/* Custom Convert to Report Button */}
        {open && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 80, // Position next to the close button
              zIndex: 1,
            }}
          >
            <Tooltip title="Convert to Report">
              <IconButton
                onClick={handleConvertToReport}
                sx={{
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Iconify icon="eva:file-text-fill" width={20} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Report Create Drawer */}
      <ReportCreateDrawer
        open={reportCreateDrawer.value}
        onClose={reportCreateDrawer.onFalse}
        onSuccess={() => {
          reportCreateDrawer.onFalse();
          onClose(); // Close the task details as well
        }}
        initialData={{
          type: 'completion',
          clientId: task.clientId,
          taskIds: [task.id],
          location: getTaskLocation(task),
          priority: task.priority as 'low' | 'medium' | 'high' | 'urgent',
          tags: task.tags || task.labels || [],
          reportDate: new Date(),
        }}
      />
    </>
  );
}
