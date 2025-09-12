import type { Theme, Components } from '@mui/material/styles';

// ----------------------------------------------------------------------

const MuiTimelineDot = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: {
      boxShadow: 'none',
    },
  },
};

const MuiTimelineConnector = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }: { theme: Theme }) => ({
      backgroundColor: theme.vars?.palette.divider,
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const timeline = {
  MuiTimelineDot,
  MuiTimelineConnector,
} as Components<Theme>;
