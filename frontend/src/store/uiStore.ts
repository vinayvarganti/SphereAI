import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  activeWorkflowTab: 'results' | 'logs' | 'summary' | 'approval';
  notificationBadge: number; // approval pending count

  toggleSidebar: () => void;
  setActiveTab: (tab: UIState['activeWorkflowTab']) => void;
  setNotificationBadge: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeWorkflowTab: 'results',
  notificationBadge: 0,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveTab: (tab) => set({ activeWorkflowTab: tab }),
  setNotificationBadge: (count) => set({ notificationBadge: count }),
}));
