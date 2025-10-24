'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Chip,
  Stack,
  Button,
  Dialog,
  Select,
  Avatar,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  IconButton,
  DialogTitle,
  FormControl,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export interface SignatureData {
  id: string;
  type: 'technician' | 'supervisor' | 'client' | 'inspector' | 'other';
  signerName: string;
  signerTitle?: string;
  signerEmail?: string;
  signatureData: string; // Base64 encoded signature
  signedAt: Date;
  notes?: string;
}

interface SignatureCollectorProps {
  signatures: SignatureData[];
  onAddSignature: (signature: Omit<SignatureData, 'id' | 'signedAt'>) => void;
  onRemoveSignature: (id: string) => void;
  onUpdateSignature: (id: string, updates: Partial<SignatureData>) => void;
  disabled?: boolean;
  getInitialFormData?: (type: SignatureData['type']) => Partial<SignatureData> | undefined;
}

const signatureTypes = [
  { value: 'technician', label: 'Technician', icon: 'eva:person-fill', color: 'primary' },
  { value: 'supervisor', label: 'Supervisor', icon: 'eva:shield-fill', color: 'warning' },
  { value: 'client', label: 'Client', icon: 'eva:people-fill', color: 'success' },
  { value: 'inspector', label: 'Inspector', icon: 'eva:search-fill', color: 'info' },
  { value: 'other', label: 'Other', icon: 'eva:person-add-fill', color: 'default' },
];

export function SignatureCollector({
  signatures,
  onAddSignature,
  onRemoveSignature,
  onUpdateSignature,
  disabled = false,
  getInitialFormData,
}: SignatureCollectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentSignature, setCurrentSignature] = useState<Partial<SignatureData>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 200 });
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection and responsive canvas sizing
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);

      // Set responsive canvas size
      if (mobile) {
        setCanvasSize({ width: Math.min(window.innerWidth - 80, 350), height: 150 });
      } else {
        setCanvasSize({ width: 400, height: 200 });
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOpenDialog = useCallback(
    (type?: SignatureData['type']) => {
      const signatureType = type || 'technician';
      const initialData = getInitialFormData?.(signatureType);

      setCurrentSignature({
        type: signatureType,
        signerName: initialData?.signerName || '',
        signerTitle: initialData?.signerTitle || '',
        signerEmail: initialData?.signerEmail || '',
        signatureData: '',
        notes: '',
      });
      setDialogOpen(true);

      // Reset canvas after dialog opens
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Set up canvas for high DPI displays
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            // Set canvas display size
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            // Clear and set up drawing context
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = isMobile ? 3 : 2; // Thicker lines on mobile
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          }
        }
      }, 100);
    },
    [isMobile, getInitialFormData]
  );

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setCurrentSignature({});
    setIsDrawing(false);
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, []);

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    },
    [isDrawing]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Touch event handlers for mobile devices
  const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, []);

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    },
    [isDrawing]
  );

  const handleCanvasTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  }, []);

  const handleClearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = isMobile ? 3 : 2; // Thicker lines on mobile
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isMobile]);

  const handleSaveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentSignature.type || !currentSignature.signerName) return;

    const signatureData = canvas.toDataURL('image/png');

    onAddSignature({
      type: currentSignature.type,
      signerName: currentSignature.signerName,
      signerTitle: currentSignature.signerTitle,
      signerEmail: currentSignature.signerEmail,
      signatureData,
      notes: currentSignature.notes,
    });

    handleCloseDialog();
  }, [currentSignature, onAddSignature, handleCloseDialog]);

  const getSignatureTypeInfo = (type: SignatureData['type']) =>
    signatureTypes.find((t) => t.value === type) || signatureTypes[0];

  const renderSignatureDialog = () => (
    <Dialog
      open={dialogOpen}
      onClose={handleCloseDialog}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100vh' : '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Iconify icon="eva:edit-fill" width={24} />
          <Typography variant="h6">Collect Signature</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {isMobile && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: 'info.lighter',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'info.light',
            }}
          >
            <Typography variant="body2" color="info.darker" sx={{ fontWeight: 500 }}>
              📱 Mobile Signature Tips:
            </Typography>
            <Typography variant="caption" color="info.darker" sx={{ display: 'block', mt: 0.5 }}>
              • Use your finger to draw your signature • Hold your device steady for best results •
              Tap &quot;Clear&quot; to start over if needed
            </Typography>
          </Box>
        )}
        <Stack spacing={3}>
          {/* Signature Type */}
          <FormControl fullWidth>
            <InputLabel>Signature Type</InputLabel>
            <Select
              value={currentSignature.type || 'technician'}
              onChange={(e) =>
                setCurrentSignature((prev) => ({
                  ...prev,
                  type: e.target.value as SignatureData['type'],
                }))
              }
              label="Signature Type"
            >
              {signatureTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Iconify icon={type.icon} width={20} />
                    {type.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Signer Information */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Signer Name"
              value={currentSignature.signerName || ''}
              onChange={(e) =>
                setCurrentSignature((prev) => ({ ...prev, signerName: e.target.value }))
              }
              required
            />
            <TextField
              fullWidth
              label="Title/Position"
              value={currentSignature.signerTitle || ''}
              onChange={(e) =>
                setCurrentSignature((prev) => ({ ...prev, signerTitle: e.target.value }))
              }
              placeholder="e.g., Lead Technician"
            />
          </Box>

          <TextField
            fullWidth
            label="Email (Optional)"
            type="email"
            value={currentSignature.signerEmail || ''}
            onChange={(e) =>
              setCurrentSignature((prev) => ({ ...prev, signerEmail: e.target.value }))
            }
            placeholder="signer@company.com"
          />

          {/* Signature Canvas */}
          <Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Signature
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearSignature}
                startIcon={<Iconify icon="eva:refresh-fill" width={16} />}
              >
                Clear
              </Button>
            </Box>

            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                backgroundColor: 'background.neutral',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  backgroundColor: 'white',
                  cursor: isMobile ? 'default' : 'crosshair',
                  touchAction: 'none', // Prevent scrolling while drawing
                  userSelect: 'none', // Prevent text selection
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {isMobile
                ? 'Sign in the box above using your finger'
                : 'Sign in the box above using your mouse or touchpad'}
            </Typography>
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={2}
            value={currentSignature.notes || ''}
            onChange={(e) => setCurrentSignature((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes about this signature..."
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleCloseDialog} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSaveSignature}
          variant="contained"
          disabled={!currentSignature.signerName || !currentSignature.type}
          startIcon={<Iconify icon="eva:save-fill" width={16} />}
        >
          Save Signature
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderSignatureCard = (signature: SignatureData) => {
    const typeInfo = getSignatureTypeInfo(signature.type);

    return (
      <Box
        key={signature.id}
        sx={{
          p: isMobile ? 3 : 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: 'background.paper',
          minHeight: isMobile ? 120 : 'auto',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: `${typeInfo.color}.light`, width: 40, height: 40 }}>
            <Iconify icon={typeInfo.icon} width={20} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {signature.signerName}
            </Typography>
          </Box>
          <Chip
            label={typeInfo.label}
            size="small"
            color={typeInfo.color as any}
            variant="outlined"
          />
          {!disabled && (
            <IconButton
              size={isMobile ? 'medium' : 'small'}
              onClick={() => onRemoveSignature(signature.id)}
              sx={{
                color: 'error.main',
                minWidth: isMobile ? 44 : 'auto',
                minHeight: isMobile ? 44 : 'auto',
              }}
            >
              <Iconify icon="eva:trash-2-fill" width={isMobile ? 20 : 16} />
            </IconButton>
          )}
        </Box>

        {/* Signature Preview */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: isMobile ? 2 : 1,
            backgroundColor: 'white',
            mb: 2,
            minHeight: isMobile ? 100 : 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {signature.signatureData ? (
            <img
              src={signature.signatureData}
              alt={`Signature of ${signature.signerName}`}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: isMobile ? 120 : 80,
                objectFit: 'contain',
              }}
            />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', fontStyle: 'italic' }}
            >
              No signature captured yet
            </Typography>
          )}
        </Box>

        {/* Signature Details */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Signed: {new Date(signature.signedAt).toLocaleString()}
          </Typography>
          {signature.signerEmail && (
            <Typography variant="caption" color="text.secondary">
              {signature.signerEmail}
            </Typography>
          )}
        </Box>

        {signature.notes && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Notes:</strong> {signature.notes}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Signatures ({signatures.length})
        </Typography>
        {!disabled && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="eva:edit-fill" width={16} />}
            onClick={() => handleOpenDialog()}
          >
            Add Signature
          </Button>
        )}
      </Box>

      {/* Quick Add Buttons */}
      {!disabled && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 3,
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}
        >
          {signatureTypes.map((type) => (
            <Button
              key={type.value}
              variant="outlined"
              size={isMobile ? 'medium' : 'small'}
              startIcon={<Iconify icon={type.icon} width={16} />}
              onClick={() => handleOpenDialog(type.value as SignatureData['type'])}
              sx={{
                borderColor: `${type.color}.main`,
                color: `${type.color}.main`,
                minWidth: isMobile ? 120 : 'auto',
                flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                '&:hover': {
                  borderColor: `${type.color}.dark`,
                  backgroundColor: `${type.color}.lighter`,
                },
              }}
            >
              {type.label}
            </Button>
          ))}
        </Box>
      )}

      {/* Signatures List */}
      {signatures.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {signatures.map(renderSignatureCard)}
        </Box>
      ) : (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.neutral',
          }}
        >
          <Iconify icon="eva:edit-fill" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No signatures collected
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Collect signatures from technicians, supervisors, and other stakeholders
          </Typography>
          {!disabled && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:edit-fill" />}
              onClick={() => handleOpenDialog()}
            >
              Add First Signature
            </Button>
          )}
        </Box>
      )}

      {renderSignatureDialog()}
    </Box>
  );
}
