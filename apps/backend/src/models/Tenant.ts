import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface ITenant {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  ownerId?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    workingHours: {
      start: string;
      end: string;
      days: number[];
    };
    sms: {
      enabled: boolean;
      provider: "yuboto" | "apifon";
      fallbackProvider?: "yuboto" | "apifon";
    };
  };
  subscription: {
    plan: "free" | "basic" | "premium" | "enterprise";
    status: "active" | "inactive" | "cancelled" | "trial" | "past_due" | "unpaid";
    startDate: Date;
    endDate?: Date;
    trialEndDate?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    billingCycle: "monthly" | "yearly";
    limits: {
      maxUsers: number;
      maxClients: number;
      maxWorkOrdersPerMonth: number;
      maxSmsPerMonth: number;
      maxStorageGB: number;
      features: {
        smsReminders: boolean;
        advancedReporting: boolean;
        apiAccess: boolean;
        customBranding: boolean;
        multiLocation: boolean;
        integrations: boolean;
        prioritySupport: boolean;
      };
    };
    usage: {
      currentUsers: number;
      currentClients: number;
      workOrdersThisMonth: number;
      smsThisMonth: number;
      storageUsedGB: number;
      totalFiles: number;
      lastResetDate: Date;
    };
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyInfo?: {
      website?: string;
      description?: string;
      industry?: string;
    };
  };
  fileMetadata?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    category: 'logo' | 'workorder_attachment' | 'client_document' | 'material_image' | 'other';
    uploadDate: Date;
    filePath: string;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const TenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: [true, "Tenant name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Tenant slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    ownerId: {
      type: String,
      required: false,
      index: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true, default: "GR" },
    },
    settings: {
      timezone: { type: String, default: "Europe/Athens" },
      currency: { type: String, default: "EUR" },
      dateFormat: { type: String, default: "DD/MM/YYYY" },
      workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        days: { type: [Number], default: [1, 2, 3, 4, 5] }, // Monday to Friday
      },
      sms: {
        enabled: { type: Boolean, default: false }, // Disabled by default, enabled per subscription plan
        provider: { type: String, enum: ["yuboto", "apifon"], default: "apifon" },
        fallbackProvider: { type: String, enum: ["yuboto", "apifon"], required: false },
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "basic", "premium", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "cancelled", "trial", "past_due", "unpaid"],
        default: "trial",
      },
      startDate: { type: Date, default: Date.now },
      endDate: Date,
      trialEndDate: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      stripePriceId: String,
      billingCycle: {
        type: String,
        enum: ["monthly", "yearly"],
        default: "monthly",
      },
      limits: {
        maxUsers: { type: Number, default: 2 },
        maxClients: { type: Number, default: 10 },
        maxWorkOrdersPerMonth: { type: Number, default: 50 },
        maxSmsPerMonth: { type: Number, default: 0 },
        maxStorageGB: { type: Number, default: 1 },
        features: {
          smsReminders: { type: Boolean, default: false },
          advancedReporting: { type: Boolean, default: false },
          apiAccess: { type: Boolean, default: false },
          customBranding: { type: Boolean, default: false },
          multiLocation: { type: Boolean, default: false },
          integrations: { type: Boolean, default: false },
          prioritySupport: { type: Boolean, default: false },
        },
      },
      usage: {
        currentUsers: { type: Number, default: 0 },
        currentClients: { type: Number, default: 0 },
        workOrdersThisMonth: { type: Number, default: 0 },
        smsThisMonth: { type: Number, default: 0 },
        storageUsedGB: { type: Number, default: 0 },
        totalFiles: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now },
      },
    },
    branding: {
      logoUrl: String,
      primaryColor: String,
      secondaryColor: String,
      companyInfo: {
        website: String,
        description: String,
        industry: String,
      },
    },
    fileMetadata: [{
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      category: {
        type: String,
        enum: ['logo', 'workorder_attachment', 'client_document', 'material_image', 'other'],
        default: 'other'
      },
      uploadDate: { type: Date, default: Date.now },
      filePath: String,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// ----------------------------------------------------------------------

// Note: Slug generation is now handled in the API routes for better control

// Indexes for better performance
// Note: slug and email indexes are automatically created by unique: true
TenantSchema.index({ isActive: 1 });

// ----------------------------------------------------------------------

export const Tenant = models.Tenant || model<ITenant>("Tenant", TenantSchema);
