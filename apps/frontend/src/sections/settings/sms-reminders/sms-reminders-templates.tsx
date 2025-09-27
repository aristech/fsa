'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface MessageTemplate {
  type: string;
  content: string;
  variables: string[];
  validation: {
    valid: boolean;
    errors: string[];
  };
}

interface TemplatesResponse {
  success: boolean;
  templates: MessageTemplate[];
  defaultTemplates?: MessageTemplate[];
}

export function SmsRemindersTemplates() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/sms-reminders/templates');
      const result: TemplatesResponse = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      setTemplates(result.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleToggleExpand = (templateType: string) => {
    setExpandedTemplate(expandedTemplate === templateType ? null : templateType);
  };

  const getTemplateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      monthly: 'Monthly Service',
      yearly: 'Yearly Service',
      custom: 'Custom Service',
      urgent: 'Urgent Reminder',
    };
    return labels[type] || type;
  };

  const getTemplateTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'warning' | 'error'> = {
      monthly: 'primary',
      yearly: 'secondary',
      custom: 'warning',
      urgent: 'error',
    };
    return colors[type] || 'primary';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Message Templates" />
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Message Templates" />
        <CardContent>
          <Alert severity="error">{error}</Alert>
          <Button
            onClick={fetchTemplates}
            startIcon={<Iconify icon="solar:refresh-bold" />}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Message Templates"
        subheader="Customize SMS/Viber message templates for different reminder types"
        action={
          <Button
            onClick={fetchTemplates}
            startIcon={<Iconify icon="solar:refresh-bold" />}
            size="small"
          >
            Refresh
          </Button>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          {templates.map((template) => (
            <Card key={template.type} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {/* Template Header */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Chip
                        label={getTemplateTypeLabel(template.type)}
                        color={getTemplateTypeColor(template.type)}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {template.variables.length} variables
                      </Typography>
                      {!template.validation.valid && (
                        <Chip
                          label="Invalid"
                          color="error"
                          size="small"
                          icon={<Iconify icon="solar:danger-bold" />}
                        />
                      )}
                    </Stack>

                    <Button
                      onClick={() => handleToggleExpand(template.type)}
                      endIcon={
                        <Iconify
                          icon={
                            expandedTemplate === template.type
                              ? 'solar:alt-arrow-up-bold'
                              : 'solar:alt-arrow-down-bold'
                          }
                        />
                      }
                      size="small"
                    >
                      {expandedTemplate === template.type ? 'Hide' : 'View'}
                    </Button>
                  </Stack>

                  {/* Template Preview */}
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Template Preview:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        p: 2,
                        bgcolor: 'background.neutral',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        maxHeight: expandedTemplate === template.type ? 'none' : 60,
                        overflow: 'hidden',
                        position: 'relative',
                        '&::after':
                          expandedTemplate !== template.type
                            ? {
                                content: '""',
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 20,
                                background: 'linear-gradient(transparent, #f5f5f5)',
                              }
                            : {},
                      }}
                    >
                      {template.content}
                    </Typography>
                  </Box>

                  {/* Expanded Details */}
                  <Collapse in={expandedTemplate === template.type}>
                    <Stack spacing={2}>
                      {/* Available Variables */}
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Available Variables:
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {template.variables.map((variable) => (
                            <Chip
                              key={variable}
                              label={`{{${variable}}}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            />
                          ))}
                        </Box>
                      </Box>

                      {/* Validation Errors */}
                      {!template.validation.valid && (
                        <Alert severity="error">
                          <Typography variant="body2" gutterBottom>
                            <strong>Template Validation Errors:</strong>
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {template.validation.errors.map((validationError, index) => (
                              <li key={index}>
                                <Typography variant="body2">{validationError}</Typography>
                              </li>
                            ))}
                          </ul>
                        </Alert>
                      )}

                      {/* Edit Template */}
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Edit Template:
                        </Typography>
                        <TextField
                          multiline
                          rows={4}
                          fullWidth
                          value={template.content}
                          disabled
                          helperText="Template editing is currently view-only. Customize templates via environment variables."
                          sx={{
                            '& .MuiInputBase-input': {
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Collapse>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {templates.length === 0 && (
            <Alert severity="info">No message templates found. Check your configuration.</Alert>
          )}

          {/* Template Variables Help */}
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              <strong>Available Template Variables:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Client:</strong> {`{client.name}`}, {`{client.company}`}, {`{client.phone}`}
              <br />
              <strong>Contact:</strong> {`{contactPerson.name}`}, {`{contactPerson.phone}`}
              <br />
              <strong>Service:</strong> {`{service.type}`}, {`{service.description}`},{' '}
              {`{service.nextDue}`}
              <br />
              <strong>Company:</strong> {`{company.name}`}, {`{company.phone}`}
              <br />
              <strong>Task:</strong> {`{task.title}`}, {`{task.description}`}, {`{task.dueDate}`}
            </Typography>
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}
