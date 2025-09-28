/**
 * Standardized error message keys for internationalization
 * These keys correspond to frontend translation files
 */

// Authentication & Authorization Messages
export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'auth.invalid_credentials',
  NO_TOKEN_PROVIDED: 'auth.no_token_provided',
  INVALID_TOKEN: 'auth.invalid_token',
  USER_NOT_FOUND: 'auth.user_not_found',
  AUTHENTICATION_FAILED: 'auth.authentication_failed',
  AUTHENTICATION_REQUIRED: 'auth.authentication_required',
  ACCOUNT_INACTIVE: 'auth.account_inactive',
  TENANT_INACTIVE: 'auth.tenant_inactive',
  LOGOUT_SUCCESS: 'auth.logout_success',
  USER_VERIFIED: 'auth.user_verified',
  MAGIC_LINK_VALID: 'auth.magic_link_valid',
  ACCOUNT_SETUP_COMPLETE: 'auth.account_setup_complete',
} as const;

// Permission & Access Messages
export const PERMISSION_MESSAGES = {
  INSUFFICIENT_PERMISSIONS: 'permissions.insufficient_permissions',
  ROLE_NOT_FOUND: 'permissions.role_not_found',
  ACCESS_DENIED: 'permissions.access_denied',
  OWN_RESOURCE_ONLY: 'permissions.own_resource_only',
  SUPERUSER_ONLY: 'permissions.superuser_only',
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  GENERAL_ERROR: 'validation.general_error',
  PASSWORD_REQUIREMENTS: 'validation.password_requirements',
  PASSWORDS_DONT_MATCH: 'validation.passwords_dont_match',
  EMAIL_REQUIRED: 'validation.email_required',
  NAME_REQUIRED: 'validation.name_required',
  FIELD_REQUIRED: 'validation.field_required',
  FIELD_TOO_LONG: 'validation.field_too_long',
  POSITIVE_NUMBER_REQUIRED: 'validation.positive_number_required',
} as const;

// Business Logic Messages
export const BUSINESS_MESSAGES = {
  USER_ALREADY_EXISTS: 'business.user_already_exists',
  DIRECT_SIGNUP_DISABLED: 'business.direct_signup_disabled',
  MAGIC_LINK_INVALID: 'business.magic_link_invalid',
  MAGIC_LINK_EXPIRED: 'business.magic_link_expired',
  DUPLICATE_SKU: 'business.duplicate_sku',
  DUPLICATE_BARCODE: 'business.duplicate_barcode',
  DUPLICATE_EMPLOYEE_ID: 'business.duplicate_employee_id',
  ALREADY_CHECKED_IN: 'business.already_checked_in',
  NO_ACTIVE_SESSION: 'business.no_active_session',
  ASSIGNMENT_REQUIRED: 'business.assignment_required',
  CANNOT_DELETE_DEFAULT: 'business.cannot_delete_default',
  TENANT_SLUG_EXISTS: 'business.tenant_slug_exists',

  // Subscription & Billing Messages
  INVALID_TENANT: 'business.invalid_tenant',
  SUBSCRIPTION_INACTIVE: 'business.subscription_inactive',
  TRIAL_EXPIRED: 'business.trial_expired',
  SUBSCRIPTION_LIMIT_EXCEEDED: 'business.subscription_limit_exceeded',
  FEATURE_NOT_AVAILABLE: 'business.feature_not_available',
  SUBSCRIPTION_ERROR: 'business.subscription_error',
} as const;

// Resource Not Found Messages
export const NOT_FOUND_MESSAGES = {
  TENANT_NOT_FOUND: 'not_found.tenant',
  ROLE_NOT_FOUND: 'not_found.role',
  MATERIAL_NOT_FOUND: 'not_found.material',
  PERSONNEL_NOT_FOUND: 'not_found.personnel',
  TASK_NOT_FOUND: 'not_found.task',
  WORK_ORDER_NOT_FOUND: 'not_found.work_order',
  USER_NOT_FOUND: 'not_found.user',
  SESSION_NOT_FOUND: 'not_found.session',
  RESOURCE_NOT_FOUND: 'not_found.resource',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  // CRUD Operations
  CREATED: 'success.created',
  UPDATED: 'success.updated',
  DELETED: 'success.deleted',
  FETCHED: 'success.fetched',

  // Specific Operations
  TENANT_REGISTRATION: 'success.tenant_registration',
  TENANT_CREATED: 'success.tenant_created',
  SETUP_COMPLETED: 'success.setup_completed',
  TIME_ENTRY_LOGGED: 'success.time_entry_logged',
  CHECKED_IN: 'success.checked_in',
  CHECKED_OUT: 'success.checked_out',
  HEARTBEAT_RECORDED: 'success.heartbeat_recorded',
  EMERGENCY_CHECKOUT: 'success.emergency_checkout',
  PROFILE_UPDATED: 'success.profile_updated',

  // Task/Kanban Operations
  TASK_MOVED: 'success.task_moved',
  COLUMN_RENAMED: 'success.column_renamed',
  COLUMNS_REORDERED: 'success.columns_reordered',
  COLUMN_CREATED: 'success.column_created',
  COLUMN_DELETED: 'success.column_deleted',
} as const;

// Server Error Messages
export const SERVER_MESSAGES = {
  INTERNAL_ERROR: 'server.internal_error',
  DATABASE_ERROR: 'server.database_error',
  PERMISSION_CHECK_FAILED: 'server.permission_check_failed',
  SERVICE_UNAVAILABLE: 'server.service_unavailable',
  CONFIGURATION_ERROR: 'server.configuration_error',
} as const;

// System Status Messages
export const SYSTEM_MESSAGES = {
  EMAIL_SERVICE_HEALTHY: 'system.email_service_healthy',
  SERVICE_HEALTHY: 'system.service_healthy',
} as const;

// All message constants for easy export
export const ERROR_MESSAGES = {
  AUTH: AUTH_MESSAGES,
  PERMISSION: PERMISSION_MESSAGES,
  VALIDATION: VALIDATION_MESSAGES,
  BUSINESS: BUSINESS_MESSAGES,
  NOT_FOUND: NOT_FOUND_MESSAGES,
  SUCCESS: SUCCESS_MESSAGES,
  SERVER: SERVER_MESSAGES,
  SYSTEM: SYSTEM_MESSAGES,
} as const;

// Type definitions for better TypeScript support
export type AuthMessageKey = typeof AUTH_MESSAGES[keyof typeof AUTH_MESSAGES];
export type PermissionMessageKey = typeof PERMISSION_MESSAGES[keyof typeof PERMISSION_MESSAGES];
export type ValidationMessageKey = typeof VALIDATION_MESSAGES[keyof typeof VALIDATION_MESSAGES];
export type BusinessMessageKey = typeof BUSINESS_MESSAGES[keyof typeof BUSINESS_MESSAGES];
export type NotFoundMessageKey = typeof NOT_FOUND_MESSAGES[keyof typeof NOT_FOUND_MESSAGES];
export type SuccessMessageKey = typeof SUCCESS_MESSAGES[keyof typeof SUCCESS_MESSAGES];
export type ServerMessageKey = typeof SERVER_MESSAGES[keyof typeof SERVER_MESSAGES];
export type SystemMessageKey = typeof SYSTEM_MESSAGES[keyof typeof SYSTEM_MESSAGES];

export type MessageKey =
  | AuthMessageKey
  | PermissionMessageKey
  | ValidationMessageKey
  | BusinessMessageKey
  | NotFoundMessageKey
  | SuccessMessageKey
  | ServerMessageKey
  | SystemMessageKey;