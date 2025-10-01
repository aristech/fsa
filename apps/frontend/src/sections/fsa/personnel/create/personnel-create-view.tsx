'use client';

import { z as zod } from 'zod';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import {
  Stack,
  Button,
  Drawer,
  Divider,
  Checkbox,
  TextField,
  Typography,
  Autocomplete,
  FormControlLabel,
} from '@mui/material';

import { useTenantAPI } from 'src/hooks/use-tenant';

import axiosInstance from 'src/lib/axios';
import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales/use-locales';

import { toast } from 'src/components/snackbar';
import { Form, RHFTextField, RHFPhoneInput, RHFNumberInput } from 'src/components/hook-form';
// Use RHFPhoneInput for controlled behavior
// Removed direct NumberInput import; using RHFNumberInput for controlled behavior

// ----------------------------------------------------------------------

interface PersonnelCreateViewProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  personnelId?: string | null;
}

type RoleOption = { _id: string; name: string };
type UserOption = { _id: string; name: string; email: string };

const createPersonnelSchema = (t: any) =>
  zod.object({
    userId: zod.string().optional(),
    employeeId: zod.string().optional(),
    name: zod.string().optional(),
    email: zod.string().email(t('personnel.form.validation.emailInvalid')).optional(),
    phone: zod.string().optional(),
    roleId: zod.string().optional(),
    hourlyRate: zod.coerce.number().min(0, t('personnel.form.validation.hourlyRatePositive')),
    notes: zod.string().optional(),
    skills: zod.array(zod.string()).optional(),
    certifications: zod.array(zod.string()).optional(),
    sendInvitation: zod.boolean().optional(),
    environmentAccess: zod.enum(['dashboard', 'field', 'all']).optional(),
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

// ----------------------------------------------------------------------

export function PersonnelCreateView({
  open,
  onClose,
  onCreated,
  personnelId,
}: PersonnelCreateViewProps) {
  const { t } = useTranslate('dashboard');
  const { tenantId } = useTenantAPI();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [certOptions, setCertOptions] = useState<string[]>([]);
  const [resendingInvite, setResendingInvite] = useState<boolean>(false);
  const [currentPersonnel, setCurrentPersonnel] = useState<any>(null);

  const methods = useForm<zod.input<ReturnType<typeof createPersonnelSchema>>>({
    resolver: zodResolver(createPersonnelSchema(t)),
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
      sendInvitation: true,
      environmentAccess: 'dashboard',
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
    if (!open) return;

    const load = async () => {
      setLoading(true);
      try {
        // Reset form to default values when opening dialog
        reset({
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
          sendInvitation: true,
          environmentAccess: 'dashboard',
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
        });
        // If editing, fetch the record first (independent of tenantId)
        let p: any = null;
        if (personnelId) {
          try {
            const res = await axiosInstance.get(`/api/v1/personnel/?id=${personnelId}`);
            const json = res.data;
            if (json?.success && json.data) {
              p = json.data;
            }
          } catch (error) {
            console.error('Error fetching personnel:', error);
          }
        }

        // Fetch available data using correct endpoints
        const rolesUrl = `/api/v1/roles/`;

        // Fetch roles and other data
        const [rolesRes] = await Promise.all([axiosInstance.get(rolesUrl)]);

        const rolesJson = rolesRes.data;

        // TODO: Implement users, skills, and certifications endpoints
        const usersJson = { success: true, data: [] };
        const skillsJson = { success: true, data: [] };
        const certsJson = { success: true, data: [] };

        // Set roles
        let loadedRoles: RoleOption[] = Array.isArray(rolesJson?.data) ? rolesJson.data : [];
        // Ensure current role exists in options
        if (p?.role?._id && !loadedRoles.some((r) => String(r._id) === String(p.role._id))) {
          loadedRoles = [...loadedRoles, p.role];
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
          setCurrentPersonnel(p);

          // Format phone number to E.164 format if it exists and doesn't start with +
          let formattedPhone = p.user?.phone || '';
          if (formattedPhone && !formattedPhone.startsWith('+')) {
            // Assume US number if no country code, or keep as-is if we can't determine format
            if (formattedPhone.length === 10 && /^\d+$/.test(formattedPhone)) {
              formattedPhone = `+1${formattedPhone}`;
            } else if (formattedPhone.length > 10 && /^\d+$/.test(formattedPhone)) {
              formattedPhone = `+${formattedPhone}`;
            }
            // If it doesn't match expected patterns, leave it empty to avoid errors
            else if (!/^\+\d+$/.test(formattedPhone)) {
              formattedPhone = '';
            }
          }

          const formData = {
            userId: p.user?._id || '',
            employeeId: p.employeeId || '',
            name: p.user?.name || '',
            email: p.user?.email || '',
            phone: formattedPhone,
            roleId: p.role?._id || undefined,
            hourlyRate: p.hourlyRate || 0,
            notes: p.notes || '',
            skills: p.skills || [],
            certifications: p.certifications || [],
            environmentAccess: p.environmentAccess || 'dashboard',
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
            sendInvitation: false, // Always false for editing
          };

          // Reset after a small delay to ensure form is ready
          setTimeout(() => {
            reset(formData);
          }, 100);
        }
      } catch (error) {
        console.error('Error loading personnel data:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, personnelId, tenantId, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const isEdit = !!personnelId;
    const endpoint = isEdit
      ? `${CONFIG.serverUrl}/api/v1/personnel/${personnelId}`
      : `${CONFIG.serverUrl}/api/v1/personnel/`;
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
      environmentAccess: data.environmentAccess,
      ...(!isEdit && data.sendInvitation ? { sendInvitation: true } : {}),
    };

    try {
      const res = await axiosInstance({ url: endpoint, method, data: payload });
      if (res.status >= 200 && res.status < 300) {
        reset();
        onClose();
        onCreated?.();
        toast.success(isEdit ? t('personnel.personnelUpdated') : t('personnel.personnelCreated'));
      }
    } catch (error: any) {
      const message = String(error?.message || 'Failed to save personnel');
      const lower = message.toLowerCase();
      // Friendly message for existing email/user in tenant
      if (
        lower.includes('already exists') ||
        lower.includes('personnel record') ||
        lower.includes('user email exists')
      ) {
        toast.warning('User email already exists in the database.');
      } else if (lower.includes('validation')) {
        toast.error('Please check the form fields and try again.');
      } else {
        toast.error(isEdit ? t('personnel.failedToUpdate') : t('personnel.failedToCreate'));
      }
    }
  });

  const handleResendInvite = async () => {
    if (!currentPersonnel?.user?._id || !currentPersonnel?.user?.email) {
      toast.error('Cannot resend invite: Personnel user information is missing');
      return;
    }

    setResendingInvite(true);
    try {
      const response = await axiosInstance.post('/api/v1/personnel/resend-invite', {
        personnelId,
        email: currentPersonnel.user.email,
        name: currentPersonnel.user.name,
      });

      if (response.status >= 200 && response.status < 300) {
        toast.success('Invitation resent successfully');
      }
    } catch (error: any) {
      console.error('Error resending invite:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResendingInvite(false);
    }
  };

  const roleOptions = useMemo(() => roles.map((r) => ({ label: r.name, id: r._id })), [roles]);

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
            {personnelId ? t('personnel.editPersonnel') : t('personnel.createPersonnel')}
          </Typography>
          <Button color="inherit" onClick={onClose}>
            {t('personnel.close')}
          </Button>
        </Stack>
        <Divider />
        {loading ? (
          <Stack spacing={2} sx={{ px: 2.5, py: 2, textAlign: 'center' }}>
            <Typography>{t('personnel.loading')}</Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ px: 2.5, py: 2 }}>
            <RHFTextField name="name" label={t('personnel.form.name')} />
            <Stack spacing={1}>
              <RHFTextField
                name="email"
                label={t('personnel.form.email')}
                type="email"
                disabled={!!personnelId}
                helperText={personnelId ? 'Email cannot be changed after creation' : undefined}
              />
              {personnelId && currentPersonnel?.user?._id && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={handleResendInvite}
                  disabled={resendingInvite}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {resendingInvite ? 'Resending...' : 'Resend Invitation'}
                </Button>
              )}
            </Stack>
            <RHFPhoneInput name="phone" label={t('personnel.form.phone')} />
            <RHFNumberInput name="hourlyRate" captionText={t('personnel.form.hourlyRate')} />

            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={roleOptions.find((o) => o.id === field.value) ?? null}
                  options={roleOptions}
                  getOptionLabel={(o) => o.label}
                  onChange={(_, val) => field.onChange(val?.id)}
                  renderInput={(params) => (
                    <TextField {...params} label={t('personnel.form.role')} />
                  )}
                />
              )}
            />

            <Controller
              name="environmentAccess"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={field.value || 'dashboard'}
                  options={['dashboard', 'field', 'all']}
                  getOptionLabel={(option) => {
                    switch (option) {
                      case 'dashboard':
                        return 'Dashboard Environment Only';
                      case 'field':
                        return 'Field Environment Only';
                      case 'all':
                        return 'All Environments';
                      default:
                        return option;
                    }
                  }}
                  onChange={(_, val) => field.onChange(val)}
                  renderInput={(params) => <TextField {...params} label="Environment Access" />}
                />
              )}
            />

            <RHFTextField name="notes" label={t('personnel.form.notes')} multiline rows={3} />

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
                    <TextField
                      {...params}
                      label={t('personnel.form.skills')}
                      placeholder="Add skill"
                    />
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
                    <TextField
                      {...params}
                      label={t('personnel.form.certifications')}
                      placeholder="Add certification"
                    />
                  )}
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
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button color="inherit" onClick={onClose}>
                {t('personnel.cancel')}
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {personnelId ? t('personnel.save') : t('personnel.create')}
              </Button>
            </Stack>
          </Stack>
        )}
      </Form>
    </Drawer>
  );
}
