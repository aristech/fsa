import type { Document } from 'mongoose';
import type { ITenant } from './Tenant';

import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface IMaterial extends Document {
  _id: string;
  tenantId: mongoose.Types.ObjectId | ITenant;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  unitCost: number;
  quantity: number;
  minimumStock?: number;
  location?: string;
  supplier?: string;
  customFields: Map<string, any>;
  isActive: boolean;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const MaterialSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Material name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      default: 'pcs',
    },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: 0,
      default: 0,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
      default: 0,
    },
    minimumStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    supplier: {
      type: String,
      trim: true,
      default: '',
    },
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance
MaterialSchema.index({ tenantId: 1, name: 1 });
MaterialSchema.index({ tenantId: 1, sku: 1 }, { sparse: true });
MaterialSchema.index({ tenantId: 1, barcode: 1 }, { sparse: true });
MaterialSchema.index({ tenantId: 1, category: 1 });
MaterialSchema.index({ tenantId: 1, isActive: 1 });
MaterialSchema.index({ tenantId: 1, status: 1 });

// Text index for search functionality
MaterialSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  sku: 'text',
  barcode: 'text',
  location: 'text',
  supplier: 'text',
});

export const Material =
  mongoose.models.Material || mongoose.model<IMaterial>('Material', MaterialSchema);