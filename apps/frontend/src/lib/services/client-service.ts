import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactPerson?: {
    name: string;
    email: string;
    phone: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientListResponse {
  success: boolean;
  data: {
    clients: Client[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ClientResponse {
  success: boolean;
  data: Client;
}

// ----------------------------------------------------------------------

export const clientService = {
  // Get clients list
  getClients: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ClientListResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.clients.list, { params });
    return response.data;
  },

  // Get client by ID
  getClient: async (id: string): Promise<ClientResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.clients.details(id));
    return response.data;
  },

  // Create client
  createClient: async (data: Partial<Client>): Promise<ClientResponse> => {
    const response = await axiosInstance.post(endpoints.fsa.clients.list, data);
    return response.data;
  },

  // Update client
  updateClient: async (id: string, data: Partial<Client>): Promise<ClientResponse> => {
    const response = await axiosInstance.put(endpoints.fsa.clients.details(id), data);
    return response.data;
  },

  // Delete client
  deleteClient: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(endpoints.fsa.clients.details(id));
    return response.data;
  },
};
