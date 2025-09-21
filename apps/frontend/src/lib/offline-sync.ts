/**
 * Offline Sync Service
 *
 * Handles synchronization of offline drafts when network connection is restored.
 */

import axiosInstance from 'src/lib/axios';

import { toast } from 'src/components/snackbar';

import { networkManager } from './network-utils';
import { ReportService } from './services/report-service';
import { offlineStorage, type OfflineDraftReport } from './offline-storage';

// State management
let isSyncing = false;
const syncListeners = new Set<(syncing: boolean) => void>();

/**
 * Initialize the offline sync service
 */
const initializeOfflineSync = (): void => {
  // Listen for network status changes
  networkManager.addListener((status) => {
    if (status.isOnline && !isSyncing) {
      // Network restored, attempt to sync pending drafts
      syncPendingDrafts();
    }
  });

  // Attempt sync on service initialization if online
  if (networkManager.getStatus().isOnline) {
    setTimeout(() => syncPendingDrafts(), 1000);
  }
};

/**
 * Add a listener for sync status changes
 */
export const addSyncListener = (listener: (syncing: boolean) => void): (() => void) => {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
};

/**
 * Get current sync status
 */
export const isCurrentlySyncing = (): boolean => isSyncing;

/**
 * Set syncing state and notify listeners
 */
const setSyncing = (syncing: boolean): void => {
  isSyncing = syncing;
  syncListeners.forEach((listener) => {
    try {
      listener(syncing);
    } catch (error) {
      console.error('Error in sync status listener:', error);
    }
  });
};

/**
 * Upload files from offline draft
 */
const uploadDraftFiles = async (
  reportId: string,
  attachments: any[],
  userId: string
): Promise<void> => {
  try {
    const form = new FormData();
    form.append('scope', 'report');
    form.append('reportId', reportId);

    // Convert base64 data back to files
    for (const attachment of attachments) {
      if (attachment.data) {
        // Convert data URL to file
        const response = await fetch(attachment.data);
        const blob = await response.blob();
        const file = new File([blob], attachment.name, { type: attachment.type });
        form.append('files', file);
      }
    }

    if (form.has('files')) {
      const uploadResponse = await axiosInstance.post('/api/v1/uploads', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadData = uploadResponse.data;
      const uploadedFiles = uploadData?.data || [];

      // Update report with attachment data
      if (uploadedFiles.length > 0) {
        const attachmentData = uploadedFiles.map((f: any) => ({
          filename: f.name || 'Unknown',
          originalName: f.name || 'Unknown',
          mimetype: f.mime || 'application/octet-stream',
          size: f.size || 0,
          url: f.url,
          uploadedAt: new Date(),
          // Only set uploadedBy if it's a valid ObjectId, otherwise leave it undefined
          uploadedBy:
            userId && userId !== 'unknown' && /^[0-9a-fA-F]{24}$/.test(userId) ? userId : undefined,
        }));

        await ReportService.updateReport(reportId, {
          attachments: attachmentData,
        });
      }
    }
  } catch (error) {
    console.error('Failed to upload draft files:', error);
    throw error;
  }
};

/**
 * Sync a single draft to the server
 */
const syncDraft = async (draft: OfflineDraftReport): Promise<void> => {
  try {
    // Clean up the draft data before sending to server
    const cleanDraftData = {
      ...draft.data,
      // Remove attachments from the initial report creation
      // They will be uploaded separately after the report is created
      attachments: [],
    };

    // Create the report on the server
    const response = await ReportService.createReport(cleanDraftData);

    if (response.success) {
      const reportId = response.data._id;

      // Handle file uploads if there are attachments
      if (draft.data.attachments && draft.data.attachments.length > 0) {
        await uploadDraftFiles(reportId, draft.data.attachments, draft.metadata.userId);
      }

      // Mark draft as synced
      offlineStorage.updateDraftStatus(draft.id, 'draft');

      console.log(`✅ Draft ${draft.id} synced successfully as report ${reportId}`);
    } else {
      throw new Error(response.message || 'Failed to create report');
    }
  } catch (error) {
    console.error(`Failed to sync draft ${draft.id}:`, error);
    throw error;
  }
};

/**
 * Manually trigger sync of pending drafts
 */
export const syncPendingDrafts = async (): Promise<void> => {
  if (isSyncing || !networkManager.getStatus().isOnline) {
    return;
  }

  const pendingDrafts = offlineStorage.getPendingSyncDrafts();
  if (pendingDrafts.length === 0) {
    return;
  }

  setSyncing(true);
  offlineStorage.updateLastSyncAttempt();

  try {
    console.log(`🔄 Syncing ${pendingDrafts.length} offline drafts...`);

    let successCount = 0;
    let failureCount = 0;

    for (const draft of pendingDrafts) {
      try {
        await syncDraft(draft);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync draft ${draft.id}:`, error);
        failureCount++;
      }
    }

    if (successCount > 0) {
      toast.success(
        `Successfully synced ${successCount} offline draft${successCount > 1 ? 's' : ''}`,
        { duration: 4000 }
      );
    }

    if (failureCount > 0) {
      toast.warning(
        `Failed to sync ${failureCount} draft${failureCount > 1 ? 's' : ''}. They will be retried later.`,
        { duration: 6000 }
      );
    }
  } catch (error) {
    console.error('Sync process failed:', error);
    toast.error('Failed to sync offline drafts. Please try again later.');
  } finally {
    setSyncing(false);
  }
};

/**
 * Get sync statistics
 */
export const getSyncStats = (): {
  pendingDrafts: number;
  isSyncing: boolean;
  lastSyncAttempt: number | null;
} => {
  const stats = offlineStorage.getStats();
  return {
    pendingDrafts: stats.pendingSync,
    isSyncing,
    lastSyncAttempt: stats.lastSyncAttempt,
  };
};

/**
 * Clear all synced drafts (cleanup)
 */
export const clearSyncedDrafts = (): void => {
  const drafts = offlineStorage.getAllDrafts();
  const syncedDrafts = drafts.filter((draft) => draft.status === 'draft');

  for (const draft of syncedDrafts) {
    offlineStorage.removeDraft(draft.id);
  }

  console.log(`🧹 Cleared ${syncedDrafts.length} synced drafts`);
};

// Initialize the service
initializeOfflineSync();

// Export the service functions as an object for backward compatibility
export const offlineSyncService = {
  addSyncListener,
  isCurrentlySyncing,
  syncPendingDrafts,
  getSyncStats,
  clearSyncedDrafts,
};

// Export utility functions for direct use
export const getSyncStatus = () => isCurrentlySyncing();
export const triggerSync = () => syncPendingDrafts();
