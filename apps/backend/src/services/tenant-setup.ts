import { Role, Tenant, User } from "../models";

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

      // System Management - Limited
      "statuses.manage",
      "settings.manage",
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

      // Create default roles
      const rolesToCreate = DEFAULT_ROLES.map((roleConfig) => ({
        ...roleConfig,
        tenantId,
        isActive: true,
      }));

      await Role.insertMany(rolesToCreate);
      console.log(
        `✅ Created ${rolesToCreate.length} default roles for tenant ${tenantId}`
      );
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
    ownerId: string;
  }): Promise<{ tenant: any; roles: any[]; owner: any }> {
    try {
      // Create tenant
      const tenant = new Tenant({
        ...tenantData,
        subscription: {
          plan: "free",
          status: "active",
          startDate: new Date(),
        },
        isActive: true,
      });

      await tenant.save();
      console.log(`✅ Created tenant: ${tenant.name}`);

      // Create default roles
      await this.createDefaultRoles(tenant._id.toString());

      // Set the owner as tenant owner with admin privileges
      const owner = await User.findByIdAndUpdate(
        tenantData.ownerId,
        {
          tenantId: tenant._id.toString(),
          isTenantOwner: true,
          role: "admin",
          permissions: this.getAllPermissions(), // Grant all permissions to owner
        },
        { new: true }
      );

      if (!owner) {
        throw new Error("Owner user not found");
      }

      console.log(`✅ Set user ${owner.email} as tenant owner`);

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
}
