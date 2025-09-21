'use client';

import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

import { alpha, styled } from '@mui/material/styles';
import { Box, Chip, Paper, Stack, Divider, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// Custom styled components for beautiful markdown rendering
const StyledMarkdownContainer = styled(Box)(({ theme }) => ({
  '& .markdown-content': {
    fontFamily: theme.typography.body1.fontFamily,
    lineHeight: 1.6,
    color: theme.palette.text.primary,

    // Headers
    '& h1': {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginBottom: theme.spacing(2),
      marginTop: theme.spacing(3),
      color: theme.palette.primary.main,
      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      paddingBottom: theme.spacing(1),
      '&:first-of-type': {
        marginTop: 0,
      },
    },

    '& h2': {
      fontSize: '1.3rem',
      fontWeight: 600,
      marginBottom: theme.spacing(1.5),
      marginTop: theme.spacing(2.5),
      color: theme.palette.text.primary,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      '&:first-of-type': {
        marginTop: 0,
      },
    },

    '& h3': {
      fontSize: '1.1rem',
      fontWeight: 600,
      marginBottom: theme.spacing(1),
      marginTop: theme.spacing(2),
      color: theme.palette.primary.dark,
      '&:first-of-type': {
        marginTop: 0,
      },
    },

    // Paragraphs
    '& p': {
      marginBottom: theme.spacing(1.5),
      '&:last-child': {
        marginBottom: 0,
      },
    },

    // Lists
    '& ul, & ol': {
      paddingLeft: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },

    '& li': {
      marginBottom: theme.spacing(0.5),

      '& strong:first-child': {
        color: theme.palette.primary.main,
        fontWeight: 600,
      },
    },

    // Horizontal rules
    '& hr': {
      border: 'none',
      height: '1px',
      backgroundColor: alpha(theme.palette.divider, 0.5),
      margin: theme.spacing(3, 0),
    },

    // Emphasis
    '& strong': {
      fontWeight: 600,
      color: theme.palette.text.primary,
    },

    '& em': {
      fontStyle: 'italic',
      color: theme.palette.text.secondary,
    },

    // Code
    '& code': {
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
      color: theme.palette.primary.dark,
      padding: theme.spacing(0.25, 0.5),
      borderRadius: theme.shape.borderRadius,
      fontSize: '0.85em',
      fontFamily: 'Monaco, Consolas, monospace',
    },

    '& pre': {
      backgroundColor: alpha(theme.palette.grey[500], 0.08),
      padding: theme.spacing(2),
      borderRadius: theme.shape.borderRadius,
      overflow: 'auto',
      marginBottom: theme.spacing(2),

      '& code': {
        backgroundColor: 'transparent',
        padding: 0,
      },
    },

    // Blockquotes
    '& blockquote': {
      borderLeft: `4px solid ${theme.palette.primary.main}`,
      paddingLeft: theme.spacing(2),
      marginLeft: 0,
      marginBottom: theme.spacing(2),
      fontStyle: 'italic',
      color: theme.palette.text.secondary,
    },

    // Tables
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: theme.spacing(2),
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      overflow: 'hidden',
    },

    '& th, & td': {
      padding: theme.spacing(1, 1.5),
      textAlign: 'left',
      borderBottom: `1px solid ${theme.palette.divider}`,
    },

    '& th': {
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
      fontWeight: 600,
      color: theme.palette.primary.main,
    },

    '& tr:nth-of-type(even)': {
      backgroundColor: alpha(theme.palette.grey[500], 0.04),
    },
  },
}));

// Custom components for specific markdown elements
const WorkOrderCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  borderRadius: Number(theme.shape.borderRadius) * 2,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600,
  '&.status-assigned': {
    backgroundColor: alpha(theme.palette.info.main, 0.1),
    color: theme.palette.info.main,
  },
  '&.status-in-progress': {
    backgroundColor: alpha(theme.palette.warning.main, 0.1),
    color: theme.palette.warning.main,
  },
  '&.status-completed': {
    backgroundColor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
  },
  '&.priority-high': {
    backgroundColor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.main,
  },
  '&.priority-medium': {
    backgroundColor: alpha(theme.palette.warning.main, 0.1),
    color: theme.palette.warning.main,
  },
  '&.priority-low': {
    backgroundColor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
  },
}));

interface MarkdownRendererProps {
  content: string;
  sx?: any;
  onSuggestionClick?: (suggestion: string) => void;
}

export function MarkdownRenderer({ content, sx, onSuggestionClick }: MarkdownRendererProps) {
  // Extract suggestions from content for special rendering
  const extractSuggestions = (text: string) => {
    const suggestionsMatch = text.match(/\*\*Suggestions:\*\*([\s\S]*?)(?=\n\n|$)/i);
    if (!suggestionsMatch) return { cleanContent: text, suggestions: [] };

    const suggestionsText = suggestionsMatch[1];
    const suggestions = suggestionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-'))
      .map((line) => line.substring(1).trim())
      .filter(Boolean);

    const cleanContent = text.replace(suggestionsMatch[0], '').trim();
    return { cleanContent, suggestions };
  };

  const { cleanContent, suggestions } = extractSuggestions(content);
  // Custom renderer components
  const components = {
    // Enhanced headers with icons
    h1: ({ children, ...props }: any) => (
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontSize: '1.5rem',
          fontWeight: 600,
          mb: 2,
          mt: 3,
          color: 'primary.main',
          borderBottom: (theme) => `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          pb: 1,
          '&:first-of-type': { mt: 0 },
        }}
        {...props}
      >
        <Iconify icon="solar:document-bold" sx={{ mr: 1, fontSize: '1.2em' }} />
        {children}
      </Typography>
    ),

    h2: ({ children, ...props }: any) => (
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontSize: '1.3rem',
          fontWeight: 600,
          mb: 1.5,
          mt: 2.5,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          '&:first-of-type': { mt: 0 },
        }}
        {...props}
      >
        <Iconify icon="solar:folder-bold" sx={{ fontSize: '1em', color: 'primary.main' }} />
        {children}
      </Typography>
    ),

    h3: ({ children, ...props }: any) => {
      const text = children?.toString() || '';

      // Detect work order titles
      if (text.includes('Work Order WO-')) {
        return (
          <WorkOrderCard elevation={1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Iconify icon="solar:clipboard-list-bold" sx={{ color: 'primary.main' }} />
              <Typography
                variant="h6"
                component="h3"
                sx={{ fontWeight: 600, color: 'primary.main' }}
              >
                {children}
              </Typography>
            </Stack>
          </WorkOrderCard>
        );
      }

      return (
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontSize: '1.1rem',
            fontWeight: 600,
            mb: 1,
            mt: 2,
            color: 'primary.dark',
            '&:first-of-type': { mt: 0 },
          }}
          {...props}
        >
          {children}
        </Typography>
      );
    },

    // Enhanced list items with better formatting
    li: ({ children, ...props }: any) => {
      const text = children?.toString() || '';

      // Detect status and priority items
      if (text.includes('Status:') || text.includes('Priority:')) {
        const [label, value] = text.split(':');
        const statusClass = value?.toLowerCase().replace(/\s+/g, '-');

        return (
          <Box
            component="li"
            sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}
            {...props}
          >
            <Typography component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {label}:
            </Typography>
            <StatusChip
              label={value?.trim()}
              size="small"
              className={`status-${statusClass} priority-${statusClass}`}
            />
          </Box>
        );
      }

      // Detect progress items
      if (text.includes('Progress:') && text.includes('%')) {
        return (
          <Box
            component="li"
            sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}
            {...props}
          >
            <Iconify icon="solar:chart-2-bold" sx={{ color: 'success.main', fontSize: '1.1em' }} />
            {children}
          </Box>
        );
      }

      // Detect cost/duration items
      if (text.includes('Cost:') || text.includes('Duration:')) {
        return (
          <Box
            component="li"
            sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}
            {...props}
          >
            <Iconify
              icon="solar:dollar-minimalistic-bold"
              sx={{ color: 'warning.main', fontSize: '1.1em' }}
            />
            {children}
          </Box>
        );
      }

      // Detect assigned personnel
      if (text.includes('Assigned Personnel:')) {
        return (
          <Box
            component="li"
            sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}
            {...props}
          >
            <Iconify
              icon="solar:users-group-rounded-bold"
              sx={{ color: 'info.main', fontSize: '1.1em' }}
            />
            {children}
          </Box>
        );
      }

      // Default list item with enhanced styling
      return (
        <Box component="li" sx={{ mb: 0.5 }} {...props}>
          {children}
        </Box>
      );
    },

    // Enhanced horizontal rules
    hr: ({ ...props }: any) => (
      <Divider
        sx={{
          my: 3,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
          '&::before, &::after': {
            borderTop: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          },
        }}
        {...props}
      />
    ),

    // Enhanced paragraphs
    p: ({ children, ...props }: any) => (
      <Typography
        variant="body2"
        sx={{
          mb: 1.5,
          lineHeight: 1.6,
          '&:last-child': { mb: 0 },
        }}
        {...props}
      >
        {children}
      </Typography>
    ),

    // Enhanced code blocks
    code: ({ inline, children, ...props }: any) => {
      if (inline) {
        return (
          <Box
            component="code"
            sx={{
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
              color: 'primary.dark',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontSize: '0.85em',
              fontFamily: 'Monaco, Consolas, monospace',
            }}
            {...props}
          >
            {children}
          </Box>
        );
      }

      return (
        <Paper
          sx={{
            backgroundColor: (theme) => alpha(theme.palette.grey[500], 0.08),
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
            mb: 2,
          }}
        >
          <Box
            component="code"
            sx={{
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '0.875rem',
              display: 'block',
            }}
            {...props}
          >
            {children}
          </Box>
        </Paper>
      );
    },
  };

  return (
    <StyledMarkdownContainer sx={sx}>
      <Box className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {cleanContent}
        </ReactMarkdown>
      </Box>

      {/* Render suggestions separately with special styling */}
      {suggestions.length > 0 && onSuggestionClick && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Iconify
              icon="solar:lightbulb-bolt-bold"
              sx={{ color: 'primary.main', fontSize: '1.1em' }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Suggestions
            </Typography>
          </Stack>

          <Stack spacing={1}>
            {suggestions.map((suggestion, index) => (
              <Box
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    borderColor: 'primary.main',
                    transform: 'translateY(-1px)',
                    boxShadow: (theme) => `0 4px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify
                    icon="solar:arrow-right-bold"
                    sx={{ color: 'primary.main', fontSize: '0.9em' }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                    {suggestion}
                  </Typography>
                  <Iconify
                    icon="solar:alt-arrow-right-bold"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.8em',
                      opacity: 0.6,
                      transition: 'all 0.2s ease',
                      '.MuiBox-root:hover &': {
                        opacity: 1,
                        color: 'primary.main',
                      },
                    }}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </StyledMarkdownContainer>
  );
}
