'use client';

import type { AISettings } from 'src/types/ai-settings';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';

import { aiSettingsApi } from 'src/services/ai-settings';

import { Iconify } from 'src/components/iconify';

import { AISettingsForm } from './ai-settings-form';

// ----------------------------------------------------------------------

export function AISettingsView() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await aiSettingsApi.get();
      if (response.success) {
        setSettings(response.data || null);
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleOpenForm = () => {
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
  };

  const handleSuccess = () => {
    loadSettings();
  };

  const getModelLabel = (model?: string) => {
    const models: Record<string, string> = {
      'gpt-4o': 'GPT-4o (Latest)',
      'gpt-4o-mini': 'GPT-4o Mini (Fast & Cost-effective)',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    };
    return models[model || ''] || model || 'Not set';
  };

  const getLanguageLabel = (lang?: string) => {
    const languages: Record<string, string> = {
      en: 'English',
      el: 'Greek (Ελληνικά)',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
    };
    return languages[lang || ''] || lang || 'Not set';
  };

  const hasApiKey = settings?.openaiApiKey && settings.openaiApiKey.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>Loading AI settings...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title="AI Assistant Settings"
          subheader="Configure your AI assistant preferences and OpenAI API key"
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:settings-bold" />}
              onClick={handleOpenForm}
            >
              Configure
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* API Key Status */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  OpenAI API Key
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={hasApiKey ? 'Configured' : 'Not configured'}
                    color={hasApiKey ? 'success' : 'warning'}
                    size="small"
                  />
                  {hasApiKey && (
                    <Typography variant="caption" color="text.secondary">
                      {settings?.openaiApiKey?.substring(0, 8)}...
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Grid>

            {/* Preferred Model */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Preferred Model
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getModelLabel(settings?.preferredModel)}
                </Typography>
              </Box>
            </Grid>

            {/* Language */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Response Language
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getLanguageLabel(settings?.language)}
                </Typography>
              </Box>
            </Grid>

            {/* Max Tokens */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Max Tokens
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {settings?.maxTokens || 1000}
                </Typography>
              </Box>
            </Grid>

            {/* Temperature */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Temperature
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {settings?.temperature || 0.7}
                </Typography>
              </Box>
            </Grid>

            {/* Local NLP */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Local NLP Service
                </Typography>
                <Chip
                  label={settings?.useLocalNLP ? 'Enabled' : 'Disabled'}
                  color={settings?.useLocalNLP ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>

          {!hasApiKey && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:info-circle-bold" color="warning.main" />
                <Typography variant="body2" color="warning.darker">
                  Configure your OpenAI API key to use the AI assistant features.
                </Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Settings Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">AI Assistant Settings</Typography>
            <IconButton onClick={handleCloseForm}>
              <Iconify icon="solar:close-circle-bold" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Box sx={{ p: 3, overflow: 'auto' }}>
          <AISettingsForm onClose={handleCloseForm} onSuccess={handleSuccess} />
        </Box>
      </Dialog>
    </>
  );
}
