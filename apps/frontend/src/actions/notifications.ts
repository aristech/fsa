'use client';

import type {
  INotification,
  NotificationCounts,
  NotificationFilters,
} from 'src/types/notification';

import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface GetNotificationsResponse {
  success: boolean;
  data: INotification[];
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface GetNotificationCountsResponse {
  success: boolean;
  data: NotificationCounts;
}

export interface NotificationActionResponse {
  success: boolean;
  message: string;
}

// ----------------------------------------------------------------------

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  filters: NotificationFilters = {}
): Promise<GetNotificationsResponse> {
  const params = new URLSearchParams();

  if (filters.isRead !== undefined) {
    params.append('isRead', String(filters.isRead));
  }
  if (filters.isArchived !== undefined) {
    params.append('isArchived', String(filters.isArchived));
  }
  if (filters.limit !== undefined) {
    params.append('limit', String(filters.limit));
  }
  if (filters.skip !== undefined) {
    params.append('skip', String(filters.skip));
  }

  const url = params.toString()
    ? `${endpoints.notifications.list}?${params.toString()}`
    : endpoints.notifications.list;
  const response = await axiosInstance.get<GetNotificationsResponse>(url);
  return response.data;
}

/**
 * Get notification counts for the current user
 */
export async function getNotificationCounts(): Promise<GetNotificationCountsResponse> {
  const response = await axiosInstance.get<GetNotificationCountsResponse>(
    endpoints.notifications.counts
  );
  return response.data;
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds?: string[]
): Promise<NotificationActionResponse> {
  const response = await axiosInstance.put<NotificationActionResponse>(
    endpoints.notifications.markRead,
    { notificationIds }
  );
  return response.data;
}

/**
 * Archive notifications
 */
export async function archiveNotifications(
  notificationIds: string[]
): Promise<NotificationActionResponse> {
  const response = await axiosInstance.put<NotificationActionResponse>(
    endpoints.notifications.archive,
    { notificationIds }
  );
  return response.data;
}

/**
 * Get a specific notification
 */
export async function getNotification(
  id: string
): Promise<{ success: boolean; data: INotification }> {
  const response = await axiosInstance.get<{ success: boolean; data: INotification }>(
    `${endpoints.notifications.list}/${id}`
  );
  return response.data;
}
