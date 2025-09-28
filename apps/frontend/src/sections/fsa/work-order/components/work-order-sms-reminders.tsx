'use client';

import { Iconify } from '@/components/iconify';
import { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Chip,
  Alert,
  Stack,
  Button,
  Dialog,
  Switch,
  MenuItem,
  TextField,
  Typography,
  DialogTitle,
  FormControl,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

interface Client {
  _id: string;
  name: string;
  company?: string;
  phone?: string;
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
}

interface SmsReminderConfig {
  enabled: boolean;
  scheduledDate?: Date | string | null;
  reminderType: 'monthly' | 'yearly' | 'custom' | 'test';
  customReminderDate?: Date | string | null;
  customReminderInterval?: 'monthly' | 'yearly';
  selectedPhoneNumber?: string;
  selectedRecipientName?: string;
  messageType: 'preset' | 'custom';
  customMessage?: string;
  presetMessageId?: string;
  serviceActive: boolean;
  lastSent?: Date | string | null;
  nextScheduled?: Date | string | null;
}

interface PhoneOption {
  phone: string;
  name: string;
  type: 'client' | 'contact';
  label: string;
}

interface PresetMessage {
  id: string;
  title: string;
  content: string;
  variables: string[];
}

interface WorkOrderSmsRemindersProps {
  client?: Client | null;
  scheduledDate?: Date | string | null;
  workOrderTitle?: string;
  onConfigChange?: (config: SmsReminderConfig) => void;
  defaultConfig?: Partial<SmsReminderConfig>;
  mode?: 'create' | 'edit' | 'view';
  showComponent?: boolean;
  workOrderId?: string;
}

// Preset messages for different scenarios - will be created inside component to use translations

export function WorkOrderSmsReminders({
  client,
  scheduledDate,
  workOrderTitle,
  onConfigChange,
  defaultConfig,
  mode = 'create',
  showComponent = true,
  workOrderId,
}: WorkOrderSmsRemindersProps) {
  const { t } = useTranslate('dashboard');

  // Preset messages for different scenarios
  const PRESET_MESSAGES: PresetMessage[] = useMemo(
    () => [
      {
        id: 'monthly-service',
        title: t('smsReminders.presetMessages.monthlyService'),
        content:
          'Hello {{recipientName}}, this is a reminder that your monthly service for {{workOrderTitle}} is scheduled for {{scheduledDate}}. Please contact us to confirm your appointment. Thank you!',
        variables: ['recipientName', 'workOrderTitle', 'scheduledDate'],
      },
      {
        id: 'yearly-service',
        title: t('smsReminders.presetMessages.yearlyService'),
        content:
          'Hello {{recipientName}}, this is a reminder that your yearly service for {{workOrderTitle}} is scheduled for {{scheduledDate}}. Please contact us to confirm your appointment. Thank you!',
        variables: ['recipientName', 'workOrderTitle', 'scheduledDate'],
      },
      {
        id: 'custom-service',
        title: t('smsReminders.presetMessages.customService'),
        content:
          'Hello {{recipientName}}, this is a reminder about your upcoming service for {{workOrderTitle}} scheduled for {{scheduledDate}}. Please contact us to confirm your appointment. Thank you!',
        variables: ['recipientName', 'workOrderTitle', 'scheduledDate'],
      },
    ],
    [t]
  );

  const [config, setConfig] = useState<SmsReminderConfig>(() => ({
    enabled: defaultConfig?.enabled ?? false,
    scheduledDate,
    reminderType: defaultConfig?.reminderType ?? 'monthly',
    customReminderDate: defaultConfig?.customReminderDate ?? null,
    customReminderInterval: defaultConfig?.customReminderInterval ?? 'monthly',
    selectedPhoneNumber: defaultConfig?.selectedPhoneNumber ?? '',
    selectedRecipientName: defaultConfig?.selectedRecipientName ?? '',
    messageType: defaultConfig?.messageType ?? 'preset',
    customMessage: defaultConfig?.customMessage ?? '',
    presetMessageId: defaultConfig?.presetMessageId ?? 'monthly-service',
    serviceActive: defaultConfig?.serviceActive ?? false,
    lastSent: defaultConfig?.lastSent ?? null,
    nextScheduled: defaultConfig?.nextScheduled ?? null,
  }));

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Update config when defaultConfig changes (for edit mode)
  useEffect(() => {
    if (defaultConfig) {
      setConfig({
        enabled: defaultConfig.enabled ?? false,
        scheduledDate,
        reminderType: defaultConfig.reminderType ?? 'monthly',
        customReminderDate: defaultConfig.customReminderDate ?? null,
        customReminderInterval: defaultConfig.customReminderInterval ?? 'monthly',
        selectedPhoneNumber: defaultConfig.selectedPhoneNumber ?? '',
        selectedRecipientName: defaultConfig.selectedRecipientName ?? '',
        messageType: defaultConfig.messageType ?? 'preset',
        customMessage: defaultConfig.customMessage ?? '',
        presetMessageId: defaultConfig.presetMessageId ?? 'monthly-service',
        serviceActive: defaultConfig.serviceActive ?? false,
        lastSent: defaultConfig.lastSent ?? null,
        nextScheduled: defaultConfig.nextScheduled ?? null,
      });
    }
  }, [defaultConfig, scheduledDate]);

  // Build phone options from client data
  const phoneOptions = useMemo((): PhoneOption[] => {
    if (!client) return [];

    const options: PhoneOption[] = [];

    // Add client phone if exists
    if (client.phone) {
      options.push({
        phone: client.phone,
        name: client.name,
        type: 'client',
        label: `${client.name} (Client) - ${client.phone}`,
      });
    }

    // Add contact person phone if exists
    if (client.contactPerson?.phone) {
      options.push({
        phone: client.contactPerson.phone,
        name: client.contactPerson.name,
        type: 'contact',
        label: `${client.contactPerson.name} (Contact Person) - ${client.contactPerson.phone}`,
      });
    }

    return options;
  }, [client]);

  // Check if component should be shown
  const shouldShowComponent = showComponent && scheduledDate && phoneOptions.length > 0;

  // Get selected phone and recipient
  const selectedPhone = config.selectedPhoneNumber || '';
  const selectedRecipient = phoneOptions.find((p) => p.phone === selectedPhone);

  // Handle config changes
  const handleConfigChange = useCallback(
    (updates: Partial<SmsReminderConfig>) => {
      setConfig((prev) => {
        const newConfig = { ...prev, ...updates };

        // Defer parent notification to avoid setState-in-render
        setTimeout(() => {
          onConfigChange?.(newConfig);
        }, 0);

        return newConfig;
      });
    },
    [onConfigChange]
  );

  // Handle phone selection
  const handlePhoneSelection = useCallback(
    (selectedValue: string) => {
      const option = phoneOptions.find((p) => p.phone === selectedValue);

      // Use the same pattern as other fields
      handleConfigChange({
        selectedPhoneNumber: selectedValue,
        selectedRecipientName: option?.name || '',
      });
    },
    [phoneOptions, handleConfigChange]
  );

  // Note: Auto-selection removed to prevent setState-in-render errors
  // Users can manually select phone numbers from the dropdown

  // Handle service toggle
  const handleServiceToggle = useCallback(async () => {
    if (config.enabled) {
      // Deactivate service
      if (workOrderId) {
        try {
          await axiosInstance.post(endpoints.smsReminders.deactivate, {
            workOrderId,
          });
          handleConfigChange({ enabled: false, serviceActive: false, nextScheduled: null });
        } catch (error) {
          console.error('Failed to deactivate SMS service:', error);
        }
      } else {
        handleConfigChange({ enabled: false, serviceActive: false });
      }
    } else {
      // Show confirmation dialog
      setShowConfirmation(true);
    }
  }, [config.enabled, handleConfigChange, workOrderId]);

  // Handle confirmation
  const handleConfirmService = useCallback(async () => {
    if (workOrderId) {
      try {
        const response = await axiosInstance.post(endpoints.smsReminders.activate, {
          workOrderId,
          config: {
            reminderType: config.reminderType,
            customReminderDate: config.customReminderDate,
            customReminderInterval: config.customReminderInterval,
            selectedPhoneNumber: config.selectedPhoneNumber,
            selectedRecipientName: config.selectedRecipientName,
            messageType: config.messageType,
            customMessage: config.customMessage,
            presetMessageId: config.presetMessageId,
          },
        });

        const { config: updatedConfig, nextScheduled } = response.data;
        handleConfigChange({
          ...updatedConfig,
          enabled: true,
          nextScheduled,
        });
        setShowConfirmation(false);
      } catch (error) {
        console.error('Failed to activate SMS service:', error);
      }
    } else {
      handleConfigChange({ enabled: true, serviceActive: true });
      setShowConfirmation(false);
    }
  }, [handleConfigChange, workOrderId, config]);

  // Get selected preset message
  const selectedPresetMessage = PRESET_MESSAGES.find((m) => m.id === config.presetMessageId);

  // Don't render if conditions not met
  if (!shouldShowComponent) {
    return (
      <Card sx={{ p: 2 }}>
        <Alert severity="info">{t('smsReminders.requirements.title')}</Alert>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{t('smsReminders.title')}</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {config.enabled
                  ? t('smsReminders.serviceStatus.active')
                  : t('smsReminders.serviceStatus.inactive')}
              </Typography>
              <Switch checked={config.enabled} onChange={handleServiceToggle} color="primary" />
            </Stack>
          </Stack>
        </Box>

        {config.enabled && (
          <>
            {/* Service Status */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={t('smsReminders.serviceStatus.serviceActive')}
                  color="success"
                  size="small"
                  icon={<Iconify icon="eva:checkmark-circle-2-fill" />}
                />
                {config.nextScheduled && (
                  <Chip
                    label={`Next: ${new Date(config.nextScheduled).toLocaleDateString()}`}
                    color="info"
                    size="small"
                  />
                )}
              </Stack>
            </Box>

            {/* Configuration Summary */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('smsReminders.configuration.title')}
              </Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('smsReminders.configuration.recipient', {
                      name: config.selectedRecipientName || selectedRecipient?.label || 'Unknown',
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('smsReminders.configuration.reminderType', {
                      type:
                        config.reminderType.charAt(0).toUpperCase() + config.reminderType.slice(1),
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('smsReminders.configuration.message', {
                      message:
                        config.messageType === 'preset'
                          ? selectedPresetMessage?.title || 'Preset Message'
                          : config.customMessage || 'Custom Message',
                    })}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Test Message */}
            {/* <Box>
              <Typography variant="subtitle2" gutterBottom>
                Send Test Message
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={async () => {
                  if (!selectedRecipient) {
                    alert('Please select a recipient first');
                    return;
                  }

                  const testMessage =
                    config.messageType === 'preset' && selectedPresetMessage
                      ? selectedPresetMessage.content
                          .replace('{{recipientName}}', selectedRecipient.name)
                          .replace('{{workOrderTitle}}', workOrderTitle || 'Service')
                          .replace(
                            '{{scheduledDate}}',
                            scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'Date'
                          )
                      : config.customMessage || 'Test message';

                  try {
                    const response = await axiosInstance.post(endpoints.smsReminders.sendTest, {
                      phoneNumber: selectedRecipient.phone,
                      message: testMessage,
                      recipientName: selectedRecipient.name,
                    });

                    if (response.data.success) {
                      alert(
                        `Test message sent successfully via ${response.data.result?.channel?.toUpperCase() || 'SMS'}! Message ID: ${response.data.result?.messageId || 'Unknown'}`
                      );
                    } else {
                      alert(
                        `Failed to send test message: ${response.data.error || 'Unknown error'}`
                      );
                    }
                  } catch (error) {
                    const errorMessage =
                      (error as any)?.response?.data?.error ||
                      (error as any)?.message ||
                      'Failed to send test message';

                    alert(`Error: ${errorMessage}`);
                  }
                }}
                startIcon={<Iconify icon="eva:paper-plane-fill" />}
              >
                Send Test SMS
              </Button>
            </Box> */}

            {/* Message History Placeholder */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('smsReminders.history.title')}
              </Typography>
              <Alert severity="info">{t('smsReminders.history.placeholder')}</Alert>
            </Box>
          </>
        )}

        {!config.serviceActive && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('smsReminders.requirements.description')}
            </Typography>

            <Button
              variant="outlined"
              onClick={() => setShowConfirmation(true)}
              startIcon={<Iconify icon="eva:settings-2-fill" />}
              sx={{ mt: 2 }}
            >
              {t('smsReminders.configuration.configureReminders')}
            </Button>
          </Box>
        )}

        {/* Configuration Dialog */}
        <Dialog
          open={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>{t('smsReminders.dialog.title')}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Step 1: Phone Selection */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('smsReminders.steps.selectRecipient')}
                </Typography>
                {phoneOptions.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No phone numbers available. Please ensure the client has a phone number or
                    contact person with phone number.
                  </Alert>
                )}
                {phoneOptions.length > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    {phoneOptions.length} phone number{phoneOptions.length > 1 ? 's' : ''} available
                  </Typography>
                )}
                <FormControl fullWidth size="small">
                  <TextField
                    select
                    value={selectedPhone}
                    onChange={(e) => handlePhoneSelection(e.target.value)}
                    size="small"
                    label="Select Recipient"
                    placeholder="Choose a phone number"
                    helperText="Choose the recipient for SMS/Viber messages"
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => {
                        if (!value) return '';
                        const option = phoneOptions.find((p) => p.phone === value);
                        return option ? option.label : String(value);
                      },
                    }}
                  >
                    {phoneOptions.map((option, index) => (
                      <MenuItem
                        key={`${option.phone}-${option.type}-${index}`}
                        value={option.phone}
                        sx={{ py: 1.5 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            width: '100%',
                          }}
                        >
                          <Typography variant="body2" fontWeight="medium">
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.type === 'client' ? 'Client' : 'Contact Person'} •{' '}
                            {option.phone}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
              </Box>

              {/* Step 2: Reminder Type */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('smsReminders.steps.reminderSchedule')}
                </Typography>
                <FormControl fullWidth size="small">
                  <TextField
                    select
                    value={config.reminderType}
                    onChange={(e) => handleConfigChange({ reminderType: e.target.value as any })}
                    size="small"
                  >
                    <MenuItem value="monthly">{t('smsReminders.reminderTypes.monthly')}</MenuItem>
                    <MenuItem value="yearly">{t('smsReminders.reminderTypes.yearly')}</MenuItem>
                    <MenuItem value="custom">{t('smsReminders.reminderTypes.custom')}</MenuItem>
                    <MenuItem value="test">{t('smsReminders.reminderTypes.test')}</MenuItem>
                  </TextField>
                </FormControl>
              </Box>

              {/* Step 3: Message Selection */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('smsReminders.steps.messageContent')}
                </Typography>
                <FormControl fullWidth size="small">
                  <TextField
                    select
                    value={config.messageType}
                    onChange={(e) => handleConfigChange({ messageType: e.target.value as any })}
                    size="small"
                  >
                    <MenuItem value="preset">{t('smsReminders.messageTypes.preset')}</MenuItem>
                    <MenuItem value="custom">{t('smsReminders.messageTypes.custom')}</MenuItem>
                  </TextField>
                </FormControl>

                {config.messageType === 'preset' && (
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <TextField
                      select
                      value={config.presetMessageId || 'monthly-service'}
                      onChange={(e) => handleConfigChange({ presetMessageId: e.target.value })}
                      size="small"
                    >
                      {PRESET_MESSAGES.map((message) => (
                        <MenuItem key={message.id} value={message.id}>
                          {message.title}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormControl>
                )}

                {config.messageType === 'custom' && (
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    placeholder={t('smsReminders.form.customMessagePlaceholder')}
                    value={config.customMessage || ''}
                    onChange={(e) => handleConfigChange({ customMessage: e.target.value })}
                    size="small"
                    sx={{ mt: 2 }}
                    helperText={t('smsReminders.form.characterCount', {
                      count: (config.customMessage || '').length,
                    })}
                    error={(config.customMessage || '').length > 140}
                  />
                )}
              </Box>

              {/* Preview */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('smsReminders.form.preview')}
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2">
                    {config.messageType === 'preset' && selectedPresetMessage
                      ? selectedPresetMessage.content
                          .replace('{{recipientName}}', selectedRecipient?.name || 'Client')
                          .replace('{{workOrderTitle}}', workOrderTitle || 'Service')
                          .replace(
                            '{{scheduledDate}}',
                            scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'Date'
                          )
                      : config.customMessage || 'Custom message will appear here'}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmation(false)}>
              {t('smsReminders.dialog.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmService}
              disabled={
                !selectedPhone ||
                (config.messageType === 'custom' &&
                  (!config.customMessage || config.customMessage.length > 140))
              }
            >
              {t('smsReminders.dialog.activateService')}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Card>
  );
}
