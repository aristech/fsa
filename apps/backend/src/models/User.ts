import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface IUser {
  _id: string;
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: string; // Role slug
  permissions: string[];
  isActive: boolean;
  isTenantOwner: boolean;
  lastLoginAt?: Date;
  isOnline: boolean;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const UserSchema = new Schema<IUser>(
  {
    tenantId: {
      type: String,
      required: [function (this: any) { return this.role !== 'superuser'; }, "Tenant ID is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
      lowercase: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isTenantOwner: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance
// Note: email index is automatically created by unique: true
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ isActive: 1 });

// ----------------------------------------------------------------------

export const User = models.User || model<IUser>("User", UserSchema);
