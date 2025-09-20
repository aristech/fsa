'use client';

import type { AISettingsFormData } from 'src/types/ai-settings';

import { z as zod } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import CardHeader from '@mui/material/CardHeader';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';

import { aiSettingsApi } from 'src/services/ai-settings';

import { Iconify } from 'src/components/iconify';
import { Form, RHFSelect, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const schema = zod.object({
  openaiApiKey: zod.string().min(1, 'OpenAI API Key is required'),
  preferredModel: zod.string().min(1, 'Preferred model is required'),
  maxTokens: zod.number().min(1).max(4000),
  temperature: zod.number().min(0).max(2),
  useLocalNLP: zod.boolean(),
  language: zod.string().min(1, 'Language is required'),
});

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-effective)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'el', label: 'Greek (Ελληνικά)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
];

export function AISettingsForm({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const methods = useForm<AISettingsFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      openaiApiKey: '',
      preferredModel: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.7,
      useLocalNLP: true,
      language: 'en',
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = methods;

  const openaiApiKey = watch('openaiApiKey');
  const preferredModel = watch('preferredModel');

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await aiSettingsApi.get();
        if (response.success && response.data) {
          const settings = response.data;
          setValue('openaiApiKey', settings.openaiApiKey || '');
          setValue('preferredModel', settings.preferredModel || 'gpt-4o-mini');
          setValue('maxTokens', settings.maxTokens || 1000);
          setValue('temperature', settings.temperature || 0.7);
          setValue('useLocalNLP', settings.useLocalNLP ?? true);
          setValue('language', settings.language || 'en');
        }
      } catch (error) {
        console.error('Failed to load AI settings:', error);
        // Don't show error toast for initial load
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [setValue]);

  const handleTestApiKey = async () => {
    if (!openaiApiKey || !preferredModel) {
      toast.error('Please enter an API key and select a model first');
      return;
    }

    try {
      setTesting(true);
      const response = await aiSettingsApi.test({
        openaiApiKey,
        preferredModel,
      });

      if (response.success) {
        toast.success('API key is valid and working!');
      } else {
        toast.error(response.message || 'API key test failed');
      }
    } catch (error: any) {
      console.error('API key test failed:', error);
      toast.error(error.response?.data?.message || 'API key test failed');
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = async (data: AISettingsFormData) => {
    try {
      setLoading(true);
      const response = await aiSettingsApi.update(data);

      if (response.success) {
        toast.success('AI settings saved successfully!');
        onSuccess();
        onClose();
      } else {
        toast.error(response.message || 'Failed to save AI settings');
      }
    } catch (error: any) {
      console.error('Failed to save AI settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save AI settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading AI settings...</Typography>
      </Box>
    );
  }

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader
          title="AI Assistant Settings"
          subheader="Configure your AI assistant preferences and OpenAI API key"
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* OpenAI API Key */}
            <Grid size={{ xs: 12 }}>
              <RHFTextField
                name="openaiApiKey"
                label="OpenAI API Key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-..."
                slotProps={{
                  input: {
                    endAdornment: (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => setShowApiKey(!showApiKey)}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          <Iconify icon={showApiKey ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleTestApiKey}
                          disabled={testing || !openaiApiKey || !preferredModel}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          {testing ? (
                            <Iconify icon="svg-spinners:ring-resize" />
                          ) : (
                            <Iconify icon="solar:check-circle-bold" />
                          )}
                        </Button>
                      </Box>
                    ),
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Get your API key from{' '}
                <Button
                  component="a"
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ p: 0, minWidth: 'auto', textDecoration: 'underline' }}
                >
                  OpenAI Platform
                </Button>
              </Typography>
            </Grid>

            {/* Preferred Model */}
            <Grid size={{ xs: 12, md: 6 }}>
              <RHFSelect name="preferredModel" label="Preferred Model">
                {MODELS.map((model) => (
                  <MenuItem key={model.value} value={model.value}>
                    {model.label}
                  </MenuItem>
                ))}
              </RHFSelect>
            </Grid>

            {/* Language */}
            <Grid size={{ xs: 12, md: 6 }}>
              <RHFSelect name="language" label="Response Language">
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </MenuItem>
                ))}
              </RHFSelect>
            </Grid>

            {/* Max Tokens */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth error={!!errors.maxTokens}>
                <InputLabel>Max Tokens</InputLabel>
                <Select
                  value={watch('maxTokens')}
                  onChange={(e) => setValue('maxTokens', Number(e.target.value))}
                  label="Max Tokens"
                >
                  <MenuItem value={500}>500</MenuItem>
                  <MenuItem value={1000}>1000</MenuItem>
                  <MenuItem value={2000}>2000</MenuItem>
                  <MenuItem value={4000}>4000</MenuItem>
                </Select>
                {errors.maxTokens && <FormHelperText>{errors.maxTokens.message}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Temperature */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Temperature: {watch('temperature')}
                </Typography>
                <Slider
                  value={watch('temperature')}
                  onChange={(_, value) => setValue('temperature', value as number)}
                  min={0}
                  max={2}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0 (Precise)' },
                    { value: 1, label: '1 (Balanced)' },
                    { value: 2, label: '2 (Creative)' },
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Lower values make responses more focused and deterministic
                </Typography>
              </Box>
            </Grid>

            {/* Use Local NLP */}
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={watch('useLocalNLP')}
                    onChange={(e) => setValue('useLocalNLP', e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2">Use Local NLP Service</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Enable local processing for simple tasks to reduce API costs and improve speed
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting || loading}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Form>
  );
}
