/*
 * Test Enhanced Toast System
 *
 * This file demonstrates the enhanced toast system with various server response formats.
 * Run this in a React component to test the functionality.
 */

// Remove unused import

import { EnhancedToast } from 'src/utils/enhanced-toast';

// Mock translation function for testing
const mockTranslationFunction = (key: string) => {
  const translations: Record<string, string> = {
    'common.error.generic': 'An error occurred',
    'common.success.generic': 'Operation completed successfully',
    'business.subscription_limit_exceeded': 'Subscription limit exceeded',
    'business.user_limit_exceeded': 'User limit exceeded. Current: {{current}}, Limit: {{limit}}',
    'validation.error.generic': 'Validation failed',
    'errors.network': 'Network error occurred',
  };

  return translations[key] || key;
};

// Initialize the enhanced toast for testing
EnhancedToast.initialize(mockTranslationFunction as any);

// Test data - server responses in various formats
export const testServerResponses = {

  // Test Case 1: Server message takes priority over messageKey
  subscriptionLimit: {
    success: false,
    message: 'User limit exceeded. Current: 2, Limit: 2',
    messageKey: 'business.subscription_limit_exceeded'
  },

  // Test Case 2: Only messageKey provided - should be translated
  storageLimit: {
    success: false,
    messageKey: 'business.subscription_limit_exceeded'
  },

  // Test Case 3: Only server message provided
  validationError: {
    success: false,
    message: 'Name and email are required when userId is not provided'
  },

  // Test Case 4: Success with both message and messageKey
  personnelCreated: {
    success: true,
    message: 'Personnel created successfully',
    messageKey: 'common.success.created'
  },

  // Test Case 5: Success with only messageKey
  dataUpdated: {
    success: true,
    messageKey: 'common.success.updated'
  },

  // Test Case 6: Validation error with details
  validationWithDetails: {
    success: false,
    message: 'Personnel creation validation failed',
    messageKey: 'validation.error.generic',
    details: [
      { field: 'email', message: 'Invalid email format' },
      { field: 'hourlyRate', message: 'Must be a positive number' }
    ]
  },

  // Test Case 7: Error response with error field (legacy API)
  legacyError: {
    success: false,
    error: 'Database connection timeout',
    messageKey: 'errors.server'
  },

  // Test Case 8: No message or messageKey - should use fallback
  emptyError: {
    success: false
  },

  // Test Case 9: Non-existent messageKey - should use fallback
  unknownKey: {
    success: false,
    messageKey: 'non.existent.key'
  },

  // Test Case 10: String response
  stringMessage: 'Simple string message'
};

// Test functions
export const runEnhancedToastTests = () => {
  console.log('🧪 Starting Enhanced Toast Tests...\n');

  console.log('Test 1: Server message priority');
  console.log('Expected: "User limit exceeded. Current: 2, Limit: 2"');
  EnhancedToast.error(testServerResponses.subscriptionLimit);

  setTimeout(() => {
    console.log('\nTest 2: messageKey translation');
    console.log('Expected: "Subscription limit exceeded"');
    EnhancedToast.error(testServerResponses.storageLimit);
  }, 1000);

  setTimeout(() => {
    console.log('\nTest 3: Server message only');
    console.log('Expected: "Name and email are required when userId is not provided"');
    EnhancedToast.error(testServerResponses.validationError);
  }, 2000);

  setTimeout(() => {
    console.log('\nTest 4: Success with server message priority');
    console.log('Expected: "Personnel created successfully"');
    EnhancedToast.success(testServerResponses.personnelCreated);
  }, 3000);

  setTimeout(() => {
    console.log('\nTest 5: Success with messageKey translation');
    console.log('Expected: "common.success.updated" (key since no translation exists)');
    EnhancedToast.success(testServerResponses.dataUpdated);
  }, 4000);

  setTimeout(() => {
    console.log('\nTest 6: Validation error with details');
    console.log('Expected: Structured validation error display');
    EnhancedToast.validationError(testServerResponses.validationWithDetails);
  }, 5000);

  setTimeout(() => {
    console.log('\nTest 7: Legacy error field');
    console.log('Expected: "Database connection timeout"');
    EnhancedToast.error(testServerResponses.legacyError);
  }, 6000);

  setTimeout(() => {
    console.log('\nTest 8: Fallback handling');
    console.log('Expected: "Something went wrong" (fallback)');
    EnhancedToast.error(testServerResponses.emptyError, 'Something went wrong');
  }, 7000);

  setTimeout(() => {
    console.log('\nTest 9: Unknown messageKey fallback');
    console.log('Expected: "Unknown error occurred" (fallback)');
    EnhancedToast.error(testServerResponses.unknownKey, 'Unknown error occurred');
  }, 8000);

  setTimeout(() => {
    console.log('\nTest 10: String message');
    console.log('Expected: "Simple string message"');
    EnhancedToast.info(testServerResponses.stringMessage);
  }, 9000);

  setTimeout(() => {
    console.log('\n✅ All Enhanced Toast Tests Completed!');
    console.log('\nCheck the toast notifications and browser console for results.');
  }, 10000);
};

// Example usage in a React component
export const exampleUsageInComponent = `
// In your React component:

import { useEnhancedToast } from 'src/hooks/useEnhancedToast';

export function MyComponent() {
  const { handleApiResponse, success, error } = useEnhancedToast();

  const handleCreatePersonnel = async (data) => {
    try {
      const response = await personnelApi.create(data);

      // ✅ Enhanced way - handles all response formats automatically
      handleApiResponse(response, {
        successFallback: 'Personnel created successfully',
        errorFallback: 'Failed to create personnel'
      });

      /*
      Server can respond with any of these formats:

      Success with messageKey:
      {
        success: true,
        message: "Personnel John Doe created",
        messageKey: "personnel.created"
      }

      Error with validation:
      {
        success: false,
        message: "Validation failed",
        messageKey: "validation.error.generic",
        details: [
          { field: "email", message: "Invalid format" }
        ]
      }

      Subscription limit:
      {
        success: false,
        message: "User limit exceeded. Current: 2, Limit: 2",
        messageKey: "business.user_limit_exceeded"
      }

      All will be handled appropriately!
      */

    } catch (error) {
      // ✅ Network error handling
      handleNetworkError(error, 'Failed to create personnel');
    }
  };

  return (
    <Button onClick={handleCreatePersonnel}>
      Create Personnel
    </Button>
  );
}
`;

// Console output for testing
if (typeof window !== 'undefined') {
  console.log('Enhanced Toast Test Suite Available');
  console.log('Run runEnhancedToastTests() to test the system');
  console.log('Example usage:', exampleUsageInComponent);
}