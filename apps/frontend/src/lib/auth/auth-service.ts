import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role: string;
      permissions: string[];
      tenant: {
        id: string;
        name: string;
        slug: string;
      };
    };
    token: string;
  };
}

// ----------------------------------------------------------------------

export const authService = {
  // Sign in
  signIn: async (data: SignInRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post(endpoints.auth.signIn, data);
    return response.data;
  },

  // Sign up
  signUp: async (data: SignUpRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post(endpoints.auth.signUp, data);
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await axiosInstance.get(endpoints.auth.me);
    return response.data;
  },

  // Store token
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jwt_access_token', token);
    }
  },

  // Get token
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('jwt_access_token');
    }
    return null;
  },

  // Remove token
  removeToken: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('jwt_access_token');
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => !!authService.getToken(),
};
