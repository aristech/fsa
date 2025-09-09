/**
 * Tenant Isolation Middleware and Utilities
 * 
 * This module provides comprehensive tenant data isolation to prevent
 * cross-tenant data access in a multi-tenant application.
 */

import { FastifyRequest } from "fastify";
import { AuthenticatedRequest } from "../types";
import { 
  Task, 
  Personnel, 
  WorkOrder, 
  User, 
  Role, 
  Status, 
  Project, 
  Client, 
  Subtask, 
  Comment,
  Tenant
} from "../models";

/**
 * Safe database query helpers that automatically include tenant isolation
 */
export class TenantSafeQueries {
  
  /**
   * Find a single document by ID with tenant validation
   */
  static async findById<T>(
    Model: any,
    id: string,
    tenantId: string,
    populate?: string | string[]
  ): Promise<T | null> {
    const query = Model.findOne({ _id: id, tenantId });
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(p => query.populate(p));
      } else {
        query.populate(populate);
      }
    }
    return query.lean();
  }

  /**
   * Find multiple documents with tenant validation
   */
  static async find<T>(
    Model: any,
    filter: any,
    tenantId: string,
    options?: {
      populate?: string | string[];
      sort?: any;
      limit?: number;
      skip?: number;
    }
  ): Promise<T[]> {
    const tenantFilter = { ...filter, tenantId };
    const query = Model.find(tenantFilter);
    
    if (options?.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(p => query.populate(p));
      } else {
        query.populate(options.populate);
      }
    }
    
    if (options?.sort) query.sort(options.sort);
    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    
    return query.lean();
  }

  /**
   * Update a single document by ID with tenant validation
   */
  static async findByIdAndUpdate<T>(
    Model: any,
    id: string,
    update: any,
    tenantId: string,
    options?: any
  ): Promise<T | null> {
    return Model.findOneAndUpdate(
      { _id: id, tenantId },
      update,
      { new: true, ...options }
    );
  }

  /**
   * Delete a single document by ID with tenant validation
   */
  static async findByIdAndDelete<T>(
    Model: any,
    id: string,
    tenantId: string
  ): Promise<T | null> {
    return Model.findOneAndDelete({ _id: id, tenantId });
  }

  /**
   * Count documents with tenant validation
   */
  static async count(
    Model: any,
    filter: any,
    tenantId: string
  ): Promise<number> {
    return Model.countDocuments({ ...filter, tenantId });
  }
}

/**
 * Middleware to enforce tenant isolation on all database queries
 */
export function createTenantIsolationGuard() {
  return async (request: FastifyRequest, reply: any, next: any) => {
    const req = request as AuthenticatedRequest;
    
    // Skip if not authenticated or no context
    if (!req.context?.tenant) {
      return next();
    }

    const tenantId = req.context.tenant._id;
    
    // Add tenant-safe query helpers to request context
    req.context.safeQueries = {
      findById: <T>(Model: any, id: string, populate?: string | string[]) => 
        TenantSafeQueries.findById<T>(Model, id, tenantId, populate),
      
      find: <T>(Model: any, filter: any, options?: any) => 
        TenantSafeQueries.find<T>(Model, filter, tenantId, options),
      
      findByIdAndUpdate: <T>(Model: any, id: string, update: any, options?: any) => 
        TenantSafeQueries.findByIdAndUpdate<T>(Model, id, update, tenantId, options),
      
      findByIdAndDelete: <T>(Model: any, id: string) => 
        TenantSafeQueries.findByIdAndDelete<T>(Model, id, tenantId),
      
      count: (Model: any, filter: any) => 
        TenantSafeQueries.count(Model, filter, tenantId),
    };

    next();
  };
}

/**
 * Validation helpers for tenant-specific resources
 */
export class TenantValidation {
  
  /**
   * Validate that a task belongs to the tenant
   */
  static async validateTaskAccess(taskId: string, tenantId: string): Promise<boolean> {
    const task = await Task.findOne({ _id: taskId, tenantId }).lean();
    return !!task;
  }

  /**
   * Validate that a work order belongs to the tenant
   */
  static async validateWorkOrderAccess(workOrderId: string, tenantId: string): Promise<boolean> {
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, tenantId }).lean();
    return !!workOrder;
  }

  /**
   * Validate that personnel belongs to the tenant
   */
  static async validatePersonnelAccess(personnelId: string, tenantId: string): Promise<boolean> {
    const personnel = await Personnel.findOne({ _id: personnelId, tenantId }).lean();
    return !!personnel;
  }

  /**
   * Validate that a user belongs to the tenant
   */
  static async validateUserAccess(userId: string, tenantId: string): Promise<boolean> {
    const user = await User.findOne({ _id: userId, tenantId }).lean();
    return !!user;
  }

  /**
   * Validate that multiple resource IDs belong to the tenant
   */
  static async validateMultipleAccess(
    Model: any,
    ids: string[],
    tenantId: string
  ): Promise<{ valid: string[]; invalid: string[] }> {
    const validResources = await Model.find({ 
      _id: { $in: ids }, 
      tenantId 
    }).select('_id').lean();
    
    const validIds = validResources.map((r: any) => r._id.toString());
    const invalidIds = ids.filter(id => !validIds.includes(id));
    
    return { valid: validIds, invalid: invalidIds };
  }
}

/**
 * File access helpers with tenant isolation
 */
export class TenantFileAccess {
  
  /**
   * Generate tenant-safe file path
   */
  static generateTenantFilePath(
    tenantId: string,
    scope: string,
    ownerId: string,
    filename: string
  ): string {
    return `uploads/${tenantId}/${scope}/${ownerId}/${filename}`;
  }

  /**
   * Validate file access permissions
   */
  static async validateFileAccess(
    filePath: string,
    userTenantId: string
  ): Promise<boolean> {
    // Extract tenant ID from file path
    const pathParts = filePath.split('/');
    if (pathParts.length < 4 || pathParts[0] !== 'uploads') {
      return false;
    }
    
    const filePathTenantId = pathParts[1];
    return filePathTenantId === userTenantId;
  }
}

/**
 * Type extensions for authenticated requests with tenant-safe queries
 */
declare module "../types" {
  interface AuthenticatedRequestContext {
    safeQueries?: {
      findById: <T>(Model: any, id: string, populate?: string | string[]) => Promise<T | null>;
      find: <T>(Model: any, filter: any, options?: any) => Promise<T[]>;
      findByIdAndUpdate: <T>(Model: any, id: string, update: any, options?: any) => Promise<T | null>;
      findByIdAndDelete: <T>(Model: any, id: string) => Promise<T | null>;
      count: (Model: any, filter: any) => Promise<number>;
    };
  }
}

/**
 * Audit function to check for potential tenant isolation issues
 */
export class TenantAudit {
  
  /**
   * Scan codebase for potentially unsafe database queries
   */
  static getUnsafeQueryPatterns(): RegExp[] {
    return [
      /\.findById\(/g,
      /\.findByIdAndUpdate\(/g,
      /\.findByIdAndDelete\(/g,
      /\.findOne\(\{\s*_id:/g, // findOne with only _id
    ];
  }

  /**
   * Log warning for potentially unsafe queries
   */
  static logTenantSecurityWarning(
    operation: string,
    resourceType: string,
    resourceId?: string
  ): void {
    console.warn(`🔒 TENANT SECURITY WARNING: ${operation} on ${resourceType}${resourceId ? ` (${resourceId})` : ''} without explicit tenant validation`);
  }
}
