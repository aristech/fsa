# Role Management & Personnel Assignment

## Overview

This document outlines the role management system and how to prevent future issues with personnel role assignments.

## Current System

### Role Structure
- **Roles** are tenant-specific and contain:
  - `name`: Role name (e.g., "Sales", "Technician", "Supervisor")
  - `tenantId`: Links role to specific tenant
  - `isDefault`: Whether this is a default role
  - `isActive`: Whether the role is currently active
  - `permissions`: Array of permission strings

### Personnel Structure
- **Personnel** records contain:
  - `roleId`: Reference to a Role document
  - `tenantId`: Links personnel to specific tenant
  - `userId`: Reference to User document
  - Other fields (skills, certifications, etc.)

## Potential Issues & Solutions

### 1. Role ID Mismatch (FIXED ✅)

**Problem:** When roles are recreated, existing personnel have stale role references.

**Solution Implemented:**
- Added `fix-role-consistency.ts` script
- Automatically maps old roles to new roles by name
- Assigns random roles if no mapping found
- Integrated into setup process

**Usage:**
```bash
npx tsx src/scripts/fix-role-consistency.ts
```

### 2. Personnel Without Roles (FIXED ✅)

**Problem:** Personnel can be created without role assignments.

**Solution Implemented:**
- Enhanced personnel API to auto-assign default role if none provided
- Added validation to ensure roles are active before assignment
- Added role consistency check in setup process

### 3. Role Deletion Protection (EXISTS ✅)

**Problem:** Deleting roles that are in use breaks personnel filtering.

**Solution:** Already implemented in roles API:
- Prevents deletion of default roles
- Prevents deletion of roles with assigned personnel
- Shows count of affected personnel

### 4. Tenant Isolation (EXISTS ✅)

**Problem:** Roles from different tenants could be mixed up.

**Solution:** Already implemented:
- All role operations validate tenant ownership
- Personnel API validates role belongs to same tenant

## Best Practices

### For Developers

1. **Always run role consistency check after role changes:**
   ```bash
   npx tsx src/scripts/fix-role-consistency.ts
   ```

2. **When creating personnel, always provide a roleId:**
   ```typescript
   const personnel = await Personnel.create({
     // ... other fields
     roleId: selectedRole._id, // Always provide this
   });
   ```

3. **When updating roles, consider impact on existing personnel:**
   - Use role updates instead of deletion + recreation
   - Run consistency check after bulk role changes

### For Administrators

1. **Before deleting roles:**
   - Check how many personnel are assigned
   - Reassign personnel to other roles first
   - Use the API's built-in validation

2. **After role changes:**
   - Run the consistency check script
   - Verify personnel filtering still works

3. **Monitor role assignments:**
   - Regular audits of personnel without roles
   - Check for orphaned role references

## API Enhancements

### Personnel API Improvements

1. **Auto-assignment of default roles:**
   ```typescript
   // If no roleId provided, assigns default role
   if (!validatedData.roleId) {
     const defaultRole = await Role.findOne({
       tenantId,
       isDefault: true,
       isActive: true
     });
     if (defaultRole) {
       validatedData.roleId = defaultRole._id.toString();
     }
   }
   ```

2. **Enhanced role validation:**
   ```typescript
   // Validates role exists, belongs to tenant, and is active
   if (validatedData.roleId) {
     const role = await Role.findById(validatedData.roleId);
     if (!role || !role.isActive || role.tenantId !== tenantId) {
       return error;
     }
   }
   ```

### Role API Improvements

1. **Deletion protection:**
   - Prevents deletion of default roles
   - Prevents deletion of roles with assigned personnel
   - Shows helpful error messages

2. **Tenant isolation:**
   - All operations validate tenant ownership
   - Prevents cross-tenant role access

## Monitoring & Maintenance

### Regular Checks

1. **Run consistency check monthly:**
   ```bash
   npx tsx src/scripts/fix-role-consistency.ts
   ```

2. **Monitor for personnel without roles:**
   ```typescript
   const personnelWithoutRoles = await Personnel.countDocuments({
     tenantId,
     $or: [
       { roleId: { $exists: false } },
       { roleId: null }
     ]
   });
   ```

3. **Check role distribution:**
   ```typescript
   const roleDistribution = await Personnel.aggregate([
     { $match: { tenantId } },
     { $group: { _id: '$roleId', count: { $sum: 1 } } },
     { $lookup: { from: 'roles', localField: '_id', foreignField: '_id', as: 'role' } },
     { $unwind: '$role' },
     { $project: { roleName: '$role.name', count: 1 } }
   ]);
   ```

## Troubleshooting

### Common Issues

1. **Personnel filtering returns 0 results:**
   - Check if personnel have valid role assignments
   - Run role consistency check
   - Verify role IDs match between personnel and roles

2. **Role deletion fails:**
   - Check if role is default (cannot delete)
   - Check if personnel are assigned to role
   - Reassign personnel first, then delete role

3. **Personnel created without roles:**
   - Check if default roles exist
   - Verify role assignment logic in API
   - Run consistency check to fix existing records

### Debug Commands

```bash
# Check role consistency
npx tsx src/scripts/fix-role-consistency.ts

# Check personnel role assignments
npx tsx -e "
import { connectDB } from 'src/lib/db';
import { Personnel, Role, Tenant } from 'src/lib/models';

connectDB().then(async () => {
  const tenant = await Tenant.findOne({ slug: 'fsa-demo' });
  const personnel = await Personnel.find({ tenantId: tenant._id }).populate('roleId', 'name');
  console.log('Personnel with roles:', personnel.filter(p => p.roleId).length);
  console.log('Personnel without roles:', personnel.filter(p => !p.roleId).length);
  process.exit(0);
});
"
```

## Future Improvements

1. **Role versioning:** Track role changes over time
2. **Bulk role updates:** Update multiple personnel roles at once
3. **Role templates:** Predefined role sets for different industries
4. **Role inheritance:** Hierarchical role structures
5. **Audit logging:** Track all role and personnel changes

## Conclusion

The role management system is now robust and includes:
- ✅ Automatic role consistency checking
- ✅ Default role assignment for new personnel
- ✅ Role deletion protection
- ✅ Tenant isolation
- ✅ Comprehensive validation
- ✅ Monitoring and maintenance tools

This should prevent the role assignment issues that occurred previously and provide a solid foundation for future role management needs.
