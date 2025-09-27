/**
 * Network Connectivity Utilities
 *
 * Functional approach for detecting network connectivity status
 * and handling online/offline scenarios using axios.
 */

import { useState, useEffect, useCallback } from 'react';

import axiosInstance from './axios';

// ----------------------------------------------------------------------

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  lastChecked: number;
  connectionType?: string;
}

// ----------------------------------------------------------------------

// Global state for network status
let networkState: NetworkStatus = {
  isOnline: navigator.onLine,
  isSlowConnection: false,
  lastChecked: Date.now(),
  connectionType: undefined,
};

// Set of listeners for network status changes
const listeners = new Set<(status: NetworkStatus) => void>();

// Monitoring interval reference
let monitoringInterval: NodeJS.Timeout | null = null;

// ----------------------------------------------------------------------

/**
 * Detect connection type using Network Information API
 */
const detectConnectionType = (): string | undefined => {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  return connection?.effectiveType || connection?.type;
};

/**
 * Check if connection is slow based on Network Information API
 */
const isConnectionSlowByType = (): boolean => {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) return false;

  const slowTypes = ['slow-2g', '2g'];
  return slowTypes.includes(connection.effectiveType) || connection.downlink < 1.5;
};

/**
 * Notify all listeners of network status changes
 */
const notifyListeners = (): void => {
  listeners.forEach((listener) => {
    try {
      listener(networkState);
    } catch (error) {
      console.error('Error in network status listener:', error);
    }
  });
};

/**
 * Update network status and notify listeners
 */
const updateNetworkStatus = (updates: Partial<NetworkStatus>): void => {
  networkState = {
    ...networkState,
    ...updates,
    lastChecked: Date.now(),
  };
  notifyListeners();
};

/**
 * Handle online event
 */
const handleOnline = (): void => {
  updateNetworkStatus({
    isOnline: true,
    connectionType: detectConnectionType(),
  });
  console.log('🌐 Network connection restored');
};

/**
 * Handle offline event
 */
const handleOffline = (): void => {
  updateNetworkStatus({
    isOnline: false,
  });
  console.log('📴 Network connection lost');
};

/**
 * Check connection quality using axios health check
 */
const checkConnectionQuality = async (): Promise<void> => {
  if (!networkState.isOnline) return;

  try {
    const startTime = Date.now();

    // Use axios for health check with timeout
    await axiosInstance.head('/api/v1/health', {
      timeout: 5000,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Consider response time > 3 seconds or connection type as slow
    const isSlowByResponse = responseTime > 3000;
    const isSlowByConnection = isConnectionSlowByType();

    updateNetworkStatus({
      isOnline: true,
      isSlowConnection: isSlowByResponse || isSlowByConnection,
      connectionType: detectConnectionType(),
    });
  } catch (error) {
    // Network error - consider offline
    console.error('Network connectivity check failed:', error);
    updateNetworkStatus({
      isOnline: false,
    });
  }
};

/**
 * Start monitoring network connection quality
 */
const startNetworkMonitoring = (): void => {
  if (monitoringInterval) return;

  // Initial connection type detection
  updateNetworkStatus({
    connectionType: detectConnectionType(),
    isSlowConnection: isConnectionSlowByType(),
  });

  // Check connection quality every 30 seconds
  monitoringInterval = setInterval(checkConnectionQuality, 30000);
};

/**
 * Stop monitoring network connection
 */
const stopNetworkMonitoring = (): void => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
};

/**
 * Initialize network monitoring
 */
const initializeNetworkMonitoring = (): (() => void) => {
  // Add event listeners for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Start monitoring
  startNetworkMonitoring();

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    stopNetworkMonitoring();
    listeners.clear();
  };
};

// ----------------------------------------------------------------------

/**
 * Get current network status
 */
export const getNetworkStatus = (): NetworkStatus => ({ ...networkState });

/**
 * Add a listener for network status changes
 */
export const addNetworkStatusListener = (
  listener: (status: NetworkStatus) => void
): (() => void) => {
  listeners.add(listener);

  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Check if we should attempt server operations
 */
export const shouldAttemptServerOperation = (): boolean =>
  networkState.isOnline && !networkState.isSlowConnection;

/**
 * Check if we should save locally as fallback
 */
export const shouldSaveLocally = (): boolean =>
  !networkState.isOnline || networkState.isSlowConnection;

/**
 * Check if currently online
 */
export const isOnline = (): boolean => networkState.isOnline;

/**
 * Check if connection is slow
 */
export const isSlowConnection = (): boolean => networkState.isSlowConnection;

/**
 * Force a connection quality check
 */
export const forceNetworkCheck = async (): Promise<NetworkStatus> => {
  await checkConnectionQuality();
  return getNetworkStatus();
};

// ----------------------------------------------------------------------

/**
 * React hook for network status monitoring
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(getNetworkStatus);

  useEffect(() => {
    // Initialize monitoring on first use
    const cleanup = initializeNetworkMonitoring();

    // Subscribe to status changes
    const unsubscribe = addNetworkStatusListener(setStatus);

    // Set initial status
    setStatus(getNetworkStatus());

    return () => {
      unsubscribe();
      cleanup();
    };
  }, []);

  const forceCheck = useCallback(async () => {
    const newStatus = await forceNetworkCheck();
    setStatus(newStatus);
    return newStatus;
  }, []);

  return {
    ...status,
    forceCheck,
    shouldAttemptServerOperation: shouldAttemptServerOperation(),
    shouldSaveLocally: shouldSaveLocally(),
  };
};
