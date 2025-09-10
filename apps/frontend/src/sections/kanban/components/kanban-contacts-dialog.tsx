import type { IKanbanAssignee } from 'src/types/kanban';

import useSWR from 'swr';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SearchNotFound } from 'src/components/search-not-found';

// ----------------------------------------------------------------------

const ITEM_HEIGHT = 64;

type Props = {
  open: boolean;
  onClose: () => void;
  assignee?: IKanbanAssignee[];
  onAssign?: (assignees: IKanbanAssignee[]) => void;
};

export function KanbanContactsDialog({ assignee = [], open, onClose, onAssign }: Props) {
  const [searchContact, setSearchContact] = useState('');

  const axiosFetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);
  const { data: personnelResp } = useSWR(endpoints.fsa.personnel.list, axiosFetcher);
  const contacts: IKanbanAssignee[] = useMemo(
    () =>
      (personnelResp?.data || []).map((p: any) => ({
        id: p._id,
        name: p.user?.name || p.employeeId || 'Unknown',
        email: p.user?.email,
        avatarUrl: p.user?.avatar,
      })),
    [personnelResp]
  );

  const handleSearchContacts = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchContact(event.target.value);
  }, []);

  const dataFiltered = applyFilter({ inputData: contacts, query: searchContact });

  const notFound = !dataFiltered.length && !!searchContact;

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle sx={{ pb: 0 }}>
        Contacts <span>({contacts.length})</span>
      </DialogTitle>

      <Box sx={{ px: 3, py: 2.5 }}>
        <TextField
          fullWidth
          value={searchContact}
          onChange={handleSearchContacts}
          placeholder="Search..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {notFound ? (
          <SearchNotFound query={searchContact} sx={{ mt: 3, mb: 10 }} />
        ) : (
          <Scrollbar sx={{ height: ITEM_HEIGHT * 6, px: 2.5 }}>
            <Box component="ul">
              {dataFiltered.map((contact) => {
                const checked = assignee.map((person) => person.name).includes(contact.name);

                return (
                  <Box
                    component="li"
                    key={contact.id}
                    sx={{
                      gap: 2,
                      display: 'flex',
                      height: ITEM_HEIGHT,
                      alignItems: 'center',
                    }}
                  >
                    <Avatar>
                      {contact.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || 'C'}
                    </Avatar>

                    <ListItemText primary={contact.name} secondary={contact.email} />

                    <Button
                      size="small"
                      color={checked ? 'primary' : 'inherit'}
                      startIcon={
                        <Iconify
                          width={16}
                          icon={checked ? 'eva:checkmark-fill' : 'mingcute:add-line'}
                          sx={{ mr: -0.5 }}
                        />
                      }
                    onClick={() => {
                      let next = assignee;
                      if (checked) {
                        next = assignee.filter((p) => p.id !== contact.id);
                      } else {
                        next = [...assignee, contact];
                      }
                      onAssign?.(next);
                    }}
                    >
                      {checked ? 'Assigned' : 'Assign'}
                    </Button>
                  </Box>
                );
              })}
            </Box>
          </Scrollbar>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  query: string;
  inputData: IKanbanAssignee[];
};

function applyFilter({ inputData, query }: ApplyFilterProps) {
  if (!query) return inputData;

  return inputData.filter(({ name, email }) =>
    [name, email].some((field) => field?.toLowerCase().includes(query.toLowerCase()))
  );
}
