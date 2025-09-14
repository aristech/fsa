import type {
  ApprovalData,
  RejectionData,
  AddTimeEntryData,
  CreateReportData,
  UpdateReportData,
  ReportSearchParams,
  AddMaterialUsageData,
} from '../models/Report';

import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export class ReportService {
  static async getAllReports(params?: ReportSearchParams) {
    const response = await axiosInstance.get(endpoints.fsa.reports.list, { params });
    return response.data;
  }

  static async getReport(id: string) {
    const response = await axiosInstance.get(endpoints.fsa.reports.details(id));
    return response.data;
  }

  static async createReport(data: CreateReportData) {
    const response = await axiosInstance.post(endpoints.fsa.reports.list, data);
    return response.data;
  }

  static async updateReport(id: string, data: UpdateReportData) {
    const response = await axiosInstance.put(endpoints.fsa.reports.details(id), data);
    return response.data;
  }

  static async deleteReport(id: string) {
    const response = await axiosInstance.delete(endpoints.fsa.reports.details(id));
    return response.data;
  }

  // Workflow actions
  static async submitReport(id: string) {
    const response = await axiosInstance.post(endpoints.fsa.reports.submit(id));
    return response.data;
  }

  static async approveReport(id: string, data?: ApprovalData) {
    const response = await axiosInstance.post(endpoints.fsa.reports.approve(id), data || {});
    return response.data;
  }

  static async rejectReport(id: string, data: RejectionData) {
    const response = await axiosInstance.post(endpoints.fsa.reports.reject(id), data);
    return response.data;
  }

  // Content management
  static async addMaterialUsage(reportId: string, data: AddMaterialUsageData) {
    const response = await axiosInstance.post(endpoints.fsa.reports.materials(reportId), data);
    return response.data;
  }

  static async addTimeEntry(reportId: string, data: AddTimeEntryData) {
    const response = await axiosInstance.post(endpoints.fsa.reports.timeEntries(reportId), data);
    return response.data;
  }

  static async uploadAttachment(reportId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      endpoints.fsa.reports.attachments(reportId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  static async uploadPhoto(reportId: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await axiosInstance.post(endpoints.fsa.reports.photos(reportId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  static async addSignature(
    reportId: string,
    signatureData: {
      type: 'technician' | 'client' | 'supervisor' | 'inspector';
      signatureData: string;
      signerName: string;
      signerTitle?: string;
      signerEmail?: string;
    }
  ) {
    const response = await axiosInstance.post(
      endpoints.fsa.reports.signatures(reportId),
      signatureData
    );
    return response.data;
  }

  // Dashboard and analytics
  static async getDashboardStats(period?: string) {
    const response = await axiosInstance.get(endpoints.fsa.reports.dashboardStats, {
      params: { period },
    });
    return response.data;
  }

  // Client features
  static async getClientReports(clientId: string, params?: ReportSearchParams) {
    const response = await axiosInstance.get(endpoints.fsa.reports.clientReports(clientId), {
      params,
    });
    return response.data;
  }

  // Export functionality
  static async exportReport(reportId: string, format: 'pdf' | 'excel' | 'word' = 'pdf') {
    const response = await axiosInstance.get(endpoints.fsa.reports.export(reportId), {
      params: { format },
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data], {
      type:
        format === 'pdf'
          ? 'application/pdf'
          : format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${reportId}.${format === 'excel' ? 'xlsx' : format === 'word' ? 'docx' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Report downloaded successfully' };
  }

  // Template functionality
  static async getReportTemplates() {
    const response = await axiosInstance.get(endpoints.fsa.reports.templates);
    return response.data;
  }

  static async createReportFromTemplate(templateId: string, data: Partial<CreateReportData>) {
    const response = await axiosInstance.post(endpoints.fsa.reports.fromTemplate(templateId), data);
    return response.data;
  }

  // Auto-generation from tasks/work orders
  static async generateReportFromTask(taskId: string) {
    const response = await axiosInstance.post(endpoints.fsa.reports.generateFromTask(taskId));
    return response.data;
  }

  static async generateReportFromWorkOrder(workOrderId: string) {
    const response = await axiosInstance.post(
      endpoints.fsa.reports.generateFromWorkOrder(workOrderId)
    );
    return response.data;
  }

  // Bulk operations
  static async bulkUpdateReports(reportIds: string[], updateData: Partial<UpdateReportData>) {
    const response = await axiosInstance.put(endpoints.fsa.reports.bulkUpdate, {
      reportIds,
      updateData,
    });
    return response.data;
  }

  static async bulkExportReports(reportIds: string[], format: 'pdf' | 'excel' = 'pdf') {
    const response = await axiosInstance.post(
      endpoints.fsa.reports.bulkExport,
      {
        reportIds,
        format,
      },
      {
        responseType: 'blob',
      }
    );

    // Create download link
    const blob = new Blob([response.data], {
      type:
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports-bulk-export.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Reports exported successfully' };
  }
}
