import { useState, useEffect, useCallback } from "react";
import type { Notification } from "@/types";

const NOTIF_KEY = "judgemate_notifications";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("local-storage", handler);
    // also poll for cross-component updates
    const interval = setInterval(load, 2000);
    return () => {
      window.removeEventListener("local-storage", handler);
      clearInterval(interval);
    };
  }, [load]);

  const addNotification = useCallback(
    (message: string, type: Notification["type"] = "info") => {
      const notif: Notification = {
        id: crypto.randomUUID(),
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const current = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
      const updated = [notif, ...current].slice(0, 50);
      localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
      setNotifications(updated);
      window.dispatchEvent(new CustomEvent("local-storage", { detail: { key: NOTIF_KEY } }));
    },
    []
  );

  const markRead = useCallback((id: string) => {
    const current: Notification[] = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
    setNotifications(updated);
  }, []);

  const markAllRead = useCallback(() => {
    const current: Notification[] = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
    const updated = current.map((n) => ({ ...n, read: true }));
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
    setNotifications(updated);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, addNotification, markRead, markAllRead, unreadCount };
}
