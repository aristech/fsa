import axiosInstance from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

// ----------------------------------------------------------------------

export const usersApi = {
  // Get all active users for the current tenant
  getUsers: async (): Promise<{ success: boolean; data: User[] }> => {
    try {
      const response = await axiosInstance.get('/api/v1/users');
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return {
        success: false,
        data: [],
      };
    }
  },
};