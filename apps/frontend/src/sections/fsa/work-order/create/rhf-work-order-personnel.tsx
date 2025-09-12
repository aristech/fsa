import { Controller, useFormContext } from 'react-hook-form';

import { WorkOrderPersonnelSelection } from './work-order-personnel-selection';

// ----------------------------------------------------------------------

type Props = {
  name: string;
  disabled?: boolean;
};

export function RHFWorkOrderPersonnel({ name, disabled }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <WorkOrderPersonnelSelection
          value={field.value || []}
          onChange={field.onChange}
          disabled={disabled}
        />
      )}
    />
  );
}
