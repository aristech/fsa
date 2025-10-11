import type { FileThumbnailProps } from './types';

import { varAlpha } from 'minimal-shared/utils';

import { styled } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';

// ----------------------------------------------------------------------

export const ThumbnailRoot = styled('span')(({ theme }) => ({
  width: 36,
  height: 36,
  flexShrink: 0,
  alignItems: 'center',
  position: 'relative',
  display: 'inline-flex',
  justifyContent: 'center',
  borderRadius: Number(theme.shape.borderRadius) * 1.25,
}));

export const ThumbnailImage = styled('img', {
  shouldForwardProp: (prop: string) => !['showImage', 'sx'].includes(prop),
})<Pick<FileThumbnailProps, 'showImage'>>({
  width: '100%',
  height: '100%',
  variants: [
    {
      props: (props) => !!props.showImage,
      style: {
        objectFit: 'cover',
        borderRadius: 'inherit',
      },
    },
  ],
});

export const RemoveButton = styled(IconButton)(({ theme }) => ({
  top: 4,
  right: 4,
  position: 'absolute',
  padding: theme.spacing(0.5),
  width: 26,
  height: 26,
  color: theme.vars?.palette.common.white,
  backgroundColor: varAlpha(theme.vars?.palette.grey['900Channel'] || '0 0 0', 0.48),
  '&:hover': {
    backgroundColor: theme.palette.error.main,
  },
}));

export const DownloadButton = styled(ButtonBase)(({ theme }) => ({
  top: 4,
  right: 4,
  zIndex: 8,
  padding: theme.spacing(0.5),
  width: 20,
  height: 20,
  opacity: 1,
  position: 'absolute',
  borderRadius: theme.shape.borderRadius,
  color: theme.vars?.palette.common.white,
  backgroundColor: varAlpha(theme.vars?.palette.grey['900Channel'] || '0 0 0', 0.48),
  '&:hover': {
    backgroundColor: varAlpha(theme.vars?.palette.grey['900Channel'] || '0 0 0', 0.72),
  },
}));
