import { useEffect } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

import { isSubtaskData } from './use-subtask-dnd';

// ----------------------------------------------------------------------

interface UseSubtaskDropMonitorProps {
  onReorder: (params: {
    subtaskId: string;
    targetSubtaskId: string;
    position: 'before' | 'after';
  }) => void;
}

export function useSubtaskDropMonitor({ onReorder }: UseSubtaskDropMonitorProps) {
  useEffect(
    () =>
      monitorForElements({
        onDrop({ source, location }) {
          const destination = location.current.dropTargets[0];

          if (!destination) return;
          if (!isSubtaskData(source.data)) return;

          const destinationData = destination.data;
          if (destinationData.type !== 'subtask-drop-target') return;

          const sourceSubtaskId = source.data.subtaskId;
          const targetSubtaskId = destinationData.subtaskId as string;

          if (sourceSubtaskId === targetSubtaskId) return;

          const closestEdge = extractClosestEdge(destinationData);
          if (!closestEdge) return;

          const position = closestEdge === 'top' ? 'before' : 'after';

          onReorder({
            subtaskId: sourceSubtaskId,
            targetSubtaskId,
            position,
          });
        },
      }),
    [onReorder]
  );
}