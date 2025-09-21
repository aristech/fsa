'use client';

import type { AISettings } from 'src/types/ai-settings';

import { useState, useEffect, useCallback } from 'react';

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

import { useTranslate } from 'src/locales/use-locales';
import { aiSettingsApi } from 'src/services/ai-settings';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { AISettingsForm } from './ai-settings-form';

// ----------------------------------------------------------------------

export function AISettingsView() {
  const { t } = useTranslate('dashboard');
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await aiSettingsApi.get();
      if (response.success) {
        setSettings(response.data || null);
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      toast.error(t('settings.ai.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
      'gpt-5': t('settings.ai.models.gpt5'),
      'gpt-4o': t('settings.ai.models.gpt4o'),
      'gpt-4o-mini': t('settings.ai.models.gpt4oMini'),
      'gpt-4-turbo': t('settings.ai.models.gpt4Turbo'),
      'gpt-4': t('settings.ai.models.gpt4'),
      'gpt-3.5-turbo': t('settings.ai.models.gpt35Turbo'),
    };
    return models[model || ''] || model || t('settings.ai.notSet');
  };

  const getLanguageLabel = (lang?: string) => {
    const languages: Record<string, string> = {
      en: t('settings.ai.languages.en'),
      el: t('settings.ai.languages.el'),
      es: t('settings.ai.languages.es'),
      fr: t('settings.ai.languages.fr'),
      de: t('settings.ai.languages.de'),
      it: t('settings.ai.languages.it'),
    };
    return languages[lang || ''] || lang || t('settings.ai.notSet');
  };

  const hasApiKey = settings?.openaiApiKey && settings.openaiApiKey.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>{t('settings.ai.loading')}</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title={t('settings.ai.title')}
          subheader={t('settings.ai.subtitle')}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:settings-bold" />}
              onClick={handleOpenForm}
            >
              {t('settings.ai.configure')}
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* API Key Status */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('settings.ai.openaiApiKey')}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={hasApiKey ? t('settings.ai.configured') : t('settings.ai.notConfigured')}
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
                  {t('settings.ai.preferredModel')}
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
                  {t('settings.ai.responseLanguage')}
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
                  {t('settings.ai.maxTokens')}
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
                  {t('settings.ai.temperature')}
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
                  {t('settings.ai.localNlpService')}
                </Typography>
                <Chip
                  label={
                    settings?.useLocalNLP ? t('settings.ai.enabled') : t('settings.ai.disabled')
                  }
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
                  {t('settings.ai.configureApiKeyMessage')}
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
            <Typography variant="h6">{t('settings.ai.title')}</Typography>
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
