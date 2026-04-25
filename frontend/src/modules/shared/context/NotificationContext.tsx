import React, { createContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import { Notification, NotificationType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface NotificationState {
  notifications: Notification[];
}

type NotificationAction =
  | { type: 'ADD'; payload: Notification }
  | { type: 'REMOVE'; payload: string };

interface NotificationContextType {
  state: NotificationState;
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

const initialState: NotificationState = {
  notifications: [],
};

const notificationReducer = (state: NotificationState, action: NotificationAction) => {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };
    default:
      return state;
  }
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Listen for global notification events
  useEffect(() => {
    const handleNotification = (event: any) => {
      const { message, type = 'info', duration = 5000 } = event.detail;
      showNotification(message, type, duration);
    };

    window.addEventListener('notification:show', handleNotification);
    return () => {
      window.removeEventListener('notification:show', handleNotification);
    };
  }, []);

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration = 5000) => {
      const id = uuidv4();
      const notification: Notification = {
        id,
        message,
        type,
        duration,
      };

      dispatch({ type: 'ADD', payload: notification });

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', payload: id });
  }, []);

  return (
    <NotificationContext.Provider value={{ state, showNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
