'use client';

import type { TextFieldProps } from '@mui/material/TextField';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type TableSearchProps = TextFieldProps & {
  onSearchChange: (searchTerm: string) => void;
  debounceMs?: number;
  placeholder?: string;
};

export function TableSearch({
  onSearchChange,
  debounceMs = 300,
  placeholder = 'Search...',
  sx,
  ...other
}: TableSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const onSearchChangeRef = useRef(onSearchChange);

  // Keep the ref current
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Debounce search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChangeRef.current(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <Box sx={{ minWidth: 280, ...sx }}>
      <TextField
        fullWidth
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        {...other}
      />
    </Box>
  );
}
