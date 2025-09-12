import * as z from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input/input';

import Grid from '@mui/material/Grid';

import { schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1, { error: 'Name is required!' }),
  email: schemaUtils.email(),
  photoURL: schemaUtils.file({ error: 'Avatar is required!' }),
  phoneNumber: schemaUtils.phoneNumber({ isValid: isValidPhoneNumber }),
  country: schemaUtils.nullableInput(z.string().min(1, { error: 'Country is required!' }), {
    error: 'Country is required!',
  }),
  address: z.string().min(1, { error: 'Address is required!' }),
  state: z.string().min(1, { error: 'State is required!' }),
  city: z.string().min(1, { error: 'City is required!' }),
  zipCode: z.string().min(1, { error: 'Zip code is required!' }),
  about: z.string().min(1, { error: 'About is required!' }),
  // Not required
  isPublic: z.boolean(),
});

// ----------------------------------------------------------------------

export function AccountGeneral() {
  return <Grid />;
}
