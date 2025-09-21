'use client';

import { useMemo, useState } from 'react';

import { alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Stack,
  Table,
  Button,
  Divider,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
  LinearProgress,
  TableContainer,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { Chart } from 'src/components/chart';
import { Iconify } from 'src/components/iconify';

import { MarkdownRenderer } from './markdown-renderer';

// ----------------------------------------------------------------------

interface EnhancedMessageRendererProps {
  content: string;
  isUser?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

interface ParsedData {
  type: 'text' | 'json' | 'mixed';
  text?: string;
  data?: any;
  suggestions?: string[];
}

// Helper to detect and parse JSON from text
const parseMessageContent = (content: string): ParsedData => {
  try {
    // Try to parse the entire content as JSON
    const parsed = JSON.parse(content);
    return { type: 'json', data: parsed };
  } catch {
    // Look for JSON blocks in text
    const jsonRegex = /```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|\{[\s\S]*?\}/g;
    const matches = content.match(jsonRegex);

    if (matches && matches.length > 0) {
      try {
        // Try to parse the first JSON block
        const jsonStr = matches[0]
          .replace(/```json\s*/, '')
          .replace(/```\s*/, '')
          .replace(/```/g, '');
        const parsed = JSON.parse(jsonStr);
        const text = content.replace(matches[0], '').trim();

        return {
          type: 'mixed',
          text: text || undefined,
          data: parsed,
        };
      } catch {
        return { type: 'text', text: content };
      }
    }

    return { type: 'text', text: content };
  }
};

// Smart suggestions based on data analysis
const generateSmartSuggestions = (data: any): string[] => {
  const suggestions: string[] = [];

  if (Array.isArray(data)) {
    suggestions.push(`Show me details about the first ${Math.min(3, data.length)} items`);
    if (data.length > 5) {
      suggestions.push(`Filter these results by priority`);
      suggestions.push(`Sort these by due date`);
    }
  } else if (typeof data === 'object' && data !== null) {
    // Check for missing fields
    if (!data.assignees || (Array.isArray(data.assignees) && data.assignees.length === 0)) {
      suggestions.push(`Assign this to @`);
    }
    if (!data.dueDate && !data.due_date) {
      suggestions.push(`Set due date for tomorrow`);
    }
    if (!data.priority || data.priority === 'medium') {
      suggestions.push(`Set priority to high`);
    }
    if (data.status === 'todo' || data.status === 'pending') {
      suggestions.push(`Mark this as in progress`);
    }
  }

  return suggestions;
};

// Data visualizer for arrays
const DataVisualizer = ({ data, title }: { data: any[]; title?: string }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'cards'>('cards');

  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;

    // Try to extract numeric data for charts
    const sample = data[0];
    const numericFields = Object.keys(sample).filter(
      (key) =>
        typeof sample[key] === 'number' ||
        (typeof sample[key] === 'string' && !isNaN(Number(sample[key])))
    );

    if (numericFields.length === 0) {
      // Count categorical data
      const statusField = Object.keys(sample).find(
        (key) =>
          key.toLowerCase().includes('status') ||
          key.toLowerCase().includes('priority') ||
          key.toLowerCase().includes('type')
      );

      if (statusField) {
        const counts = data.reduce((acc, item) => {
          const value = item[statusField] || 'Unknown';
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {});

        return {
          type: 'donut' as const,
          series: Object.values(counts) as number[],
          options: {
            labels: Object.keys(counts),
            chart: { type: 'donut' as const },
            colors: ['#00AB55', '#00B8D4', '#FFAB00', '#FF5630', '#7635DC'],
            legend: { position: 'bottom' as const },
          },
        };
      }
    }

    // Create bar chart for numeric data
    if (numericFields.length > 0) {
      const field = numericFields[0];
      const labelField =
        Object.keys(sample).find(
          (key) =>
            key.toLowerCase().includes('title') ||
            key.toLowerCase().includes('name') ||
            key.toLowerCase().includes('id')
        ) || Object.keys(sample)[0];

      return {
        type: 'bar' as const,
        series: [
          {
            name: field,
            data: data.slice(0, 10).map((item) => Number(item[field]) || 0),
          },
        ],
        options: {
          chart: { type: 'bar' as const },
          xaxis: {
            categories: data
              .slice(0, 10)
              .map(
                (item) =>
                  String(item[labelField]).slice(0, 20) +
                  (String(item[labelField]).length > 20 ? '...' : '')
              ),
          },
          colors: ['#00AB55'],
        },
      };
    }

    return null;
  }, [data]);

  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <Card sx={{ mt: 2 }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">{title || `Data Results (${data.length} items)`}</Typography>
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            onClick={() => setViewMode('cards')}
            color={viewMode === 'cards' ? 'primary' : 'default'}
          >
            <Iconify icon="solar:grid-bold" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setViewMode('table')}
            color={viewMode === 'table' ? 'primary' : 'default'}
          >
            <Iconify icon="solar:list-bold" />
          </IconButton>
          {chartData && (
            <IconButton
              size="small"
              onClick={() => setViewMode('chart')}
              color={viewMode === 'chart' ? 'primary' : 'default'}
            >
              <Iconify icon="solar:chart-2-bold" />
            </IconButton>
          )}
        </Stack>
      </Box>

      <Divider />

      {viewMode === 'cards' && (
        <Box sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {data.slice(0, 5).map((item, index) => (
              <DataCard key={index} data={item} />
            ))}
            {data.length > 5 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center', mt: 1 }}
              >
                ... and {data.length - 5} more items
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {viewMode === 'table' && (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {Object.keys(data[0] || {})
                  .slice(0, 4)
                  .map((key) => (
                    <TableCell key={key} sx={{ fontWeight: 600 }}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(0, 10).map((item, index) => (
                <TableRow key={index}>
                  {Object.keys(data[0] || {})
                    .slice(0, 4)
                    .map((key) => (
                      <TableCell key={key}>
                        {String(item[key]).slice(0, 50)}
                        {String(item[key]).length > 50 ? '...' : ''}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {viewMode === 'chart' && chartData && (
        <Box sx={{ p: 2, height: 300 }}>
          <Chart
            type={chartData.type as any}
            series={chartData.series}
            options={chartData.options}
          />
        </Box>
      )}
    </Card>
  );
};

// Individual data card component
const DataCard = ({ data }: { data: any }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'finished':
        return 'success';
      case 'in_progress':
      case 'inprogress':
      case 'active':
        return 'info';
      case 'pending':
      case 'waiting':
      case 'todo':
        return 'warning';
      case 'cancelled':
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const renderValue = (key: string, value: any) => {
    if (value === null || value === undefined) return null;

    // Date fields
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        return (
          <Chip
            label={fDateTime(value)}
            size="small"
            variant="outlined"
            icon={<Iconify icon="solar:calendar-bold" width={14} />}
          />
        );
      }
    }

    // Status fields
    if (key.toLowerCase().includes('status')) {
      return <Chip label={value} size="small" color={getStatusColor(value)} variant="outlined" />;
    }

    // Priority fields
    if (key.toLowerCase().includes('priority')) {
      return <Chip label={value} size="small" color={getPriorityColor(value)} variant="filled" />;
    }

    // Progress fields
    if (key.toLowerCase().includes('progress') && typeof value === 'number') {
      return (
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 1 }} />
          <Typography variant="caption" sx={{ mt: 0.5 }}>
            {value}%
          </Typography>
        </Box>
      );
    }

    // Arrays
    if (Array.isArray(value)) {
      return (
        <Stack spacing={1}>
          {value.slice(0, 3).map((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              // For objects in arrays, show a summary
              const title = item.title || item.name || item.id || `Item ${idx + 1}`;
              const subtitle = item.description || item.status || item.type || '';
              return (
                <Box
                  key={idx}
                  sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {String(title)}
                  </Typography>
                  {subtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {String(subtitle)}
                    </Typography>
                  )}
                </Box>
              );
            }
            // For primitive values
            return <Chip key={idx} label={String(item)} size="small" variant="outlined" />;
          })}
          {value.length > 3 && (
            <Typography variant="caption" color="text.secondary">
              ... +{value.length - 3} more items
            </Typography>
          )}
        </Stack>
      );
    }

    // Objects (nested data)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <Box sx={{ ml: 1 }}>
          {Object.entries(value)
            .slice(0, 3)
            .map(([nestedKey, nestedValue]) => (
              <Typography key={nestedKey} variant="caption" sx={{ display: 'block' }}>
                <strong>{nestedKey}:</strong> {String(nestedValue)}
              </Typography>
            ))}
          {Object.keys(value).length > 3 && (
            <Typography variant="caption" color="text.secondary">
              ... +{Object.keys(value).length - 3} more
            </Typography>
          )}
        </Box>
      );
    }

    // Regular text
    return (
      <Typography variant="body2" color="text.secondary">
        {String(value)}
      </Typography>
    );
  };

  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        {Object.entries(data)
          .slice(0, 6)
          .map(([key, value]) => (
            <Box key={key}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </Typography>
              <Box sx={{ mt: 0.5 }}>{renderValue(key, value)}</Box>
            </Box>
          ))}
      </Stack>
    </Card>
  );
};

// Main component
export function EnhancedMessageRenderer({
  content,
  isUser = false,
  onSuggestionClick,
}: EnhancedMessageRendererProps) {
  const parsed = useMemo(() => parseMessageContent(content), [content]);
  const suggestions = useMemo(
    () => (parsed.data ? generateSmartSuggestions(parsed.data) : []),
    [parsed.data]
  );

  // Handle empty content (e.g., when AI makes tool calls with no text)
  const hasContent = parsed.text || parsed.data;

  if (isUser) {
    return (
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </Typography>
    );
  }

  return (
    <Box>
      {/* Regular text content - render with Markdown */}
      {parsed.text && (
        <MarkdownRenderer
          content={parsed.text}
          sx={{ mb: parsed.data ? 1 : 0 }}
          onSuggestionClick={onSuggestionClick}
        />
      )}

      {/* JSON data visualization */}
      {parsed.data && (
        <>
          {Array.isArray(parsed.data) ? (
            <DataVisualizer data={parsed.data} />
          ) : (
            <Card sx={{ mt: 1, bgcolor: alpha('#00AB55', 0.08) }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>
                  ✅ Action Completed
                </Typography>
                <DataCard data={parsed.data} />
              </Box>
            </Card>
          )}

          {/* Smart suggestions */}
          {suggestions.length > 0 && onSuggestionClick && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                💡 Suggestions:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="small"
                    variant="outlined"
                    onClick={() => onSuggestionClick(suggestion)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      minWidth: 'auto',
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}

      {/* Fallback for empty content (tool calls only) */}
      {!hasContent && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            🔧 Processing your request...
          </Typography>
        </Box>
      )}
    </Box>
  );
}
