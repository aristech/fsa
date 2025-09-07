'use client';

import { z as zod } from 'zod';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import {
  Stack,
  Drawer,
  Button,
  Divider,
  Checkbox,
  TextField,
  Typography,
  Autocomplete,
  FormControlLabel,
} from '@mui/material';

import { useTenantAPI } from 'src/hooks/use-tenant';

import { Form, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

interface PersonnelCreateViewProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  personnelId?: string | null;
}

type RoleOption = { _id: string; name: string };
type UserOption = { _id: string; name: string; email: string };

const schema = zod.object({
  userId: zod.string().optional(),
  employeeId: zod.string().optional(),
  name: zod.string().optional(),
  email: zod.string().email('Invalid email').optional(),
  phone: zod.string().optional(),
  roleId: zod.string().optional(),
  hourlyRate: zod.coerce.number().min(0, 'Hourly rate must be positive'),
  notes: zod.string().optional(),
  skills: zod.array(zod.string()).optional(),
  certifications: zod.array(zod.string()).optional(),
  sendInvitation: zod.boolean().optional(),
  availability: zod
    .object({
      monday: zod.object({ start: zod.string(), end: zod.string(), available: zod.boolean() }),
      tuesday: zod.object({ start: zod.string(), end: zod.string(), available: zod.boolean() }),
      wednesday: zod.object({ start: zod.string(), end: zod.string(), available: zod.boolean() }),
      thursday: zod.object({ start: zod.string(), end: zod.string(), available: zod.boolean() }),
      friday: zod.object({ start: zod.string(), end: zod.string(), available: zod.boolean() }),
      saturday: zod.object({ start: zod.string(), end: zod.string(), available: zod.boolean() }),
      sunday: zod.object({ start: zod.string(), end: zod.string(), available: zod.boolean() }),
    })
    .optional(),
  location: zod
    .object({
      address: zod.string().optional(),
    })
    .optional(),
});

type FormValues = zod.output<typeof schema>;

// ----------------------------------------------------------------------

export function PersonnelCreateView({
  open,
  onClose,
  onCreated,
  personnelId,
}: PersonnelCreateViewProps) {
  const { getURL, tenantId } = useTenantAPI();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const methods = useForm<zod.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: '',
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      roleId: undefined,
      hourlyRate: 0,
      notes: '',
      skills: [],
      certifications: [],
      sendInvitation: false,
      availability: {
        monday: { start: '09:00', end: '17:00', available: true },
        tuesday: { start: '09:00', end: '17:00', available: true },
        wednesday: { start: '09:00', end: '17:00', available: true },
        thursday: { start: '09:00', end: '17:00', available: true },
        friday: { start: '09:00', end: '17:00', available: true },
        saturday: { start: '09:00', end: '17:00', available: false },
        sunday: { start: '09:00', end: '17:00', available: false },
      },
      location: { address: '' },
    },
  });

  const { handleSubmit, control, reset } = methods;

  useEffect(() => {
    if (!open || loading) return;

    const load = async () => {
      setLoading(true);
      try {
        // If editing, fetch the record first (independent of tenantId)
        let p: any = null;
        if (personnelId) {
          const res = await fetch(getURL(`/api/v1/personnel/?id=${personnelId}`));
          const json = await res.json();
          if (json?.success && json.data) {
            p = json.data;
          }
        }

        // Determine effective tenant id: prefer context tenantId, fallback to personnel.tenantId
        const effectiveTenantId: string | null =
          tenantId || (p?.tenantId ? String(p.tenantId) : null);

        // Fetch all tenant-scoped data in parallel using effective tenant id
        const rolesUrl = effectiveTenantId
          ? `/api/v1/roles/?tenantId=${effectiveTenantId}`
          : getURL('/api/v1/roles/');
        const usersUrl = effectiveTenantId
          ? `/api/v1/users/?tenantId=${effectiveTenantId}`
          : getURL('/api/v1/users/');
        const skillsUrl = effectiveTenantId
          ? `/api/v1/skills/?tenantId=${effectiveTenantId}`
          : getURL('/api/v1/skills/');
        const certsUrl = effectiveTenantId
          ? `/api/v1/certifications/?tenantId=${effectiveTenantId}`
          : getURL('/api/v1/certifications/');

        const [rolesRes, usersRes, skillsRes, certsRes] = await Promise.all([
          fetch(rolesUrl),
          fetch(usersUrl),
          fetch(skillsUrl),
          fetch(certsUrl),
        ]);

        const [rolesJson, usersJson, skillsJson, certsJson] = await Promise.all([
          rolesRes.json(),
          usersRes.json(),
          skillsRes.json(),
          certsRes.json(),
        ]);

        // Set roles
        let loadedRoles: RoleOption[] = Array.isArray(rolesJson?.data) ? rolesJson.data : [];
        // Ensure current role exists in options
        if (p?.roleId?._id && !loadedRoles.some((r) => String(r._id) === String(p.roleId._id))) {
          loadedRoles = [...loadedRoles, p.roleId];
        }
        setRoles(loadedRoles);

        // Set users
        setUsers(Array.isArray(usersJson?.data) ? usersJson.data : []);

        // Set skills and certifications
        setSkillOptions(
          Array.isArray(skillsJson?.data) ? skillsJson.data.map((s: any) => s.name) : []
        );
        setCertOptions(
          Array.isArray(certsJson?.data) ? certsJson.data.map((c: any) => c.name) : []
        );

        // Reset form with personnel data if editing
        if (p) {
          console.log('Personnel data loaded:', p);
          const formData = {
            userId: p.userId?._id || '',
            employeeId: p.employeeId || '',
            name: p.userId?.name || '',
            email: p.userId?.email || '',
            phone: p.userId?.phone || '',
            roleId: p.roleId?._id || undefined,
            hourlyRate: p.hourlyRate || 0,
            notes: p.notes || '',
            skills: p.skills || [],
            certifications: p.certifications || [],
            availability: p.availability || {
              monday: { start: '09:00', end: '17:00', available: true },
              tuesday: { start: '09:00', end: '17:00', available: true },
              wednesday: { start: '09:00', end: '17:00', available: true },
              thursday: { start: '09:00', end: '17:00', available: true },
              friday: { start: '09:00', end: '17:00', available: true },
              saturday: { start: '09:00', end: '17:00', available: false },
              sunday: { start: '09:00', end: '17:00', available: false },
            },
            location: { address: p.location?.address || '' },
          };
          console.log('Form data to reset:', formData);

          // Reset after a small delay to ensure form is ready
          setTimeout(() => {
            methods.reset(formData);
          }, 100);
        }
      } catch (error) {
        console.error('Error loading personnel data:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, personnelId, tenantId]); // Remove getURL and editingId from dependencies

  const onSubmit = handleSubmit(async (data) => {
    const isEdit = !!personnelId;
    const endpoint = isEdit
      ? getURL(`/api/v1/personnel/?id=${personnelId}`)
      : getURL('/api/v1/personnel/');
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      roleId: data.roleId,
      hourlyRate: data.hourlyRate,
      notes: data.notes,
      skills: data.skills,
      certifications: data.certifications,
      availability: data.availability,
      location: data.location,
      name: data.name,
      email: data.email,
      phone: data.phone,
      userId: data.userId || undefined,
    };

    // Add invitation flag for new personnel
    if (!isEdit && data.sendInvitation) {
      payload.sendInvitation = true;
    }

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      reset();
      onClose();
      onCreated?.();
      // Optionally refresh list view
    }
  });

  const roleOptions = useMemo(() => roles.map((r) => ({ label: r.name, id: r._id })), [roles]);
  const userOptions = useMemo(
    () => users.map((u) => ({ label: `${u.name} (${u.email})`, id: u._id })),
    [users]
  );

  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [certOptions, setCertOptions] = useState<string[]>([]);

  const handleAddRole = async (name: string) => {
    const res = await fetch(getURL('/api/v1/roles/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (json?.data) setRoles((prev) => [...prev, json.data]);
  };

  const handleDeleteRole = async (id: string) => {
    await fetch(getURL(`/api/v1/roles/?id=${id}`), { method: 'DELETE' });
    setRoles((prev) => prev.filter((r) => r._id !== id));
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      slotProps={{ backdrop: { invisible: true }, paper: { sx: { width: { xs: 1, sm: 520 } } } }}
    >
      <Form methods={methods} onSubmit={onSubmit}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2.5, py: 2 }}
        >
          <Typography variant="h6">
            {personnelId ? 'Edit Personnel' : 'Add New Personnel'}
          </Typography>
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
        </Stack>
        <Divider />
        {loading ? (
          <Stack spacing={2} sx={{ px: 2.5, py: 2, textAlign: 'center' }}>
            <Typography>Loading...</Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ px: 2.5, py: 2 }}>
            <RHFTextField name="name" label="Full name" />
            <RHFTextField name="email" label="Email" type="email" />
            <RHFTextField name="phone" label="Phone" />
            <RHFTextField name="hourlyRate" label="Hourly rate" type="number" />

            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={roleOptions.find((o) => o.id === field.value) ?? null}
                  options={roleOptions}
                  getOptionLabel={(o) => o.label}
                  onChange={(_, val) => field.onChange(val?.id)}
                  renderInput={(params) => <TextField {...params} label="Role" />}
                />
              )}
            />

            <RHFTextField name="notes" label="Notes" multiline rows={3} />

            <Controller
              name="skills"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={skillOptions}
                  value={field.value ?? []}
                  onChange={(_, val) => field.onChange(val)}
                  renderInput={(params) => (
                    <TextField {...params} label="Skills" placeholder="Add skill" />
                  )}
                />
              )}
            />

            <Controller
              name="certifications"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={certOptions}
                  value={field.value ?? []}
                  onChange={(_, val) => field.onChange(val)}
                  renderInput={(params) => (
                    <TextField {...params} label="Certifications" placeholder="Add certification" />
                  )}
                />
              )}
            />

            <Controller
              name="sendInvitation"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={field.onChange} />}
                  label="Send email invitation to personnel"
                />
              )}
            />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Availability</Typography>
            {(
              [
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
                'sunday',
              ] as const
            ).map((day) => (
              <Stack key={day} direction="row" spacing={1} alignItems="center">
                <Typography sx={{ minWidth: 88, textTransform: 'capitalize' }}>{day}</Typography>
                <RHFTextField name={`availability.${day}.start`} label="Start" />
                <RHFTextField name={`availability.${day}.end`} label="End" />
                <Controller
                  name={`availability.${day}.available` as const}
                  control={control}
                  render={({ field }) => (
                    <Button
                      variant={field.value ? 'contained' : 'outlined'}
                      color={field.value ? 'success' : 'inherit'}
                      onClick={() => field.onChange(!field.value)}
                    >
                      {field.value ? 'Available' : 'Off'}
                    </Button>
                  )}
                />
              </Stack>
            ))}

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Address</Typography>
            <RHFTextField name="location.address" label="Address" />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button color="inherit" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {personnelId ? 'Save Changes' : 'Create'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Form>
    </Drawer>
  );
}
