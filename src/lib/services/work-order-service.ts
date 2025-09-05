import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface WorkOrder {
  _id: string;
  workOrderNumber: string;
  customerId: string | { _id: string; name: string; email: string; phone: string; company: string };
  technicianId?: string | { _id: string; employeeId: string; userId: string };
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'created' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  category: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  scheduledDate?: string;
  estimatedDuration: number;
  actualDuration?: number;
  cost: {
    labor: number;
    materials: number;
    total: number;
  };
  materials: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  notes?: string;
  history: Array<{
    status: string;
    timestamp: string;
    userId: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderRequest {
  customerId: string;
  technicianId?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  scheduledDate?: string;
  estimatedDuration: number;
  notes?: string;
}

export interface UpdateWorkOrderRequest {
  customerId?: string;
  technicianId?: string;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'created' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  category?: string;
  location?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  scheduledDate?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  cost?: {
    labor: number;
    materials: number;
    total: number;
  };
  materials?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  notes?: string;
}

export interface WorkOrderListResponse {
  success: boolean;
  data: {
    workOrders: WorkOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface WorkOrderResponse {
  success: boolean;
  data: WorkOrder;
}

// ----------------------------------------------------------------------

export const workOrderService = {
  // Get work orders list
  getWorkOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    technicianId?: string;
    customerId?: string;
  }): Promise<WorkOrderListResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.workOrders.list, { params });
    return response.data;
  },

  // Get work order by ID
  getWorkOrder: async (id: string): Promise<WorkOrderResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.workOrders.details(id));
    return response.data;
  },

  // Create work order
  createWorkOrder: async (data: CreateWorkOrderRequest): Promise<WorkOrderResponse> => {
    const response = await axiosInstance.post(endpoints.fsa.workOrders.list, data);
    return response.data;
  },

  // Update work order
  updateWorkOrder: async (id: string, data: UpdateWorkOrderRequest): Promise<WorkOrderResponse> => {
    const response = await axiosInstance.put(endpoints.fsa.workOrders.details(id), data);
    return response.data;
  },

  // Delete work order
  deleteWorkOrder: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(endpoints.fsa.workOrders.details(id));
    return response.data;
  },
};
