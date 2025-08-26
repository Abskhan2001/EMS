import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAppSelector } from '../hooks/redux.CustomHooks';
import { messaging, GenerateToken } from '../../notifications/firebase';
import { onMessage } from 'firebase/messaging';

// Define the context type
interface NotificationContextType {
  notificationsEnabled: boolean;
  requestPermission: () => Promise<void>;
}

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider component
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const user = useAppSelector((state) => state.auth.user);

  // Check if notifications are already enabled and request permission if user is logged in
  useEffect(() => {
    const checkAndRequestPermission = async () => {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
      }

      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        // Generate token if user is logged in
        if (user) {
          try {
            // Temporarily disabled FCM token generation
            console.log('FCM token generation temporarily disabled');
            // await GenerateToken();
            // Set up message listener
            onMessage(messaging, (payload) => {
              console.log('Message received in foreground:', payload);
              // Display a notification if the app is in the foreground
              if (payload.notification) {
                new Notification(payload.notification.title || 'New Notification', {
                  body: payload.notification.body || 'You have a new notification',
                  icon: '/favicon.ico'
                });
              }
            });
          } catch (error) {
            console.error('Error generating token:', error);
          }
        }
      } else if (Notification.permission !== 'denied' && user) {
        // If permission is not denied and user is logged in, request permission
        console.log('Requesting notification permission after login');
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            setNotificationsEnabled(true);
            await GenerateToken();

            // Set up message listener
            onMessage(messaging, (payload) => {
              console.log('Message received in foreground:', payload);
              if (payload.notification) {
                new Notification(payload.notification.title || 'New Notification', {
                  body: payload.notification.body || 'You have a new notification',
                  icon: '/favicon.ico'
                });
              }
            });
          } else {
            setNotificationsEnabled(false);
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          setNotificationsEnabled(false);
        }
      } else {
        setNotificationsEnabled(false);
      }
    };

    checkAndRequestPermission();
  }, [user]);

  // Function to request notification permission
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        await GenerateToken();
      } else {
        setNotificationsEnabled(false);
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Listen for permission changes
  useEffect(() => {
    if (!('Notification' in window)) return;

    const handlePermissionChange = () => {
      setNotificationsEnabled(Notification.permission === 'granted');
    };

    // Modern browsers might not support this event yet
    if ('onpermissionchange' in Notification.prototype) {
      // @ts-ignore - TypeScript doesn't recognize this event yet
      Notification.prototype.onpermissionchange = handlePermissionChange;
    }

    return () => {
      if ('onpermissionchange' in Notification.prototype) {
        // @ts-ignore
        Notification.prototype.onpermissionchange = null;
      }
    };
  }, []);

  // Register service worker if not already registered
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notificationsEnabled, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
