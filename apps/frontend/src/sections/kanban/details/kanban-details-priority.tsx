import type { BoxProps } from '@mui/material/Box';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';

import { PRIORITIES } from 'src/constants/priorities';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  priority: string;
  onChangePriority: (newValue: string) => void;
};

export function KanbanDetailsPriority({ priority, onChangePriority, sx, ...other }: Props) {
  return (
    <Box
      sx={[
        {
          gap: 1,
          display: 'flex',
          flexWrap: 'wrap',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {PRIORITIES.map((option) => (
        <ButtonBase
          key={option.value}
          onClick={() => onChangePriority(option.value)}
          sx={(theme) => ({
            py: 0.5,
            pl: 0.75,
            pr: 1.25,
            fontSize: 12,
            borderRadius: 1,
            lineHeight: '20px',
            textTransform: 'capitalize',
            fontWeight: 'fontWeightBold',
            boxShadow: `inset 0 0 0 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.24)}`,
            ...(option.value === priority && {
              boxShadow: `inset 0 0 0 2px ${theme.vars.palette.text.primary}`,
            }),
          })}
        >
          <Iconify
            icon={option.icon}
            sx={{
              mr: 0.5,
              color: option.color,
            }}
          />

          {option.label}
        </ButtonBase>
      ))}
    </Box>
  );
}
