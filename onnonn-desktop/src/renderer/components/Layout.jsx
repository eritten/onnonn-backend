import React, { useEffect, useRef, useState } from "react";
import { Bell, CalendarPlus2, Home, LayoutDashboard, LogOut, Search, Settings, Users, Video, FolderKanban, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { orgService } from "../services/otherServices";
import { EmptyState } from "./EmptyState";
import { Modal } from "./Modal";

const navItems = [
  { to: "/app/home", label: "Home", icon: LayoutDashboard },
  { to: "/app/meetings", label: "Meetings", icon: Video },
  { to: "/app/recordings", label: "Recordings", icon: FolderKanban },
  { to: "/app/contacts", label: "Contacts", icon: Users },
  { to: "/app/organization", label: "Organization", icon: Building2 },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const notificationsOpen = useUiStore((state) => state.notificationsOpen);
  const toggleNotifications = useUiStore((state) => state.toggleNotifications);
  const globalSearch = useUiStore((state) => state.globalSearch);
  const setGlobalSearch = useUiStore((state) => state.setGlobalSearch);
  const announce = useUiStore((state) => state.announce);
  const seenNotificationIds = useRef([]);
  const searchInputRef = useRef(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleAction = async (label, action) => {
    try {
      await action();
    } catch (error) {
      console.error(`[Onnonn Desktop] ${label} failed`, error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      try {
        const nextNotifications = await orgService.notifications();
        if (!mounted) {
          return;
        }
        setNotifications((current) => {
          const currentUnread = current.filter((notification) => !notification.isRead).length;
          const nextUnread = nextNotifications.filter((notification) => !notification.isRead).length;
          if (current.length && nextUnread > currentUnread) {
            announce(`${nextUnread} unread notifications.`);
          }
          return nextNotifications;
        });
      } catch (error) {
        console.error("[Onnonn Desktop] Load notifications failed", error);
      }
    };

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [announce, location.pathname]);

  useEffect(() => {
    if (!notifications.length) {
      return;
    }

    const unseen = notifications.filter((notification) => !seenNotificationIds.current.includes(notification._id));
    if (document.hidden) {
      unseen.slice(0, 3).forEach((notification) => {
        window.electronAPI.showNativeNotification({
          title: notification.title || "Onnonn notification",
          body: notification.message || "You have a new update."
        });
      });
    }
    seenNotificationIds.current = notifications.map((notification) => notification._id);
  }, [notifications]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        announce("Search focused.");
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === "/") {
        const targetTag = event.target?.tagName?.toLowerCase();
        if (!["input", "textarea", "select"].includes(targetTag)) {
          event.preventDefault();
          searchInputRef.current?.focus();
          announce("Search focused.");
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigate("/app/meetings?new=instant");
        announce("Opening instant meeting form.");
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        navigate("/app/settings");
        announce("Opening settings.");
        return;
      }

      if (event.altKey && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        const target = navItems[Number(event.key) - 1];
        if (target) {
          navigate(target.to);
          announce(`${target.label} opened.`);
        }
        return;
      }

      if (event.key === "F1" || (event.shiftKey && event.key === "?")) {
        event.preventDefault();
        setShortcutsOpen((current) => !current);
        announce("Keyboard shortcuts help opened.");
        return;
      }

      if (event.key === "Escape" && notificationsOpen) {
        event.preventDefault();
        toggleNotifications();
        announce("Notifications closed.");
        return;
      }

      if (event.key === "Escape" && shortcutsOpen) {
        event.preventDefault();
        setShortcutsOpen(false);
        announce("Keyboard shortcuts help closed.");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [announce, navigate, notificationsOpen, shortcutsOpen, toggleNotifications]);

  const pageTitle = navItems.find((item) => location.pathname.startsWith(item.to))?.label || "Onnonn";
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950">
      <aside className={`flex min-h-screen flex-col border-r border-brand-800 bg-[#0F172A] transition-all ${sidebarCollapsed ? "w-24" : "w-72"} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-accent text-lg font-bold">O</div>
            {!sidebarCollapsed && <div><p className="text-lg font-semibold">Onnonn</p><p className="text-xs text-brand-muted">Desktop</p></div>}
          </div>
          <button className="btn-secondary px-2 py-2" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => handleAction("Toggle sidebar", toggleSidebar)}>
            <span className="sr-only">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
            {sidebarCollapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${isActive ? "bg-brand-accent text-white" : "text-brand-muted hover:bg-brand-900 hover:text-brand-text"}`}
              >
                <Icon size={18} />
                {!sidebarCollapsed && item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto pt-10">
          <div className="panel p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/20 text-sm font-semibold">
                {auth.user?.displayName?.slice(0, 1)?.toUpperCase() || "U"}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{auth.user?.displayName}</p>
                  <p className="mt-1 inline-flex rounded-full bg-brand-accent/15 px-2 py-1 text-xs text-brand-accent">
                    {auth.user?.currentPlan?.name || "Free"}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button className="btn-secondary mt-4 w-full" aria-label="Log out" onClick={() => handleAction("Logout", async () => {
                await auth.logout();
                navigate("/login");
              })}>
                <LogOut size={16} className="mr-2" />
                Logout
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-brand-800 bg-brand-950/70 px-8 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-muted">Onnonn Workspace</p>
            <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          </div>
          <div className="mx-auto flex w-full max-w-xl items-center rounded-2xl border border-brand-800 bg-brand-900 px-3">
            <Search size={18} className="text-brand-muted" />
            <input
              ref={searchInputRef}
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              placeholder="Search meetings semantically"
              aria-label="Global search"
              aria-keyshortcuts="Control+K Meta+K /"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
            />
          </div>
          <button className="btn-secondary" aria-label="Open notifications" onClick={() => handleAction("Toggle notifications", toggleNotifications)}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="ml-2 rounded-full bg-brand-error px-2 py-0.5 text-xs text-white">{unreadCount}</span>}
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-brand-800 bg-brand-900/80 px-3 py-2">
            {auth.user?.profilePhotoUrl ? (
              <img src={auth.user.profilePhotoUrl} alt={auth.user.displayName || "User avatar"} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/20 text-sm font-semibold text-brand-text">
                {auth.user?.displayName?.slice(0, 1)?.toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-text">{auth.user?.displayName || "Onnonn user"}</p>
              <p className="truncate text-xs text-brand-muted">{auth.user?.email || "Signed in"}</p>
            </div>
          </div>
          <button className="btn-primary" aria-label="Start a new instant meeting" onClick={() => handleAction("Open instant meeting form", () => navigate("/app/meetings?new=instant"))}><Home size={16} className="mr-2" />New Meeting</button>
          <button className="btn-secondary" aria-label="Open scheduled meeting form" onClick={() => handleAction("Open scheduled meeting form", () => navigate("/app/meetings?new=scheduled"))}><CalendarPlus2 size={16} className="mr-2" />Schedule Meeting</button>
          <button className="btn-secondary" onClick={() => handleAction("Open shortcuts help", () => setShortcutsOpen(true))} aria-keyshortcuts="F1 Shift+?" aria-label="Open keyboard shortcuts help">Shortcuts</button>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>

        {notificationsOpen && (
          <aside className="absolute right-0 top-0 z-40 h-full w-[420px] border-l border-brand-800 bg-brand-950/95 p-6 shadow-panel backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Notifications</h2>
              <button className="btn-secondary" aria-label="Close notifications panel" onClick={() => handleAction("Close notifications", toggleNotifications)}>Close</button>
            </div>
            {notifications.length ? (
              <div className="space-y-3 overflow-auto pb-12">
                {notifications.map((notification) => (
                  <div key={notification._id} className="panel p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="mt-1 text-sm text-brand-muted">{notification.message}</p>
                        <p className="mt-2 text-xs text-brand-muted">{format(new Date(notification.createdAt), "PPpp")}</p>
                      </div>
                      <div className="flex gap-2">
                        {!notification.isRead && <button className="btn-secondary px-3 py-2" aria-label={`Mark notification ${notification.title} as read`} onClick={() => handleAction("Read notification", async () => {
                          await orgService.readNotification(notification._id);
                          setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
                        })}>Read</button>}
                        <button className="btn-secondary px-3 py-2" aria-label={`Delete notification ${notification.title}`} onClick={() => handleAction("Delete notification", async () => {
                          await orgService.deleteNotification(notification._id);
                          setNotifications((items) => items.filter((item) => item._id !== notification._id));
                        })}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No notifications yet" description="Meeting invites, reminders, and updates will show up here." />
            )}
          </aside>
        )}

        <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="Keyboard shortcuts" className="max-w-2xl">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Ctrl/Cmd + K", "Focus global search"],
              ["/", "Focus global search outside inputs"],
              ["Ctrl/Cmd + Shift + N", "Open instant meeting"],
              ["Ctrl/Cmd + ,", "Open settings"],
              ["Alt + 1 to 6", "Jump between main sections"],
              ["F1 or Shift + ?", "Open shortcuts help"],
              ["Escape", "Close notifications or shortcuts help"],
              ["M / C / S / H / R", "Meeting mic, camera, share, hand, and record controls"]
            ].map(([keys, description]) => (
              <div key={keys} className="rounded-2xl border border-brand-800 bg-brand-950/60 p-4">
                <p className="text-sm font-semibold text-brand-text">{keys}</p>
                <p className="mt-1 text-sm text-brand-muted">{description}</p>
              </div>
            ))}
          </div>
        </Modal>
      </div>
    </div>
  );
}
