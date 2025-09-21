/**
 * Network Connectivity Utilities
 *
 * Provides functionality to detect network connectivity status
 * and handle online/offline scenarios.
 */

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  lastChecked: number;
  connectionType?: string;
}

class NetworkManager {
  private isOnline: boolean = navigator.onLine;
  private isSlowConnection: boolean = false;
  private lastChecked: number = Date.now();
  private connectionType?: string;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Detect connection type if available
    this.detectConnectionType();

    // Periodically check connection quality
    this.startConnectionMonitoring();
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    this.lastChecked = Date.now();
    this.notifyListeners();
    console.log('🌐 Network connection restored');
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.lastChecked = Date.now();
    this.notifyListeners();
    console.log('📴 Network connection lost');
  };

  private detectConnectionType(): void {
    // Check for Network Information API
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      this.connectionType = connection.effectiveType || connection.type;
      this.isSlowConnection = this.isConnectionSlow(connection);
    }
  }

  private isConnectionSlow(connection: any): boolean {
    // Consider 2g and slow-2g as slow connections
    const slowTypes = ['slow-2g', '2g'];
    return slowTypes.includes(connection.effectiveType) || connection.downlink < 1.5; // Less than 1.5 Mbps
  }

  private startConnectionMonitoring(): void {
    // Check connection every 30 seconds
    setInterval(() => {
      this.checkConnectionQuality();
    }, 30000);
  }

  private async checkConnectionQuality(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Simple connectivity test
      const startTime = Date.now();
      const response = await fetch('/api/v1/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Consider response time > 3 seconds as slow
      this.isSlowConnection = responseTime > 3000;
      this.lastChecked = Date.now();

      if (!response.ok) {
        this.isOnline = false;
      }

      this.notifyListeners();
    } catch (error) {
      // Network error - consider offline
      console.error('Network error:', error);
      this.isOnline = false;
      this.lastChecked = Date.now();
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    const status: NetworkStatus = {
      isOnline: this.isOnline,
      isSlowConnection: this.isSlowConnection,
      lastChecked: this.lastChecked,
      connectionType: this.connectionType,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return {
      isOnline: this.isOnline,
      isSlowConnection: this.isSlowConnection,
      lastChecked: this.lastChecked,
      connectionType: this.connectionType,
    };
  }

  /**
   * Add a listener for network status changes
   */
  addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if we should attempt server operations
   */
  shouldAttemptServerOperation(): boolean {
    return this.isOnline && !this.isSlowConnection;
  }

  /**
   * Check if we should save locally as fallback
   */
  shouldSaveLocally(): boolean {
    return !this.isOnline || this.isSlowConnection;
  }

  /**
   * Force a connection check
   */
  async forceCheck(): Promise<NetworkStatus> {
    await this.checkConnectionQuality();
    return this.getStatus();
  }

  /**
   * Cleanup listeners
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

// Export singleton instance
export const networkManager = new NetworkManager();

// Export utility functions
export const isOnline = (): boolean => networkManager.getStatus().isOnline;
export const isSlowConnection = (): boolean => networkManager.getStatus().isSlowConnection;
export const shouldSaveLocally = (): boolean => networkManager.shouldSaveLocally();
export const shouldAttemptServerOperation = (): boolean =>
  networkManager.shouldAttemptServerOperation();

// React hook for network status
export const useNetworkStatus = () => {
  const [status, setStatus] = React.useState<NetworkStatus>(networkManager.getStatus());

  React.useEffect(() => {
    const unsubscribe = networkManager.addListener(setStatus);
    return unsubscribe;
  }, []);

  return status;
};

// Import React for the hook
import React from 'react';
