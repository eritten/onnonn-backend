import { create } from "zustand";

export const useUiStore = create((set) => ({
  sidebarCollapsed: false,
  notificationsOpen: false,
  globalSearch: "",
  announcement: "",
  pendingMeetingJoin: null,
  setGlobalSearch: (value) => set({ globalSearch: value }),
  announce: (message) => set({ announcement: message }),
  clearAnnouncement: () => set({ announcement: "" }),
  setPendingMeetingJoin: (pendingMeetingJoin) => set({ pendingMeetingJoin }),
  consumePendingMeetingJoin: () => {
    const current = useUiStore.getState().pendingMeetingJoin;
    set({ pendingMeetingJoin: null });
    return current;
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleNotifications: () => set((state) => ({ notificationsOpen: !state.notificationsOpen })),
  setNotificationsOpen: (value) => set({ notificationsOpen: value })
}));
