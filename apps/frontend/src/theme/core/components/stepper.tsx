import type { Theme, Components } from '@mui/material/styles';

import { parseCssVar } from 'minimal-shared/utils';

// ----------------------------------------------------------------------

const MuiStepConnector: Components<Theme>['MuiStepConnector'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      [parseCssVar(theme.vars?.palette.StepConnector.border || '--step-connector-border')]: theme.vars?.palette.divider,
    }),
  },
};

const MuiStepContent: Components<Theme>['MuiStepContent'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      [parseCssVar(theme.vars?.palette.StepContent.border || '--step-content-border')]: theme.vars?.palette.divider,
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const stepper: Components<Theme> = {
  MuiStepConnector,
  MuiStepContent,
};
