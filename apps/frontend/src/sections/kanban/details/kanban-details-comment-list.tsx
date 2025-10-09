import type { BoxProps } from '@mui/material/Box';
import type { IKanbanComment } from 'src/types/kanban';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { fToNow } from 'src/utils/format-time';

import { Image } from 'src/components/image';
import { Lightbox, useLightbox } from 'src/components/lightbox';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  comments: IKanbanComment[];
};

export function KanbanDetailsCommentList({ comments, sx, ...other }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const slides = comments
    .filter((comment) => comment.messageType === 'image')
    .map((slide) => ({ src: slide.message }));

  const lightbox = useLightbox(slides);

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [comments]);

  return (
    <>
      <Box
        ref={scrollRef}
        component="ul"
        sx={[
          {
            gap: 3,
            display: 'flex',
            flexDirection: 'column',
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {comments.map((comment) => (
          <Box component="li" key={comment.id} sx={{ gap: 2, display: 'flex' }}>
            <Avatar sx={{ flexShrink: 0 }}>
              {comment.initials || comment.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>

            <Box
              sx={{
                display: 'flex',
                flex: '1 1 auto',
                flexDirection: 'column',
                gap: comment.messageType === 'image' ? 1 : 0.5,
                minWidth: 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {comment.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {fToNow(comment.createdAt)}
                </Typography>
              </Box>

              {comment.messageType === 'image' ? (
                <Image
                  alt={comment.message}
                  src={comment.message}
                  onClick={() => lightbox.onOpen(comment.message)}
                  sx={(theme) => ({
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    maxWidth: '100%',
                    height: 'auto',
                    transition: theme.transitions.create(['opacity']),
                    '&:hover': { opacity: 0.8 },
                  })}
                />
              ) : (
                <Typography variant="body2" sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {comment.message}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Lightbox
        index={lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
      />
    </>
  );
}
