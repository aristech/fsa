'use client';

import type { TableHeadCellProps } from 'src/components/table';
import type { IUserItem, IUserTableFilters } from 'src/types/user';

import { useBoolean, useSetState } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';

import { useTenantAPI } from 'src/hooks/use-tenant';

import axios from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  rowInPage,
  TableNoData,
  getComparator,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { UserTableToolbar } from 'src/sections/user/user-table-toolbar';
import { UserTableFiltersResult } from 'src/sections/user/user-table-filters-result';

import { PersonnelCreateView } from '../create/personnel-create-view';
import { PersonnelUserTableRow } from '../list/personnel-user-table-row';

// ----------------------------------------------------------------------

// Status tabs removed

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'name', label: 'Name' },
  { id: 'phoneNumber', label: 'Phone number', width: 180 },
  { id: 'role', label: 'Role', width: 180 },
  { id: 'status', label: 'Status', width: 100 },
  { id: 'isActive', label: 'Active', width: 100 },
  { id: '', width: 88 },
];

// ----------------------------------------------------------------------

type PersonnelApi = {
  _id: string;
  employeeId: string;
  user?: { _id: string; name: string; email: string; phone?: string };
  role?: { _id: string; name: string; color: string };
  isActive: boolean;
  status: 'pending' | 'active' | 'banned';
};

type RoleApi = { _id: string; name: string };

function mapPersonnelToUserItem(person: PersonnelApi): { row: IUserItem; editHref: string } {
  const user = person.user;
  const role = person.role;

  const status: IUserItem['status'] = person.status;

  const row: IUserItem = {
    id: person._id,
    name: user?.name || 'Unknown',
    email: user?.email || '',
    phoneNumber: user?.phone || '',
    role: role?.name || 'Unassigned',
    status,
    company: '',
    avatarUrl: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    isVerified: false,
    isActive: person.isActive,
  };

  const editHref = user ? paths.dashboard.user.edit(user._id) : paths.dashboard.user.list;

  return { row, editHref };
}

// ----------------------------------------------------------------------

export function PersonnelUsersAdapterView() {
  const table = useTable();
  const { getURL } = useTenantAPI();

  const confirmDialog = useBoolean();
  const createDialog = useBoolean();
  const [editingId, setEditingId] = useState<string | null>(null);

  const [tableData, setTableData] = useState<IUserItem[]>([]);
  const [editHrefs, setEditHrefs] = useState<Record<string, string>>({});
  const [roleOptions, setRoleOptions] = useState<{ id: string; name: string }[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  const filters = useSetState<IUserTableFilters>({ name: '', role: [], status: 'all' });
  const { state: currentFilters, setState: updateFilters } = filters;

  const loadData = async () => {
    try {
      const apiPage = table.page + 1;
      const apiLimit = table.rowsPerPage;
      const statusQuery =
        currentFilters.status && currentFilters.status !== 'all'
          ? `&status=${currentFilters.status}`
          : '';
      // Map selected role name → role id for server query
      const selectedRoleName = currentFilters.role[0];
      const selectedRole = roleOptions.find((r) => r.name === selectedRoleName);
      const roleQuery = selectedRole ? `&roleId=${encodeURIComponent(selectedRole.id)}` : '';

      // Debug logging
      if (currentFilters.role.length > 0) {
        console.log('Role filter debug:', {
          selectedRoleName,
          selectedRole,
          roleOptions,
          roleQuery,
        });
      }
      const searchQuery = currentFilters.name
        ? `&q=${encodeURIComponent(currentFilters.name)}`
        : '';

      // Fetch personnel and roles with tenant scoping
      const [personnelRes, rolesRes] = await Promise.all([
        axios.get(
          getURL(
            `/api/v1/personnel/?page=${apiPage}&limit=${apiLimit}${statusQuery}${roleQuery}${searchQuery}`
          )
        ),
        axios.get(getURL('/api/v1/roles/')),
      ]);

      const personnelJson = personnelRes.data;
      const rolesJson = rolesRes.data;

      if (Array.isArray(rolesJson?.data)) {
        const mappedRoles = rolesJson.data.map((r: RoleApi) => ({ id: r._id, name: r.name }));
        console.log('Roles loaded:', mappedRoles);
        setRoleOptions(mappedRoles);
      }

      if (Array.isArray(personnelJson?.data)) {
        const mapped = (personnelJson.data as PersonnelApi[]).map(mapPersonnelToUserItem);
        setTableData(mapped.map((m) => m.row));
        setEditHrefs(Object.fromEntries(mapped.map((m) => [m.row.id, m.editHref])));
        if (typeof personnelJson.meta?.totalFiltered === 'number') {
          setTotalCount(personnelJson.meta.totalFiltered);
        } else {
          setTotalCount(mapped.length);
        }
        // Update tab labels via statusCounts if needed
      }
    } catch (err) {
      // Silent fail; UI will show empty state

      console.error('Failed to load personnel/roles', err);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.page, table.rowsPerPage, currentFilters.status, currentFilters.role, currentFilters.name]);

  const dataFiltered = useMemo(
    () =>
      applyFilter({
        inputData: tableData,
        comparator: getComparator(table.order, table.orderBy),
        filters: currentFilters,
      }),
    [tableData, table.order, table.orderBy, currentFilters]
  );

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!currentFilters.name || currentFilters.role.length > 0 || currentFilters.status !== 'all';

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleDeleteRow = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/v1/personnel/${id}`);
        setTableData((prev) => prev.filter((row) => row.id !== id));
        table.onUpdatePageDeleteRow(dataInPage.length);
        toast.success('Delete success!');
      } catch (err) {
        console.error('Delete error:', err);
        toast.error('Delete failed');
      }
    },
    [dataInPage.length, table]
  );

  const handleDeleteRows = useCallback(() => {
    const deleteRows = tableData.filter((row) => !table.selected.includes(row.id));

    toast.success('Delete success!');

    setTableData(deleteRows);

    table.onUpdatePageDeleteRows(dataInPage.length, dataFiltered.length);
  }, [dataFiltered.length, dataInPage.length, table, tableData]);

  // Removed status tabs handler

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {table.selected.length} </strong> items?
        </>
      }
      action={
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            handleDeleteRows();
            confirmDialog.onFalse();
          }}
        >
          Delete
        </Button>
      }
    />
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Personnel"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Personnel', href: paths.dashboard.user.root },
            { name: 'List' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={createDialog.onTrue}
            >
              Add personnel
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <UserTableToolbar
            filters={filters}
            onResetPage={table.onResetPage}
            options={{ roles: Array.from(new Set(roleOptions.map((r) => r.name))) }}
          />

          {canReset && (
            <UserTableFiltersResult
              filters={filters}
              totalResults={dataFiltered.length}
              onResetPage={table.onResetPage}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={dataFiltered.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  dataFiltered.map((row) => row.id)
                )
              }
              action={
                <Tooltip title="Delete">
                  <IconButton color="primary" onClick={confirmDialog.onTrue}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Tooltip>
              }
            />

            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={TABLE_HEAD}
                  rowCount={totalCount}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataFiltered.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {dataFiltered.map((row) => (
                    <PersonnelUserTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onDeleteRow={() => handleDeleteRow(row.id)}
                      editHref="#"
                      onEdit={() => {
                        setEditingId(row.id);
                        createDialog.onTrue();
                      }}
                    />
                  ))}

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={totalCount}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      </DashboardContent>

      <PersonnelCreateView
        open={createDialog.value}
        onClose={() => {
          createDialog.onFalse();
          setEditingId(null);
        }}
        onCreated={() => {
          setEditingId(null);
          loadData();
        }}
        personnelId={editingId}
      />

      {renderConfirmDialog()}
    </>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  inputData: IUserItem[];
  filters: IUserTableFilters;
  comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, filters }: ApplyFilterProps) {
  const { name, status, role } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter((user) => user.name.toLowerCase().includes(name.toLowerCase()));
  }

  if (status !== 'all') {
    inputData = inputData.filter((user) => user.status === status);
  }

  if (role.length) {
    inputData = inputData.filter((user) => role.includes(user.role));
  }

  return inputData;
}
