import { create } from "zustand";

export const useUiStore = create((set) => ({
  sidebarCollapsed: false,
  notificationsOpen: false,
  globalSearch: "",
  setGlobalSearch: (value) => set({ globalSearch: value }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleNotifications: () => set((state) => ({ notificationsOpen: !state.notificationsOpen })),
  setNotificationsOpen: (value) => set({ notificationsOpen: value })
}));
