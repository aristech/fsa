import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface Personnel {
  _id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  roleId?: string;
  skills: string[];
  certifications: string[];
  hourlyRate: number;
  availability: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    lastUpdated: string;
  };
  notes?: string;
  isActive: boolean;
  status: 'active' | 'pending' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
  // Populated fields
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  role?: {
    _id: string;
    name: string;
  };
}

export interface PersonnelListResponse {
  success: boolean;
  data: Personnel[];
}

export interface PersonnelResponse {
  success: boolean;
  data: Personnel;
}

// ----------------------------------------------------------------------

export const personnelService = {
  // Get personnel list
  getPersonnel: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    roleId?: string;
    search?: string;
  }): Promise<PersonnelListResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.personnel.list, { params });
    return response.data;
  },

  // Get personnel by ID
  getPersonnelById: async (id: string): Promise<PersonnelResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.personnel.details(id));
    return response.data;
  },

  // Create personnel
  createPersonnel: async (data: Partial<Personnel>): Promise<PersonnelResponse> => {
    const response = await axiosInstance.post(endpoints.fsa.personnel.list, data);
    return response.data;
  },

  // Update personnel
  updatePersonnel: async (id: string, data: Partial<Personnel>): Promise<PersonnelResponse> => {
    const response = await axiosInstance.put(endpoints.fsa.personnel.details(id), data);
    return response.data;
  },

  // Delete personnel
  deletePersonnel: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(endpoints.fsa.personnel.details(id));
    return response.data;
  },
};
