import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Accessibility
  reduceMotion: boolean;
  highContrast: boolean;
  setReduceMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  
  // User preferences
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Notifications
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setPushNotifications: (enabled: boolean) => void;
  
  // Session
  lastActiveTime: number | null;
  updateLastActiveTime: () => void;
  
  // Reset all settings
  resetAppSettings: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      
      // Accessibility
      reduceMotion: false,
      highContrast: false,
      setReduceMotion: (value) => set({ reduceMotion: value }),
      setHighContrast: (value) => set({ highContrast: value }),
      
      // User preferences
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Notifications
      notificationsEnabled: true,
      emailNotifications: true,
      pushNotifications: false,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setEmailNotifications: (enabled) => set({ emailNotifications: enabled }),
      setPushNotifications: (enabled) => set({ pushNotifications: enabled }),
      
      // Session
      lastActiveTime: null,
      updateLastActiveTime: () => set({ lastActiveTime: Date.now() }),
      
      // Reset all settings
      resetAppSettings: () => set({
        theme: 'system',
        reduceMotion: false,
        highContrast: false,
        sidebarCollapsed: false,
        notificationsEnabled: true,
        emailNotifications: true,
        pushNotifications: false,
      }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
        sidebarCollapsed: state.sidebarCollapsed,
        notificationsEnabled: state.notificationsEnabled,
        emailNotifications: state.emailNotifications,
        pushNotifications: state.pushNotifications,
      }),
    }
  )
); 