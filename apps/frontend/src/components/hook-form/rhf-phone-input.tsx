import type { PhoneInputProps } from '../phone-input';

import { Controller, useFormContext } from 'react-hook-form';

import { PhoneInput } from '../phone-input';

// ----------------------------------------------------------------------

export type RHFPhoneInputProps = Omit<PhoneInputProps, 'value' | 'onChange'> & {
  name: string;
};

export function RHFPhoneInput({ name, helperText, ...other }: RHFPhoneInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <PhoneInput
          value={field.value}
          onChange={(val) => field.onChange(val)}
          fullWidth
          error={!!error}
          helperText={error?.message ?? helperText}
          {...other}
        />
      )}
    />
  );
}
