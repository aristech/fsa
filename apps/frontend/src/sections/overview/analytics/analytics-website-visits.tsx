import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { useTheme, alpha as hexAlpha } from '@mui/material/styles';

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
    options?: ChartOptions & {
      meta?: {
        createdTaskNames?: string[][]; // parallel to categories, per index an array of task names
        completedTaskNames?: string[][];
      };
    };
  };
};

export function AnalyticsWebsiteVisits({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();

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
          const names = seriesIndex === 0 ? meta.createdTaskNames?.[dataPointIndex] : meta.completedTaskNames?.[dataPointIndex];
          const list = Array.isArray(names) && names.length > 0 ? `\n- ${names.slice(0, 5).join('\n- ')}${names.length > 5 ? '\n…' : ''}` : '';
          const label = seriesIndex === 0 ? 'created' : 'completed';
          return `${value} ${label}${list ? `:${list}` : ''}`;
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
