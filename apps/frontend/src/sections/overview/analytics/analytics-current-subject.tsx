import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    categories: string[];
    series: {
      name: string;
      data: number[];
    }[];
    options?: ChartOptions;
  };
};

function getInitials(name?: string) {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AnalyticsCurrentSubject({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
  ];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const displayedSeries = useMemo(() => {
    if (selectedIndex == null) return chart.series;
    if (selectedIndex < 0 || selectedIndex >= chart.series.length) return chart.series;
    return [chart.series[selectedIndex]];
  }, [chart.series, selectedIndex]);

  const displayedColors = useMemo(() => {
    if (selectedIndex == null) return chartColors.slice(0, chart.series.length);
    const c = chartColors[selectedIndex] || chartColors[0];
    return [c];
  }, [chart.series.length, chartColors, selectedIndex]);

  const labelHelpMap: Record<string, string> = useMemo(() => ({
      'Tasks': 'Completed tasks (higher is better).',
      'Avg days (inv)': 'Average completion days (inverted; lower days => higher score).',
      'Hours': 'Total logged hours.',
      'Late % (inv)': 'Late completion ratio (inverted; fewer late tasks => higher score).',
      'WO involved': 'Number of work orders participated in.',
    }), []);

  const chartOptions = useChart({
    colors: displayedColors,
    stroke: { width: 2 },
    fill: { opacity: 0.48 },
    xaxis: {
      categories: chart.categories,
      labels: {
        style: {
          colors: Array.from({ length: chart.categories.length }, () => theme.palette.text.secondary),
        },
      },
    },
    tooltip: {
      x: {
        formatter: (_val: number, opts?: any) => {
          const idx = opts?.dataPointIndex as number;
          const label = chart.categories[idx] || '';
          const help = labelHelpMap[label] || '';
          return help ? `${label} — ${help}` : label;
        },
      },
    },
    ...chart.options,
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Chart
        type="radar"
        series={displayedSeries}
        options={chartOptions}
        slotProps={{ loading: { py: 2.5 } }}
        sx={{
          my: 1,
          mx: 'auto',
          width: 300,
          height: 300,
        }}
      />

      <Divider sx={{ borderStyle: 'dashed' }} />

      {/* Avatar legend */}
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ p: 2, flexWrap: 'wrap' }}>
        {chart.series.map((s, idx) => {
          const color = chartColors[idx % chartColors.length];
          const initials = getInitials(s.name);
          const active = selectedIndex == null || selectedIndex === idx;
          return (
            <Tooltip key={`${s.name}-${idx}`} title={s.name} arrow>
              <Box
                onClick={() => setSelectedIndex(selectedIndex === idx ? null : idx)}
                sx={{
                  cursor: 'pointer',
                  opacity: active ? 1 : 0.4,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: color,
                    width: 28,
                    height: 28,
                    fontSize: 12,
                    color: theme.palette.getContrastText(color),
                    boxShadow: active ? 2 : 0,
                  }}
                >
                  {initials}
                </Avatar>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Card>
  );
}
