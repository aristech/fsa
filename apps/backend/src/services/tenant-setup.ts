import { Role, Tenant, User, Status } from "../models";

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

      // Create default statuses
      await this.createDefaultStatuses(tenant._id.toString());

      // Generate a secure temporary password (will be changed during activation)
      const crypto = require('crypto');
      const tempPassword = crypto.randomBytes(16).toString('hex');

      // Create tenant owner user with admin privileges (inactive until activation)
      const owner = new User({
        email: tenantData.email,
        firstName: tenantData.name.split(' ')[0] || tenantData.name,
        lastName: tenantData.name.split(' ').slice(1).join(' ') || '',
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

      // Update tenant with owner ID
      tenant.ownerId = owner._id.toString();
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
