"use client";




import { WorkOrderDetails } from '../work-order-details';

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

export function WorkOrderDetailsView({ id }: Props) {

  return (
    
      <WorkOrderDetails id={id} />
  
  );
}
