// ----------------------------------------------------------------------

// Embedded data interfaces for historical preservation
export interface IEmbeddedUser {
  _id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  phone?: string;
}

export interface IEmbeddedClient {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contactPerson?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface IEmbeddedWorkOrder {
  _id: string;
  number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  location?: string;
  clientId: string;
  assignedTo?: string;
  createdBy: string;
}

export interface IEmbeddedTask {
  _id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: Date;
  dueDate?: Date;
  assignedTo?: string;
  workOrderId?: string;
  createdBy: string;
}

export interface IReportAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: {
    _id: string;
    name: string;
    email?: string;
  };
  // Embedded user data for historical purposes
  uploadedByData?: IEmbeddedUser;
  // Signature-specific fields (optional for regular attachments)
  signatureType?: string;
  signerName?: string;
}

export interface IReportTimeEntry {
  _id: string;
  description: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  taskId?: string;
  // Embedded task data for historical purposes
  taskData?: IEmbeddedTask;
  category: 'labor' | 'travel' | 'waiting' | 'equipment' | 'other';
}

export interface IReportMaterialUsage {
  _id: string;
  materialId: string;
  // Enhanced material data for historical purposes
  material: {
    _id: string;
    name: string;
    sku: string;
    unit: string;
    description?: string;
    category?: string;
    supplier?: string;
    // Store the cost at the time of report creation
    unitCostAtTime: number;
  };
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface IReportSignature {
  _id: string;
  type: 'technician' | 'client' | 'supervisor' | 'inspector';
  signatureData: string; // Base64 encoded signature image
  signerName: string;
  signerTitle?: string;
  signerEmail?: string;
  signedAt: Date;
  ipAddress?: string;
}

export interface IQualityCheck {
  _id: string;
  item: string;
  status: 'pass' | 'fail' | 'n/a';
  notes?: string;
}

export interface ISafetyIncident {
  _id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  actionTaken: string;
  reportedAt: Date;
}

export interface IClientFeedback {
  rating: number; // 1-5
  comments?: string;
  submittedAt?: Date;
  submittedBy?: string;
}

export interface IClientApproval {
  approved: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  comments?: string;
}

export interface IReport {
  _id: string;
  tenantId: string;

  // Basic Info
  type:
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'incident'
    | 'maintenance'
    | 'inspection'
    | 'completion'
    | 'safety';
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Relations (keep references for active data)
  createdBy: {
    _id: string;
    name: string;
    email?: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email?: string;
  };
  clientId?: string;
  client?: {
    _id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  workOrderId?: string;
  workOrder?: {
    _id: string;
    number: string;
    title: string;
    description?: string;
  };
  taskIds: string[];
  tasks?: {
    _id: string;
    name: string;
    status: string;
    priority: string;
  }[];

  // Embedded data for historical preservation (immutable once set)
  createdByData?: IEmbeddedUser;
  assignedToData?: IEmbeddedUser;
  clientData?: IEmbeddedClient;
  workOrderData?: IEmbeddedWorkOrder;
  tasksData?: IEmbeddedTask[];

  // Content
  location?: string;
  weather?: string;
  equipment: string[];

  // Time Tracking
  reportDate: Date;
  startTime?: Date;
  endTime?: Date;
  totalHours?: number;
  timeEntries: IReportTimeEntry[];

  // Materials & Costs
  materialsUsed: IReportMaterialUsage[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalCost: number;

  // Documentation
  attachments: IReportAttachment[];
  signatures: IReportSignature[];
  photos: IReportAttachment[];

  // Quality & Safety
  qualityChecks: IQualityCheck[];
  safetyIncidents: ISafetyIncident[];

  // Client Interaction
  clientFeedback?: IClientFeedback;
  clientApproval?: IClientApproval;

  // System Fields
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: {
    _id: string;
    name: string;
    email?: string;
  };
  rejectedAt?: Date;
  rejectedBy?: {
    _id: string;
    name: string;
    email?: string;
  };
  rejectionReason?: string;

  // Workflow
  reviewers: {
    _id: string;
    name: string;
    email?: string;
  }[];
  approvalRequired: boolean;
  clientVisible: boolean;

  // Template & Automation
  templateId?: string;
  autoGenerated: boolean;
  parentReportId?: string;

  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

// DTOs for API requests
export interface CreateReportData {
  type: IReport['type'];
  clientId?: string;
  workOrderId?: string;
  taskIds?: string[];
  location?: string;
  weather?: string;
  equipment?: string[];
  reportDate?: Date;
  priority?: IReport['priority'];
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateReportData extends Partial<CreateReportData> {
  status?: IReport['status'];
  materialsUsed?: IReportMaterialUsage[];
  timeEntries?: IReportTimeEntry[];
  attachments?: IReportAttachment[];
  signatures?: IReportSignature[];
  qualityChecks?: IQualityCheck[];
  safetyIncidents?: ISafetyIncident[];
  totalLaborCost?: number;
}

export interface ReportFilters {
  type?: string;
  status?: string;
  priority?: string;
  clientId?: string;
  workOrderId?: string;
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  tags?: string[];
  assignedToMe?: boolean;
}

export interface ReportSearchParams extends ReportFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportStats {
  summary: {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  recent: IReport[];
  byType: Array<{ _id: string; count: number }>;
  byStatus: Array<{ _id: string; count: number }>;
}

// Form data types
export interface AddMaterialUsageData {
  materialId: string;
  quantityUsed: number;
  notes?: string;
}

export interface AddTimeEntryData {
  description: string;
  startTime: Date;
  endTime: Date;
  taskId?: string;
  category?: IReportTimeEntry['category'];
}

export interface SubmitClientFeedbackData {
  rating: number;
  comments?: string;
}

export interface ApprovalData {
  comments?: string;
}

export interface RejectionData {
  reason: string;
}
