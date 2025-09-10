import type { CardProps } from '@mui/material/Card';
import type { IAddressItem } from 'src/types/common';

import { useState, useCallback } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import CardHeader from '@mui/material/CardHeader';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';



// ----------------------------------------------------------------------

type Props = CardProps & {
  addressBook: IAddressItem[];
};

export function AccountBillingAddress({ addressBook, sx, ...other }: Props) {
  const menuActions = usePopover();
  const newAddressForm = useBoolean();

  const [addressId, setAddressId] = useState('');

  const handleAddAddress = useCallback((address: IAddressItem) => {
    console.info('ADD ADDRESS', address);
  }, []);

  const handleSelectedId = useCallback(
    (event: React.MouseEvent<HTMLElement>, id: string) => {
      menuActions.onOpen(event);
      setAddressId(id);
    },
    [menuActions]
  );

  const handleClose = useCallback(() => {
    menuActions.onClose();
    setAddressId('');
  }, [menuActions]);

  const renderMenuActions = () => (
    <CustomPopover open={menuActions.open} anchorEl={menuActions.anchorEl} onClose={handleClose}>
      <MenuList>
        <MenuItem
          onClick={() => {
            handleClose();
            console.info('SET AS PRIMARY', addressId);
          }}
        >
          <Iconify icon="eva:star-fill" />
          Set as primary
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            console.info('EDIT', addressId);
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            console.info('DELETE', addressId);
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );



  return (
    <>
      <Card sx={sx} {...other}>
        <CardHeader
          title="Address book"
          action={
            <Button
              size="small"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={newAddressForm.onTrue}
            >
              Add address
            </Button>
          }
        />

        <Stack spacing={2.5} sx={{ p: 3 }} />
      </Card>

      {renderMenuActions()}
    </>
  );
}
