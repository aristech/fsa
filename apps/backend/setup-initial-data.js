const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import models
const User = require("./dist/models/User").User;
const Tenant = require("./dist/models/Tenant").Tenant;
const Role = require("./dist/models/Role").Role;
const Status = require("./dist/models/Status").Status;
const Customer = require("./dist/models/Customer").Customer;

async function setupInitialData() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Create default tenant
    console.log("🏢 Creating default tenant...");
    const tenant = await Tenant.findOneAndUpdate(
      { name: "Default Tenant" },
      {
        name: "Default Tenant",
        isActive: true,
        settings: {
          timezone: "UTC",
          currency: "USD",
          dateFormat: "MM/DD/YYYY",
        },
      },
      { upsert: true, new: true }
    );
    console.log("✅ Default tenant created/updated");

    // Create default roles using the new permission structure
    console.log("👥 Creating default roles...");
    const roles = [
      {
        name: "Supervisor",
        slug: "supervisor",
        description:
          "Full permissions on the tenant - can manage all aspects of the system",
        color: "#1976d2",
        isDefault: true,
        isActive: true,
        tenantId: tenant._id,
        permissions: [
          // Work Orders - Full access
          "work_orders.view",
          "work_orders.create",
          "work_orders.edit",
          "work_orders.delete",
          "work_orders.assign",

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
        isActive: true,
        tenantId: tenant._id,
        permissions: [
          // Work Orders - Own only
          "work_orders.view_own",
          "work_orders.edit_own",

          // Tasks - Own only
          "tasks.view_own",
          "tasks.edit_own",

          // Calendar - Own only
          "calendar.view_own",
          "calendar.edit_own",

          // Clients - View only
          "clients.view",

          // Personnel - View only
          "personnel.view",
        ],
      },
    ];

    for (const roleData of roles) {
      await Role.findOneAndUpdate(
        { name: roleData.name, tenantId: tenant._id },
        roleData,
        { upsert: true, new: true }
      );
    }
    console.log("✅ Default roles created/updated");

    // Create default statuses
    console.log("📊 Creating default statuses...");
    const statuses = [
      { name: "Created", color: "#1976d2", isDefault: true },
      { name: "In Progress", color: "#ed6c02" },
      { name: "Completed", color: "#2e7d32" },
      { name: "On Hold", color: "#9c27b0" },
      { name: "Cancelled", color: "#d32f2f" },
    ];

    for (const statusData of statuses) {
      await Status.findOneAndUpdate({ name: statusData.name }, statusData, {
        upsert: true,
        new: true,
      });
    }
    console.log("✅ Default statuses created/updated");

    // Create default admin user
    console.log("👤 Creating default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 12);

    const adminUser = await User.findOneAndUpdate(
      { email: "admin@fsa.com" },
      {
        firstName: "System",
        lastName: "Administrator",
        email: "admin@fsa.com",
        password: hashedPassword,
        role: "admin",
        tenantId: tenant._id.toString(),
        permissions: ["all"],
        isActive: true,
        avatar: "/assets/images/mock/avatar/avatar-1.webp",
      },
      { upsert: true, new: true }
    );
    console.log("✅ Default admin user created/updated");

    // Create sample customer
    console.log("🏢 Creating sample customer...");
    const customer = await Customer.findOneAndUpdate(
      { email: "contact@acmecorp.com" },
      {
        tenantId: tenant._id.toString(),
        name: "ACME Corporation",
        email: "contact@acmecorp.com",
        phone: "+1-555-0123",
        address: {
          street: "123 Business Ave",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          country: "USA",
        },
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log("✅ Sample customer created/updated");

    console.log("\n🎉 Initial data setup completed successfully!");
    console.log("\n📋 Default credentials:");
    console.log("   Email: admin@fsa.com");
    console.log("   Password: admin123");
    console.log("\n🌐 You can now start the application:");
    console.log("   Backend: http://localhost:3001");
    console.log("   Frontend: http://localhost:3000");
  } catch (error) {
    console.error("❌ Error setting up initial data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

setupInitialData();
