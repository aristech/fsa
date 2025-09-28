import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type FormSocialsProps = BoxProps & {
  signInWithGoogle?: () => void;
};

export function FormSocials({ sx, signInWithGoogle, ...other }: FormSocialsProps) {
  return (
    <Box
      sx={[
        {
          display: 'flex',
          justifyContent: 'center',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Button
        fullWidth
        variant="outlined"
        size="large"
        startIcon={<Iconify width={20} icon="socials:google" />}
        onClick={signInWithGoogle}
        sx={{
          py: 1.5,
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.lighter',
          },
        }}
      >
        Continue with Google
      </Button>
    </Box>
  );
}
