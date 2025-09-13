import type {
  CreateMaterialData,
  UpdateMaterialData,
  MaterialSearchParams,
} from '../models/Material';

import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export class MaterialService {
  static async getAllMaterials(params?: MaterialSearchParams) {
    const response = await axiosInstance.get(endpoints.fsa.materials.list, { params });
    return response.data;
  }

  static async getMaterial(id: string) {
    const response = await axiosInstance.get(endpoints.fsa.materials.details(id));
    return response.data;
  }

  static async createMaterial(data: CreateMaterialData) {
    const response = await axiosInstance.post(endpoints.fsa.materials.list, data);
    return response.data;
  }

  static async updateMaterial(id: string, data: UpdateMaterialData) {
    const response = await axiosInstance.put(endpoints.fsa.materials.details(id), data);
    return response.data;
  }

  static async deleteMaterial(id: string) {
    const response = await axiosInstance.delete(endpoints.fsa.materials.details(id));
    return response.data;
  }

  static async toggleMaterialActive(id: string) {
    const response = await axiosInstance.put(endpoints.fsa.materials.toggleActive(id), {});
    return response.data;
  }

  static async bulkImportMaterials(materials: CreateMaterialData[]) {
    const response = await axiosInstance.post(endpoints.fsa.materials.bulkImport, { materials });
    return response.data;
  }

  static async getCategories() {
    const response = await axiosInstance.get(endpoints.fsa.materials.categories);
    return response.data;
  }

  static async deleteCategory(categoryName: string) {
    const response = await axiosInstance.delete(
      endpoints.fsa.materials.deleteCategory(categoryName)
    );
    return response.data;
  }

  static generateSampleCSVData(): string {
    const headers = [
      'name',
      'description',
      'category',
      'sku',
      'barcode',
      'unit',
      'unitCost',
      'quantity',
      'minimumStock',
      'location',
      'supplier',
      'status',
      'customField_weight',
      'customField_color',
    ];

    const sampleRows = [
      [
        'Steel Pipe 50mm',
        'Heavy duty steel pipe 50mm diameter',
        'Pipes',
        'SP-50-001',
        '1234567890123',
        'pcs',
        '25.50',
        '100',
        '20',
        'Warehouse A - Section 1',
        'Steel Supply Co',
        'active',
        '3kg',
        'silver',
      ],
      [
        'PVC Elbow 90°',
        'PVC elbow fitting 90 degrees',
        'Fittings',
        'PVC-E90-001',
        '2345678901234',
        'pcs',
        '5.25',
        '250',
        '50',
        'Warehouse B - Section 2',
        'PVC Solutions Inc',
        'active',
        '150g',
        'white',
      ],
      [
        'Copper Wire 2.5mm²',
        'Electrical copper wire 2.5mm²',
        'Electrical',
        'CW-25-001',
        '3456789012345',
        'm',
        '2.75',
        '1000',
        '200',
        'Warehouse A - Section 3',
        'Electric Supply Corp',
        'active',
        '0.5kg/100m',
        'copper',
      ],
    ];

    const csvContent = [headers.join(','), ...sampleRows.map((row) => row.join(','))].join('\n');
    return csvContent;
  }

  static parseCSVToMaterials(csvContent: string): CreateMaterialData[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    // Parse CSV line with proper quote handling and quote removal
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Handle escaped quotes
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field - remove enclosing quotes if present
          let fieldValue = current.trim();
          if (fieldValue.startsWith('"') && fieldValue.endsWith('"') && fieldValue.length > 1) {
            fieldValue = fieldValue.slice(1, -1);
          }
          result.push(fieldValue);
          current = '';
        } else {
          current += char;
        }
      }

      // Add the last field - remove enclosing quotes if present
      let lastField = current.trim();
      if (lastField.startsWith('"') && lastField.endsWith('"') && lastField.length > 1) {
        lastField = lastField.slice(1, -1);
      }
      result.push(lastField);

      return result;
    };

    const headers = parseCSVLine(lines[0]).map((h) => h.trim());
    const materials: CreateMaterialData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
      }

      const material: any = {};
      const customFields: Record<string, any> = {};

      headers.forEach((header, index) => {
        const value = values[index];

        if (header.startsWith('customField_')) {
          const fieldName = header.replace('customField_', '');
          customFields[fieldName] = value;
        } else {
          switch (header) {
            case 'unitCost':
            case 'quantity':
            case 'minimumStock':
              material[header] = value ? parseFloat(value) : 0;
              break;
            case 'status':
              material[header] = ['active', 'inactive', 'discontinued'].includes(value)
                ? value
                : 'active';
              break;
            default:
              material[header] = value || undefined;
          }
        }
      });

      if (Object.keys(customFields).length > 0) {
        material.customFields = customFields;
      }

      // Validate required fields
      if (!material.name) {
        throw new Error(`Row ${i + 1}: Material name is required`);
      }
      if (!material.unit) {
        material.unit = 'pcs'; // Default unit
      }

      materials.push(material);
    }

    return materials;
  }
}
