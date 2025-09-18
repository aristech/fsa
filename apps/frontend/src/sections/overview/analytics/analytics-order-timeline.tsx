import type { CardProps } from '@mui/material/Card';
import type { TimelineItemProps } from '@mui/lab/TimelineItem';
import type { IDateValue } from 'src/types/common';

import Card from '@mui/material/Card';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  list: {
    id: string;
    type: string;
    title: string;
    time: IDateValue;
  }[];
  colorMap?: Map<string, string>; // Map work order ID to color
};

export function AnalyticsOrderTimeline({ title, subheader, list, colorMap, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Timeline
        sx={{
          m: 0,
          p: 3,
          [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 },
        }}
      >
        {list.map((item, index) => (
          <Item
            key={item.id}
            item={item}
            lastItem={index === list.length - 1}
            colorMap={colorMap}
          />
        ))}
      </Timeline>
    </Card>
  );
}

// ----------------------------------------------------------------------

type ItemProps = TimelineItemProps & {
  lastItem: boolean;
  item: Props['list'][number];
  colorMap?: Map<string, string>;
};

function Item({ item, lastItem, colorMap, ...other }: ItemProps) {
  // Get custom color from colorMap if available, otherwise use default colors
  const customColor = colorMap?.get(item.type);

  return (
    <TimelineItem {...other}>
      <TimelineSeparator>
        <TimelineDot
          color={
            customColor
              ? undefined
              : (item.type === 'order1' && 'primary') ||
                (item.type === 'order2' && 'success') ||
                (item.type === 'order3' && 'info') ||
                (item.type === 'order4' && 'warning') ||
                'error'
          }
          sx={
            customColor
              ? {
                  backgroundColor: customColor,
                  color: 'white',
                  border: `2px solid ${customColor}33`, // Add transparency for border
                }
              : undefined
          }
        />
        {lastItem ? null : <TimelineConnector />}
      </TimelineSeparator>

      <TimelineContent>
        <Typography variant="subtitle2">{item.title}</Typography>

        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {fDateTime(item.time)}
        </Typography>
      </TimelineContent>
    </TimelineItem>
  );
}
