'use client';
import { useState, useEffect, useCallback } from 'react';

export function usePushNotifications(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported]   = useState(false);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted' && userId) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, subscription: sub, type: 'subscribe' }),
        });
      } catch (e) {
        console.warn('Push subscription failed:', e);
      }
    }
    return result === 'granted';
  }, [supported, userId]);

  // Show a local notification immediately (works without push server)
  const notify = useCallback((title: string, body: string, url?: string) => {
    if (permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: '/NP_Logo.jpg',
      badge: '/NP_Logo.jpg',
    });
    if (url) n.onclick = () => window.open(url, '_blank');
  }, [permission]);

  return { permission, supported, requestPermission, notify };
}
