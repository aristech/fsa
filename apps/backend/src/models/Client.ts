import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface IClient {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const ClientSchema = new Schema<IClient>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    vatNumber: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      zipCode: { type: String, required: true, trim: true },
      country: { type: String, default: "US", trim: true },
    },
    billingAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    contactPerson: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance
ClientSchema.index({ tenantId: 1, email: 1 });
ClientSchema.index({ tenantId: 1, name: 1 });
ClientSchema.index({ tenantId: 1, isActive: 1 });

// ----------------------------------------------------------------------

export const Client = models.Client || model<IClient>("Client", ClientSchema);
