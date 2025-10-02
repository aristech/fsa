import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

import { useRef, useState, useEffect } from 'react';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import {
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';

// ----------------------------------------------------------------------

interface SubtaskData extends Record<string | symbol, unknown> {
  type: 'subtask';
  subtaskId: string;
  taskId: string;
  rect: DOMRect;
}

interface SubtaskDropTargetData extends Record<string | symbol, unknown> {
  type: 'subtask-drop-target';
  subtaskId: string;
  taskId: string;
}

export type SubtaskState =
  | { type: 'idle' }
  | { type: 'dragging' }
  | { type: 'subtask-over'; dragRect: DOMRect; closestEdge: Edge }
  | { type: 'preview'; dragRect: DOMRect; container: HTMLElement };

export type UseSubtaskDndReturn = {
  state: SubtaskState;
  subtaskRef: React.RefObject<HTMLDivElement | null>;
  dragHandleRef: React.RefObject<HTMLDivElement | null>;
};

function isSubtaskData(data: Record<string, unknown>): data is SubtaskData {
  return data.type === 'subtask' && typeof data.subtaskId === 'string';
}

function getSubtaskData({
  subtaskId,
  taskId,
  rect,
}: {
  subtaskId: string;
  taskId: string;
  rect: DOMRect;
}): SubtaskData {
  return {
    type: 'subtask',
    subtaskId,
    taskId,
    rect,
  };
}

function getSubtaskDropTargetData({
  subtaskId,
  taskId,
}: {
  subtaskId: string;
  taskId: string;
}): SubtaskDropTargetData {
  return {
    type: 'subtask-drop-target',
    subtaskId,
    taskId,
  };
}

export function useSubtaskDnd(subtaskId: string, taskId: string): UseSubtaskDndReturn {
  const subtaskRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<SubtaskState>({ type: 'idle' });

  useEffect(() => {
    const subtaskEl = subtaskRef.current;
    const dragHandleEl = dragHandleRef.current;
    if (!subtaskEl || !dragHandleEl) return undefined;

    const dragSubtask = draggable({
      element: dragHandleEl,
      getInitialData: () =>
        getSubtaskData({
          subtaskId,
          taskId,
          rect: subtaskEl.getBoundingClientRect(),
        }),
      onDragStart: () => setState({ type: 'dragging' }),
      onDrop: () => setState({ type: 'idle' }),
      onGenerateDragPreview: ({ location, source, nativeSetDragImage }) => {
        if (!isSubtaskData(source.data)) return;

        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: preserveOffsetOnSource({
            element: subtaskEl,
            input: location.current.input,
          }),
          render: ({ container }) => {
            setState({
              type: 'preview',
              dragRect: subtaskEl.getBoundingClientRect(),
              container,
            });
            return () => setState({ type: 'dragging' });
          },
        });
      },
    });

    const dropSubtaskTarget = dropTargetForElements({
      element: subtaskEl,
      getIsSticky: () => true,
      canDrop: ({ source }) => isSubtaskData(source.data) && source.data.taskId === taskId,
      getData: ({ input, element }) => {
        const userData = getSubtaskDropTargetData({ subtaskId, taskId });
        return attachClosestEdge(userData, {
          input,
          element,
          allowedEdges: ['top', 'bottom'],
        });
      },
      onDrag: ({ source, self }) => {
        if (!isSubtaskData(source.data) || source.data.subtaskId === subtaskId) return;

        const closestEdge = extractClosestEdge(self.data);
        if (!closestEdge) return;

        const nextState: SubtaskState = {
          type: 'subtask-over',
          dragRect: source.data.rect,
          closestEdge,
        };

        setState(nextState);
      },
      onDragEnter: ({ source, self }) => {
        if (!isSubtaskData(source.data) || source.data.subtaskId === subtaskId) return;

        const closestEdge = extractClosestEdge(self.data);
        if (!closestEdge) return;

        setState({
          type: 'subtask-over',
          dragRect: source.data.rect,
          closestEdge,
        });
      },
      onDragLeave: () => {
        setState({ type: 'idle' });
      },
      onDrop: () => setState({ type: 'idle' }),
    });

    return combine(dragSubtask, dropSubtaskTarget);
  }, [subtaskId, taskId]);

  return {
    subtaskRef,
    dragHandleRef,
    state,
  };
}

export { isSubtaskData, getSubtaskData, getSubtaskDropTargetData };
