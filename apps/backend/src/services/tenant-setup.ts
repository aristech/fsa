import { Role, Tenant, User, Status } from "../models";
import { SubscriptionPlansService } from "./subscription-plans-service";
import { StripeService } from "./stripe-service";

// ----------------------------------------------------------------------

export interface DefaultRoleConfig {
  name: string;
  slug: string;
  description: string;
  color: string;
  permissions: string[];
  isDefault: boolean;
}

// ----------------------------------------------------------------------

export const DEFAULT_ROLES: DefaultRoleConfig[] = [
  {
    name: "Supervisor",
    slug: "supervisor",
    description:
      "Full permissions on the tenant - can manage all aspects of the system",
    color: "#1976d2",
    isDefault: true,
    permissions: [
      // Work Orders - Full access
      "workOrders.view",
      "workOrders.create",
      "workOrders.edit",
      "workOrders.delete",
      "workOrders.assign",

      // Projects - Full access
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.delete",

      // Tasks - Full access
      "tasks.view",
      "tasks.create",
      "tasks.edit",
      "tasks.delete",

      // Clients - Full access
      "clients.view",
      "clients.create",
      "clients.edit",
      "clients.delete",

      // Personnel - Full access
      "personnel.view",
      "personnel.create",
      "personnel.edit",
      "personnel.delete",

      // Calendar - Full access
      "calendar.view",
      "calendar.edit",

      // Reports - Full access
      "reports.view",
      "reports.export",

      // Roles - Full access
      "roles.manage",

      // System Management - Full access
      "statuses.manage",
      "settings.manage",
      "tenant.manage",
      "admin.access",
    ],
  },
  {
    name: "Technician",
    slug: "technician",
    description:
      "Can view and edit own tasks and calendar - limited access to other resources",
    color: "#ed6c02",
    isDefault: true,
    permissions: [
      // Work Orders - Own only
      "workOrders.viewOwn",
      "workOrders.editOwn",

      // Tasks - Own only
      "tasks.viewOwn",
      "tasks.editOwn",

      // Calendar - Own only
      "calendar.viewOwn",
      "calendar.editOwn",

      // Clients - View only
      "clients.view",

      // Personnel - View only
      "personnel.view",
    ],
  },
];

// ----------------------------------------------------------------------

export class TenantSetupService {
  /**
   * Create default statuses for a tenant
   */
  static async createDefaultStatuses(tenantId: string): Promise<void> {
    try {
      // Check if default statuses already exist for this tenant
      const existingStatuses = await Status.find({
        tenantId,
        isDefault: true,
      });

      if (existingStatuses.length > 0) {
        console.log(`Default statuses already exist for tenant ${tenantId}`);
        return;
      }

      // Create default statuses
      const defaultStatuses = [
        { name: "Todo", order: 1, isDefault: true },
        { name: "In Progress", order: 2, isDefault: true },
        { name: "Review", order: 3, isDefault: true },
        { name: "Done", order: 4, isDefault: true },
      ];

      const statusesToCreate = defaultStatuses.map((status) => ({
        ...status,
        tenantId,
        isActive: true,
      }));

      await Status.insertMany(statusesToCreate);
      console.log(
        `✅ Created ${statusesToCreate.length} default statuses for tenant ${tenantId}`
      );
    } catch (error) {
      console.error("Error creating default statuses:", error);
      throw error;
    }
  }

  /**
   * Create default roles for a tenant
   */
  static async createDefaultRoles(tenantId: string): Promise<void> {
    try {
      // Check if default roles already exist for this tenant
      const existingRoles = await Role.find({
        tenantId,
        isDefault: true,
      });

      if (existingRoles.length > 0) {
        console.log(`Default roles already exist for tenant ${tenantId}`);
        return;
      }

      // Create default roles with tenant-specific slugs
      const rolesToCreate = [];
      for (const roleConfig of DEFAULT_ROLES) {
        // Create tenant-specific slug: supervisor_68bebb8ca7618fa2fe1c7b12
        const tenantSpecificSlug = `${roleConfig.slug}_${tenantId}`;
        
        const existingRole = await Role.findOne({
          tenantId,
          slug: tenantSpecificSlug,
        });
        
        if (!existingRole) {
          rolesToCreate.push({
            ...roleConfig,
            slug: tenantSpecificSlug, // Use tenant-specific slug
            tenantId,
            isActive: true,
          });
        }
      }

      if (rolesToCreate.length > 0) {
        await Role.insertMany(rolesToCreate);
        console.log(
          `✅ Created ${rolesToCreate.length} default roles for tenant ${tenantId}`
        );
      } else {
        console.log(`✅ All default roles already exist for tenant ${tenantId}`);
      }
    } catch (error) {
      console.error("Error creating default roles:", error);
      throw error;
    }
  }

  /**
   * Setup a new tenant with default roles and owner
   */
  static async setupNewTenant(tenantData: {
    name: string;
    slug: string;
    email: string;
    phone?: string;
    address?: any;
    settings?: any;
    ownerFirstName?: string;
    ownerLastName?: string;
    subscriptionPlan?: string;
  }): Promise<{ tenant: any; roles: any[]; owner: any }> {
    try {
      // Determine subscription plan (default to "free")
      const planName = tenantData.subscriptionPlan || "free";

      // Apply plan limits and settings
      const subscriptionConfig = SubscriptionPlansService.applyPlanLimits(planName);

      // Create Stripe customer for the tenant
      let stripeCustomerId = undefined;
      try {
        const stripeCustomer = await StripeService.createCustomer({
          email: tenantData.email,
          name: tenantData.name,
          metadata: {
            tenantSlug: tenantData.slug,
            planName: planName,
            source: 'tenant_setup'
          }
        });
        stripeCustomerId = stripeCustomer.id;
        console.log(`✅ Created Stripe customer: ${stripeCustomerId} for tenant: ${tenantData.name}`);
      } catch (error) {
        console.error("Warning: Failed to create Stripe customer:", error);
        // Continue with tenant creation even if Stripe fails
        // This allows the system to work without Stripe configuration
      }

      // Create tenant with plan-based settings and Stripe customer ID
      const tenant = new Tenant({
        ...tenantData,
        subscription: {
          ...subscriptionConfig,
          stripeCustomerId: stripeCustomerId,
        },
        settings: {
          ...tenantData.settings,
          sms: {
            enabled: subscriptionConfig.limits.features.smsReminders,
            provider: "apifon",
            fallbackProvider: subscriptionConfig.limits.features.smsReminders ? "yuboto" : undefined,
          },
        },
        isActive: true,
      });

      await tenant.save();
      console.log(`✅ Created tenant: ${tenant.name}`);

      // Create default roles
      await this.createDefaultRoles(tenant._id.toString());

      // Create default statuses
      await this.createDefaultStatuses(tenant._id.toString());

      // Generate a secure temporary password (will be changed during activation)
      const crypto = require('crypto');
      const tempPassword = crypto.randomBytes(16).toString('hex');

      // Create tenant owner user with admin privileges (inactive until activation)
      const owner = new User({
        email: tenantData.email,
        firstName: tenantData.ownerFirstName || tenantData.name.split(' ')[0] || tenantData.name,
        lastName: tenantData.ownerLastName || tenantData.name.split(' ').slice(1).join(' ') || 'Admin',
        phone: tenantData.phone,
        tenantId: tenant._id.toString(),
        isTenantOwner: true,
        role: "admin",
        permissions: this.getAllPermissions(), // Grant all permissions to owner
        isActive: false, // Inactive until magic link activation
        password: tempPassword, // Temporary password - will be changed during activation
      });

      await owner.save();
      console.log(`✅ Created tenant owner user: ${owner.email} (inactive until activation)`);

      // Update tenant with owner ID and increment user count
      tenant.ownerId = owner._id.toString();
      tenant.subscription.usage.currentUsers = 1; // Owner counts as first user
      await tenant.save();
      console.log(`✅ Updated tenant with owner ID: ${owner._id}`);

      // Fetch created roles
      const roles = await Role.find({
        tenantId: tenant._id,
        isDefault: true,
      });

      return { tenant, roles, owner };
    } catch (error) {
      console.error("Error setting up new tenant:", error);
      throw error;
    }
  }

  /**
   * Get role permissions for a specific role name
   */
  static getRolePermissions(roleName: string): string[] {
    const role = DEFAULT_ROLES.find((r) => r.name === roleName);
    return role ? role.permissions : [];
  }

  /**
   * Check if a role is a default role
   */
  static isDefaultRole(roleName: string): boolean {
    return DEFAULT_ROLES.some((r) => r.name === roleName);
  }

  /**
   * Create Stripe customer for existing tenant (migration utility)
   */
  static async createStripeCustomerForTenant(tenantId: string): Promise<string | null> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // Skip if tenant already has a Stripe customer
      if (tenant.subscription.stripeCustomerId) {
        console.log(`Tenant ${tenant.name} already has Stripe customer: ${tenant.subscription.stripeCustomerId}`);
        return tenant.subscription.stripeCustomerId;
      }

      // Create Stripe customer
      const stripeCustomer = await StripeService.createCustomer({
        email: tenant.email,
        name: tenant.name,
        metadata: {
          tenantSlug: tenant.slug,
          tenantId: tenant._id.toString(),
          planName: tenant.subscription.plan,
          source: 'migration'
        }
      });

      // Update tenant with Stripe customer ID
      await Tenant.findByIdAndUpdate(tenantId, {
        'subscription.stripeCustomerId': stripeCustomer.id
      });

      console.log(`✅ Created Stripe customer ${stripeCustomer.id} for existing tenant: ${tenant.name}`);
      return stripeCustomer.id;
    } catch (error) {
      console.error(`Error creating Stripe customer for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Migrate all tenants without Stripe customers (bulk migration utility)
   */
  static async migrateTenantsToStripe(): Promise<{ success: number; failed: number }> {
    try {
      // Find tenants without Stripe customers
      const tenantsWithoutStripe = await Tenant.find({
        'subscription.stripeCustomerId': { $exists: false },
        isActive: true
      });

      console.log(`Found ${tenantsWithoutStripe.length} tenants without Stripe customers`);

      let success = 0;
      let failed = 0;

      for (const tenant of tenantsWithoutStripe) {
        const stripeCustomerId = await this.createStripeCustomerForTenant(tenant._id.toString());
        if (stripeCustomerId) {
          success++;
        } else {
          failed++;
        }
      }

      console.log(`Migration completed: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Error during tenant migration to Stripe:', error);
      throw error;
    }
  }

  /**
   * Get all available permissions for tenant owners
   */
  static getAllPermissions(): string[] {
    return [
      // Work Orders - Full access
      "workOrders.view",
      "workOrders.create",
      "workOrders.edit",
      "workOrders.delete",
      "workOrders.assign",
      "workOrders.viewOwn",
      "workOrders.editOwn",

      // Projects - Full access
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.delete",

      // Tasks - Full access
      "tasks.view",
      "tasks.create",
      "tasks.edit",
      "tasks.delete",
      "tasks.viewOwn",
      "tasks.editOwn",

      // Clients - Full access
      "clients.view",
      "clients.create",
      "clients.edit",
      "clients.delete",

      // Personnel - Full access
      "personnel.view",
      "personnel.create",
      "personnel.edit",
      "personnel.delete",

      // Calendar - Full access
      "calendar.view",
      "calendar.edit",
      "calendar.viewOwn",
      "calendar.editOwn",

      // Reports - Full access
      "reports.view",
      "reports.export",

      // System Management - Full access
      "roles.manage",
      "statuses.manage",
      "settings.manage",
      "tenant.manage",

      // Admin - Full access
      "admin.access",
    ];
  }

  /**
   * Create a new tenant with admin user (for Google OAuth and other flows)
   */
  static async createTenant(params: {
    companyName: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    subscriptionPlan?: string;
    skipMagicLink?: boolean;
    googleProfile?: {
      id: string;
      picture?: string;
    };
  }): Promise<{
    success: boolean;
    message?: string;
    tenant?: any;
    adminUser?: any;
  }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: params.adminEmail });
      if (existingUser) {
        return {
          success: false,
          message: "User with this email already exists",
        };
      }

      // Generate slug from company name
      const slug = params.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if tenant with this slug exists
      const existingTenant = await Tenant.findOne({ slug });
      if (existingTenant) {
        return {
          success: false,
          message: "Company with this name already exists",
        };
      }

      // Setup tenant with default data
      const tenantData = {
        name: params.companyName,
        slug,
        email: params.adminEmail,
        ownerFirstName: params.adminFirstName,
        ownerLastName: params.adminLastName,
        subscriptionPlan: params.subscriptionPlan || 'free',
      };

      const { tenant, roles, owner } = await this.setupNewTenant(tenantData);

      // Update user with Google profile data if provided
      if (params.googleProfile) {
        await User.findByIdAndUpdate(owner._id, {
          $set: {
            'socialLogins.google': {
              id: params.googleProfile.id,
              email: params.adminEmail,
              picture: params.googleProfile.picture,
              connectedAt: new Date(),
            },
            avatar: params.googleProfile.picture, // Set as main avatar
            isEmailVerified: true, // Google emails are verified
          },
        });
      }

      // Set user as active (skip magic link if requested)
      if (params.skipMagicLink) {
        await User.findByIdAndUpdate(owner._id, {
          $set: {
            isActive: true,
            isEmailVerified: true,
          },
        });
      }

      return {
        success: true,
        tenant,
        adminUser: owner,
      };

    } catch (error) {
      console.error("Error creating tenant:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create tenant",
      };
    }
  }
}
