'use client';

import { useState, useContext, useCallback, createContext, type ReactNode } from 'react';

// ----------------------------------------------------------------------

export interface Client {
  _id: string;
  name: string;
  email: string;
  company?: string;
  logo?: string;
}

interface ClientContextType {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  clearSelectedClient: () => void;
}

// ----------------------------------------------------------------------

const ClientContext = createContext<ClientContextType | undefined>(undefined);

// ----------------------------------------------------------------------

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const [selectedClient, setSelectedClientState] = useState<Client | null>(null);

  const setSelectedClient = useCallback((client: Client | null) => {
    setSelectedClientState(client);
  }, []);

  const clearSelectedClient = useCallback(() => {
    setSelectedClientState(null);
  }, []);

  const value = {
    selectedClient,
    setSelectedClient,
    clearSelectedClient,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

// ----------------------------------------------------------------------

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}

// ----------------------------------------------------------------------
