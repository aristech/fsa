/**
 * Offline Storage Utility for Draft Reports
 *
 * Provides functionality to save, retrieve, and manage draft reports
 * when the user is offline or specifically requests local saving.
 */

export interface OfflineDraftReport {
  id: string;
  data: any;
  timestamp: number;
  status: 'draft' | 'pending_sync';
  metadata: {
    userId: string;
    userEmail: string;
    deviceInfo: string;
    version: string;
  };
}

export interface OfflineStorageStats {
  totalDrafts: number;
  pendingSync: number;
  lastSyncAttempt: number | null;
}

class OfflineStorageManager {
  private readonly STORAGE_KEY = 'fsa_offline_drafts';
  private readonly MAX_DRAFTS = 50; // Limit to prevent storage bloat
  private readonly DRAFT_EXPIRY_DAYS = 30; // Auto-cleanup old drafts

  /**
   * Save a draft report to local storage
   */
  saveDraft(reportData: any, userId: string, userEmail: string): string {
    const draftId = this.generateDraftId();
    const timestamp = Date.now();

    const draft: OfflineDraftReport = {
      id: draftId,
      data: reportData,
      timestamp,
      status: 'pending_sync',
      metadata: {
        userId,
        userEmail,
        deviceInfo: this.getDeviceInfo(),
        version: '1.0.0',
      },
    };

    try {
      const existingDrafts = this.getAllDrafts();

      // Add new draft
      existingDrafts.push(draft);

      // Sort by timestamp (newest first) and limit
      const sortedDrafts = existingDrafts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.MAX_DRAFTS);

      // Clean up expired drafts
      const validDrafts = this.cleanupExpiredDrafts(sortedDrafts);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validDrafts));

      console.log(`📱 Draft saved offline: ${draftId}`);
      return draftId;
    } catch (error) {
      console.error('Failed to save draft to local storage:', error);
      throw new Error('Failed to save draft locally. Storage may be full.');
    }
  }

  /**
   * Get all offline drafts
   */
  getAllDrafts(): OfflineDraftReport[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const drafts = JSON.parse(stored);
      return Array.isArray(drafts) ? drafts : [];
    } catch (error) {
      console.error('Failed to retrieve drafts from local storage:', error);
      return [];
    }
  }

  /**
   * Get a specific draft by ID
   */
  getDraft(draftId: string): OfflineDraftReport | null {
    const drafts = this.getAllDrafts();
    return drafts.find((draft) => draft.id === draftId) || null;
  }

  /**
   * Remove a draft from local storage
   */
  removeDraft(draftId: string): boolean {
    try {
      const drafts = this.getAllDrafts();
      const filteredDrafts = drafts.filter((draft) => draft.id !== draftId);

      if (filteredDrafts.length === drafts.length) {
        return false; // Draft not found
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredDrafts));
      console.log(`🗑️ Draft removed from offline storage: ${draftId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove draft from local storage:', error);
      return false;
    }
  }

  /**
   * Update draft status (e.g., mark as synced)
   */
  updateDraftStatus(draftId: string, status: OfflineDraftReport['status']): boolean {
    try {
      const drafts = this.getAllDrafts();
      const draftIndex = drafts.findIndex((draft) => draft.id === draftId);

      if (draftIndex === -1) {
        return false; // Draft not found
      }

      drafts[draftIndex].status = status;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drafts));
      return true;
    } catch (error) {
      console.error('Failed to update draft status:', error);
      return false;
    }
  }

  /**
   * Get drafts that need to be synced
   */
  getPendingSyncDrafts(): OfflineDraftReport[] {
    const drafts = this.getAllDrafts();
    return drafts.filter((draft) => draft.status === 'pending_sync');
  }

  /**
   * Get storage statistics
   */
  getStats(): OfflineStorageStats {
    const drafts = this.getAllDrafts();
    const pendingSync = drafts.filter((draft) => draft.status === 'pending_sync').length;

    return {
      totalDrafts: drafts.length,
      pendingSync,
      lastSyncAttempt: this.getLastSyncAttempt(),
    };
  }

  /**
   * Clear all offline drafts (use with caution)
   */
  clearAllDrafts(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 All offline drafts cleared');
    } catch (error) {
      console.error('Failed to clear offline drafts:', error);
    }
  }

  /**
   * Check if local storage is available and has space
   */
  isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: boolean } {
    try {
      let used = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          used += localStorage[key].length;
        }
      }
      return { used, available: this.isStorageAvailable() };
    } catch {
      return { used: 0, available: false };
    }
  }

  // Private helper methods

  private generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo(): string {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    return `${platform} - ${userAgent.split(' ')[0]}`;
  }

  private cleanupExpiredDrafts(drafts: OfflineDraftReport[]): OfflineDraftReport[] {
    const expiryTime = Date.now() - this.DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return drafts.filter((draft) => draft.timestamp > expiryTime);
  }

  private getLastSyncAttempt(): number | null {
    try {
      const lastSync = localStorage.getItem('fsa_last_sync_attempt');
      return lastSync ? parseInt(lastSync, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Update last sync attempt timestamp
   */
  updateLastSyncAttempt(): void {
    try {
      localStorage.setItem('fsa_last_sync_attempt', Date.now().toString());
    } catch (error) {
      console.error('Failed to update last sync attempt:', error);
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();

// Export utility functions
export const formatDraftDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const getDraftAge = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};
