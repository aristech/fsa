'use client';

import { useMemo, useState, useEffect } from 'react';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Tab,
  Card,
  Chip,
  Tabs,
  Table,
  Stack,
  Alert,
  TableBody,
  Typography,
  TableContainer,
} from '@mui/material';

import axiosInstance from 'src/lib/axios';

import { useTable, getComparator } from 'src/components/table';

import { View403 } from 'src/sections/error';

import { PersonnelTableRow } from './personnel-table-row';
import { PersonnelTableHead } from './personnel-table-head';
import { PersonnelTableToolbar } from './personnel-table-toolbar';

// ----------------------------------------------------------------------

interface Personnel {
  _id: string;
  employeeId: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  role?: {
    _id: string;
    name: string;
    color: string;
  };
  skills: string[];
  hourlyRate: number;
  isActive: boolean;
  taskCount: number;
  projectCount: number;
  totalAssignments: number;
}

interface PersonnelListProps {
  filters: {
    name: string;
    role: string;
    status: string;
  };
}

// ----------------------------------------------------------------------

export function PersonnelList({ filters }: PersonnelListProps) {
  const theme = useTheme();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const table = useTable();

  const {
    dense,
    page,
    order,
    orderBy,
    rowsPerPage,
    selected,
    onSelectRow,
    onSelectAllRows,
    onSort,
  } = table;

  // Fetch personnel data
  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/v1/personnel/');
        const data = response.data;

        if (data.success) {
          setPersonnel(data.data);
        } else {
          setError(data.message || 'Failed to fetch personnel');
        }
      } catch (err) {
        setError('Failed to fetch personnel');
        console.error('Error fetching personnel:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonnel();
  }, []);

  // Fetch roles data
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get('/api/v1/roles/');
        const data = response.data;

        if (data.success) {
          setRoles(data.data);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };

    fetchRoles();
  }, []);

  // Create dynamic tabs based on roles and assignment counts
  const dynamicTabs = useMemo(() => {
    const tabs = [
      {
        label: 'All',
        value: 'all',
        count: personnel.length,
        color: theme.palette.primary.main,
      },
      {
        label: 'Active',
        value: 'active',
        count: personnel.filter((p) => p.isActive).length,
        color: theme.palette.success.main,
      },
      {
        label: 'Pending',
        value: 'pending',
        count: personnel.filter((p) => !p.role).length,
        color: theme.palette.warning.main,
      },
    ];

    // Add role-specific tabs
    roles.forEach((role) => {
      const rolePersonnel = personnel.filter((p) => p.role?._id === role._id);
      if (rolePersonnel.length > 0) {
        tabs.push({
          label: role.name,
          value: role._id,
          count: rolePersonnel.length,
          color: role.color,
        });
      }
    });

    // Add assignment-based tabs
    const assignedPersonnel = personnel.filter((p) => p.totalAssignments > 0);
    if (assignedPersonnel.length > 0) {
      tabs.push({
        label: 'Assigned',
        value: 'assigned',
        count: assignedPersonnel.length,
        color: theme.palette.info.main,
      });
    }

    const unassignedPersonnel = personnel.filter((p) => p.totalAssignments === 0);
    if (unassignedPersonnel.length > 0) {
      tabs.push({
        label: 'Unassigned',
        value: 'unassigned',
        count: unassignedPersonnel.length,
        color: theme.palette.grey[500],
      });
    }

    return tabs;
  }, [personnel, roles, theme.palette]);

  // Filter personnel based on active tab and filters
  const filteredPersonnel = useMemo(() => {
    let filtered = personnel;

    // Apply tab filter
    if (activeTab > 0) {
      const activeTabValue = dynamicTabs[activeTab]?.value;
      if (activeTabValue === 'active') {
        filtered = filtered.filter((p) => p.isActive);
      } else if (activeTabValue === 'pending') {
        filtered = filtered.filter((p) => !p.role);
      } else if (activeTabValue === 'assigned') {
        filtered = filtered.filter((p) => p.totalAssignments > 0);
      } else if (activeTabValue === 'unassigned') {
        filtered = filtered.filter((p) => p.totalAssignments === 0);
      } else if (activeTabValue && activeTabValue !== 'all') {
        // Role-specific filter
        filtered = filtered.filter((p) => p.role?._id === activeTabValue);
      }
    }

    // Apply additional filters
    if (filters.name) {
      filtered = filtered.filter(
        (p) =>
          (p.user?.name || '').toLowerCase().includes(filters.name.toLowerCase()) ||
          p.employeeId.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.role) {
      filtered = filtered.filter((p) => p.role?._id === filters.role);
    }

    if (filters.status === 'active') {
      filtered = filtered.filter((p) => p.isActive);
    } else if (filters.status === 'inactive') {
      filtered = filtered.filter((p) => !p.isActive);
    }

    return filtered;
  }, [personnel, activeTab, dynamicTabs, filters]);

  // Sort personnel
  const dataFiltered = useMemo(
    () =>
      applySortFilter({
        inputData: filteredPersonnel,
        comparator: getComparator(order, orderBy),
      }),
    [filteredPersonnel, order, orderBy]
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading personnel...</Typography>
      </Box>
    );
  }

  if (error) {
    return <View403 />;
  }

  return (
    <Box>
      {/* Dynamic Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              minHeight: 60,
              textTransform: 'none',
            },
          }}
        >
          {dynamicTabs.map((tab, index) => (
            <Tab
              key={tab.value}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle2">{tab.label}</Typography>
                  <Chip
                    label={tab.count}
                    size="small"
                    sx={{
                      backgroundColor: tab.color,
                      color: 'white',
                      fontSize: '0.75rem',
                      height: 20,
                    }}
                  />
                </Stack>
              }
              sx={{
                minWidth: 120,
                '&.Mui-selected': {
                  color: tab.color,
                },
              }}
            />
          ))}
        </Tabs>
      </Card>

      {/* Personnel Table */}
      <Card>
        <PersonnelTableToolbar
          numSelected={selected.length}
          filters={filters}
          onFilters={(name, value) => {
            // Handle additional filtering if needed
          }}
        />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
            <PersonnelTableHead
              order={order}
              orderBy={orderBy}
              onSort={onSort}
              onSelectAllRows={(checked) =>
                onSelectAllRows(
                  checked,
                  dataFiltered.map((row) => row._id)
                )
              }
              numSelected={selected.length}
              rowCount={dataFiltered.length}
            />

            <TableBody>
              {dataFiltered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <PersonnelTableRow
                    key={row._id}
                    row={row}
                    selected={selected.includes(row._id)}
                    onSelectRow={() => onSelectRow(row._id)}
                  />
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

// ----------------------------------------------------------------------

function applySortFilter({
  inputData,
  comparator,
}: {
  inputData: Personnel[];
  comparator: (a: Personnel, b: Personnel) => number;
}) {
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  return stabilizedThis.map((el) => el[0]);
}
