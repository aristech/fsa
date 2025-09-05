import connectDB from 'src/lib/db';
import { Customer, WorkOrder, Technician } from 'src/lib/models';

// ----------------------------------------------------------------------

export interface CreateWorkOrderData {
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
  scheduledDate?: Date;
  estimatedDuration: number;
  notes?: string;
}

// ----------------------------------------------------------------------

export interface UpdateWorkOrderData {
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
  scheduledDate?: Date;
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

// ----------------------------------------------------------------------

export class WorkOrderService {
  static async createWorkOrder(tenantId: string, data: CreateWorkOrderData, userId: string) {
    await connectDB();

    // Verify customer exists
    const customer = await Customer.findOne({
      _id: data.customerId,
      tenantId,
      isActive: true,
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Verify technician exists (if provided)
    if (data.technicianId) {
      const technician = await Technician.findOne({
        _id: data.technicianId,
        tenantId,
        isActive: true,
      });

      if (!technician) {
        throw new Error('Technician not found');
      }
    }

    // Create work order
    const workOrder = new WorkOrder({
      ...data,
      tenantId,
      history: [
        {
          status: 'created',
          timestamp: new Date(),
          userId,
          notes: 'Work order created',
        },
      ],
    });

    await workOrder.save();

    // Populate the created work order
    await workOrder.populate([
      { path: 'customerId', select: 'name email phone company' },
      { path: 'technicianId', select: 'employeeId userId' },
    ]);

    return workOrder;
  }

  // ----------------------------------------------------------------------

  static async getWorkOrders(
    tenantId: string,
    filters: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      technicianId?: string;
      customerId?: string;
    } = {}
  ) {
    await connectDB();

    const { page = 1, limit = 10, status, priority, technicianId, customerId } = filters;

    // Build filter
    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (technicianId) filter.technicianId = technicianId;
    if (customerId) filter.customerId = customerId;

    // Get work orders with pagination
    const skip = (page - 1) * limit;
    const workOrders = await WorkOrder.find(filter)
      .populate('customerId', 'name email phone company')
      .populate('technicianId', 'employeeId userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WorkOrder.countDocuments(filter);

    return {
      workOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ----------------------------------------------------------------------

  static async getWorkOrderById(tenantId: string, workOrderId: string) {
    await connectDB();

    const workOrder = await WorkOrder.findOne({
      _id: workOrderId,
      tenantId,
    })
      .populate('customerId', 'name email phone company address')
      .populate('technicianId', 'employeeId userId')
      .populate('history.userId', 'firstName lastName email');

    if (!workOrder) {
      throw new Error('Work order not found');
    }

    return workOrder;
  }

  // ----------------------------------------------------------------------

  static async updateWorkOrder(
    tenantId: string,
    workOrderId: string,
    data: UpdateWorkOrderData,
    userId: string
  ) {
    await connectDB();

    // Find work order
    const workOrder = await WorkOrder.findOne({
      _id: workOrderId,
      tenantId,
    });

    if (!workOrder) {
      throw new Error('Work order not found');
    }

    // Verify customer exists (if updating)
    if (data.customerId) {
      const customer = await Customer.findOne({
        _id: data.customerId,
        tenantId,
        isActive: true,
      });

      if (!customer) {
        throw new Error('Customer not found');
      }
    }

    // Verify technician exists (if updating)
    if (data.technicianId) {
      const technician = await Technician.findOne({
        _id: data.technicianId,
        tenantId,
        isActive: true,
      });

      if (!technician) {
        throw new Error('Technician not found');
      }
    }

    // Track status changes
    const statusChanged = data.status && data.status !== workOrder.status;
    const oldStatus = workOrder.status;

    // Update work order
    Object.assign(workOrder, {
      ...data,
      scheduledDate: data.scheduledDate || workOrder.scheduledDate,
    });

    // Add to history if status changed
    if (statusChanged) {
      workOrder.history.push({
        status: data.status!,
        timestamp: new Date(),
        userId,
        notes: `Status changed from ${oldStatus} to ${data.status}`,
      });
    }

    await workOrder.save();

    // Populate the updated work order
    await workOrder.populate([
      { path: 'customerId', select: 'name email phone company address' },
      { path: 'technicianId', select: 'employeeId userId' },
      { path: 'history.userId', select: 'firstName lastName email' },
    ]);

    return workOrder;
  }

  // ----------------------------------------------------------------------

  static async deleteWorkOrder(tenantId: string, workOrderId: string) {
    await connectDB();

    const workOrder = await WorkOrder.findOneAndDelete({
      _id: workOrderId,
      tenantId,
    });

    if (!workOrder) {
      throw new Error('Work order not found');
    }

    return workOrder;
  }

  // ----------------------------------------------------------------------

  static async getWorkOrderStats(tenantId: string) {
    await connectDB();

    const stats = await WorkOrder.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const priorityStats = await WorkOrder.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      statusStats: stats,
      priorityStats,
    };
  }
}
