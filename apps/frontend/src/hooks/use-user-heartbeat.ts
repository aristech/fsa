'use client';

import { useRef, useEffect } from 'react';

import axios, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export function useUserHeartbeat() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only start heartbeat if user is authenticated
    const token =
      sessionStorage.getItem('jwt_access_token') || localStorage.getItem('jwt_access_token');

    if (!token) return undefined;

    // Send heartbeat every 5 minutes to keep user marked as online
    const sendHeartbeat = async () => {
      try {
        await axios.post(endpoints.users.heartbeat);
      } catch (error) {
        // Heartbeat failed - user might be logged out or endpoint might not exist
        console.debug('Heartbeat failed:', error);
      }
    };

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Set up interval to send heartbeat every 5 minutes
    intervalRef.current = setInterval(sendHeartbeat, 5 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return null; // This hook doesn't return anything, it just runs in background
}
