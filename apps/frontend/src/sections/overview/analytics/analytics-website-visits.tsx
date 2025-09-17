import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { useTheme, alpha as hexAlpha } from '@mui/material/styles';

import { useTranslate } from 'src/locales/use-locales';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    categories?: string[];
    series: {
      name: string;
      data: number[];
    }[];
    options?: ChartOptions & { meta?: Record<string, any> };
  };
};

export function AnalyticsWebsiteVisits({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();
  const { t } = useTranslate('common');

  const chartColors = chart.colors ?? [
    hexAlpha(theme.palette.primary.dark, 0.8),
    hexAlpha(theme.palette.warning.main, 0.8),
  ];

  const meta = (chart.options as any)?.meta || {};

  const chartOptions = useChart({
    colors: chartColors,
    stroke: { width: 2, colors: ['transparent'] },
    xaxis: { categories: chart.categories },
    legend: { show: true },
    tooltip: {
      y: {
        formatter: (value: number, { seriesIndex, dataPointIndex }: any) => {
          // If meta task names provided, render list; else use unit label
          const unit = t('analytics.visits', { defaultValue: 'visits' });
          const names = seriesIndex === 0 ? meta.createdTaskNames?.[dataPointIndex] : meta.completedTaskNames?.[dataPointIndex];
          if (Array.isArray(names) && names.length > 0) {
            const list = `\n- ${names.slice(0, 5).join('\n- ')}${names.length > 5 ? '\n…' : ''}`;
            const label = seriesIndex === 0 ? t('analytics.created', { defaultValue: 'Created' }) : t('analytics.completed', { defaultValue: 'Completed' });
            return `${value} ${label}:${list}`;
          }
          return `${value} ${unit}`;
        },
      },
    },
    ...chart.options,
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Chart
        type="bar"
        series={chart.series}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 364,
        }}
      />
    </Card>
  );
}
