'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';

export function DocsView() {
  const { t } = useTranslate('docs');

  const quickLinks = useMemo(
    () => [
      { label: t('quickLinks.gettingStarted'), href: '/docs#getting-started' },
      { label: t('quickLinks.tasks'), href: '/docs#tasks' },
      { label: t('quickLinks.workOrders'), href: '/docs#work-orders' },
      { label: t('quickLinks.reports'), href: '/docs#reports' },
      { label: t('quickLinks.personnel'), href: '/docs#personnel' },
      { label: t('quickLinks.aiAssistant'), href: '/docs#ai-assistant' },
      { label: t('quickLinks.fieldApp'), href: '/docs#field-app' },
      { label: t('quickLinks.adminSetup'), href: '/docs#admin-setup' },
    ],
    [t]
  );

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box>
        <Typography variant="h3" gutterBottom>
          {t('title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            <Card>
              <CardHeader title={t('quickNavigation')} />
              <CardContent>
                <List dense>
                  {quickLinks.map((l) => (
                    <ListItem key={l.href} component={Link} href={l.href} sx={{ px: 0 }}>
                      <ListItemText primary={l.label} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {/* Getting Started Guide */}
          <Card id="getting-started">
            <CardHeader
              title={t('gettingStarted.title')}
              subheader={t('gettingStarted.subtitle')}
            />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('gettingStarted.step1.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('gettingStarted.step1.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('gettingStarted.step1.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('gettingStarted.step2.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('gettingStarted.step2.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('gettingStarted.step2.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('gettingStarted.step3.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('gettingStarted.step3.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('gettingStarted.step3.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>
            </CardContent>
          </Card>

          {/* Tasks Management */}
          <Card id="tasks" sx={{ mt: 3 }}>
            <CardHeader title={t('tasks.title')} subheader={t('tasks.subtitle')} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('tasks.finding.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('tasks.finding.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('tasks.finding.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('tasks.working.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('tasks.working.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('tasks.working.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('tasks.notes.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('tasks.notes.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('tasks.notes.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('tasks.creating.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('tasks.creating.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('tasks.creating.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>
            </CardContent>
          </Card>

          {/* Work Orders */}
          <Card id="work-orders" sx={{ mt: 3 }}>
            <CardHeader title={t('workOrders.title')} subheader={t('workOrders.subtitle')} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('workOrders.what.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('workOrders.what.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('workOrders.what.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('workOrders.creating.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('workOrders.creating.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('workOrders.creating.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('workOrders.working.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('workOrders.working.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('workOrders.working.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>
            </CardContent>
          </Card>

          {/* AI Assistant */}
          <Card id="ai-assistant" sx={{ mt: 3 }}>
            <CardHeader title={t('aiAssistant.title')} subheader={t('aiAssistant.subtitle')} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('aiAssistant.what.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('aiAssistant.what.content')}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('aiAssistant.howTo.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('aiAssistant.howTo.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('aiAssistant.howTo.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('aiAssistant.examples.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('aiAssistant.examples.creating')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('aiAssistant.examples.creating').split('\n').length - 1 && <br />}
                    </span>
                  ))}
                <br />
                <br />
                {t('aiAssistant.examples.getting')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('aiAssistant.examples.getting').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('aiAssistant.tips.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('aiAssistant.tips.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('aiAssistant.tips.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>
            </CardContent>
          </Card>

          {/* Mobile App */}
          <Card id="field-app" sx={{ mt: 3 }}>
            <CardHeader title={t('fieldApp.title')} subheader={t('fieldApp.subtitle')} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('fieldApp.accessing.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('fieldApp.accessing.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('fieldApp.accessing.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('fieldApp.features.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('fieldApp.features.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('fieldApp.features.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('fieldApp.photos.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('fieldApp.photos.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('fieldApp.photos.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card id="reports" sx={{ mt: 3 }}>
            <CardHeader title={t('reports.title')} subheader={t('reports.subtitle')} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('reports.daily.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('reports.daily.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('reports.daily.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('reports.bestPractices.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('reports.bestPractices.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('reports.bestPractices.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>
            </CardContent>
          </Card>

          {/* Personnel */}
          <Card id="personnel" sx={{ mt: 3 }}>
            <CardHeader title={t('personnel.title')} subheader={t('personnel.subtitle')} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('personnel.viewing.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('personnel.viewing.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('personnel.viewing.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('personnel.assigning.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('personnel.assigning.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('personnel.assigning.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>
            </CardContent>
          </Card>

          {/* Admin Setup */}
          <Card id="admin-setup" sx={{ mt: 3 }}>
            <CardHeader title={t('adminSetup.title')} subheader={t('adminSetup.subtitle')} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('adminSetup.system.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('adminSetup.system.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('adminSetup.system.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('adminSetup.ai.title')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('adminSetup.ai.content')
                  .split('\n')
                  .map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < t('adminSetup.ai.content').split('\n').length - 1 && <br />}
                    </span>
                  ))}
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  href={paths.dashboard.settings.ai}
                  variant="contained"
                  size="small"
                >
                  {t('adminSetup.buttons.aiSettings')}
                </Button>
                <Button
                  component={Link}
                  href={paths.dashboard.settings.apiKeys}
                  variant="outlined"
                  size="small"
                >
                  {t('adminSetup.buttons.apiKeys')}
                </Button>
                <Button
                  component={Link}
                  href={paths.dashboard.settings.webhooks}
                  variant="outlined"
                  size="small"
                >
                  {t('adminSetup.buttons.webhooks')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
