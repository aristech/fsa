#!/usr/bin/env node

/**
 * Script to update existing personnel records to populate employeeId with user's full name
 * Run this once to update existing data
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: "./apps/backend/.env" });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/fsa",
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

// User Schema
const UserSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
  },
  { collection: "users" },
);

// Personnel Schema
const PersonnelSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    employeeId: String,
    tenantId: mongoose.Schema.Types.ObjectId,
  },
  { collection: "personnels" },
);

const User = mongoose.model("User", UserSchema);
const Personnel = mongoose.model("Personnel", PersonnelSchema);

async function updatePersonnelNames() {
  try {
    console.log("🔄 Starting personnel name update...");

    // Get all personnel records
    const personnelRecords = await Personnel.find({}).populate(
      "userId",
      "firstName lastName",
    );

    console.log(`📊 Found ${personnelRecords.length} personnel records`);

    let updatedCount = 0;

    for (const personnel of personnelRecords) {
      if (personnel.userId) {
        const user = personnel.userId;
        const fullName = `${user.firstName} ${user.lastName}`.trim();

        // Update the employeeId with the full name
        await Personnel.findByIdAndUpdate(personnel._id, {
          employeeId: fullName,
        });

        console.log(`✅ Updated: ${personnel._id} -> "${fullName}"`);
        updatedCount++;
      } else {
        console.log(`⚠️  Skipped: ${personnel._id} (no user data)`);
      }
    }

    console.log(`🎉 Update complete! Updated ${updatedCount} records`);
  } catch (error) {
    console.error("❌ Error updating personnel names:", error);
  }
}

async function main() {
  await connectDB();
  await updatePersonnelNames();
  await mongoose.disconnect();
  console.log("👋 Disconnected from MongoDB");
}

main().catch(console.error);
