import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Browser Push Notifications Manager
 */
export function useBrowserNotifications() {
  const [permission, setPermission] = useState(Notification.permission);
  const queryClient = useQueryClient();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (permission === 'granted') return true;

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      // Update user preferences
      try {
        const user = await base44.auth.me();
        await base44.auth.updateMe({
          notification_preferences: {
            ...(user.notification_preferences || {}),
            browser_push: true
          }
        });
        queryClient.invalidateQueries(['user']);
      } catch (error) {
        console.error('Failed to update notification preferences:', error);
      }
    }
    
    return result === 'granted';
  };

  const showNotification = (title, options = {}) => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    if (options.onClick) {
      notification.onclick = options.onClick;
    }

    return notification;
  };

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window
  };
}

/**
 * Signal notification helper
 */
export async function showSignalNotification(signal, onClickUrl) {
  if (Notification.permission !== 'granted') return;

  // Play custom audio if set
  try {
    const user = await base44.auth.me();
    const customAudioUrl = user?.notification_preferences?.custom_audio_url;
    if (customAudioUrl) {
      const audio = new Audio(customAudioUrl);
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  } catch (error) {
    console.log('Failed to play custom audio:', error);
  }

  const title = 'Hybrid Journal Alert';
  const body = `New ${signal.provider} signal: ${signal.symbol} — ${signal.action} — Entry ${signal.price}`;
  
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `signal-${signal.id}`,
    requireInteraction: true,
    data: { signalId: signal.id, url: onClickUrl }
  });

  notification.onclick = function(event) {
    event.preventDefault();
    window.focus();
    if (onClickUrl) {
      window.location.href = onClickUrl;
    }
    notification.close();
  };

  return notification;
}