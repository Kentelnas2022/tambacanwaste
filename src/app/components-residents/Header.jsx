"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import Swal from "sweetalert2";
import {
  Bell,
  X,
  User,
  LogOut,
  CheckCircle2,
  Trash2,
  Inbox,
  Clock,
  AlertCircle,
  Menu, // Added Menu icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Time Helper (Unchanged) ---
function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) return "just now";

  let interval = seconds / 31536000;
  if (interval > 1)
    return Math.floor(interval) + (interval >= 2 ? " years ago" : " year ago");
  interval = seconds / 2592000;
  if (interval > 1)
    return Math.floor(interval) + (interval >= 2 ? " months ago" : " month ago");
  interval = seconds / 86400;
  if (interval > 1)
    return Math.floor(interval) + (interval >= 2 ? " days ago" : " day ago");
  interval = seconds / 3600;
  if (interval > 1)
    return Math.floor(interval) + (interval >= 2 ? " hours ago" : " hour ago");
  interval = seconds / 60;
  if (interval > 1)
    return (
      Math.floor(interval) + (interval >= 2 ? " minutes ago" : " minute ago")
    );
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + " seconds ago";
}

// --- Minimal Notification Item (Unchanged) ---
function getNotifStyle(status) {
  if (status === "Resolved") {
    return {
      Icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    };
  }
  if (status === "In Progress") {
    return { Icon: Clock, color: "text-blue-600", bg: "bg-blue-50" };
  }
  return {
    Icon: AlertCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  };
}

function MinimalNotificationItem({ notif, onClick }) {
  const { Icon, color, bg } = getNotifStyle(notif.status);
  const isRead = notif.read;

  let cleanMessage = notif.message || "No message content.";

  if (notif.status === "Resolved" && notif.official_response) {
    cleanMessage = `Your report is resolved. Response: ${notif.official_response}`;
  } else if (notif.status === "In Progress" && notif.official_response) {
    cleanMessage = `Update: ${notif.official_response}`;
  } else if (notif.status === "In Progress") {
    cleanMessage = `Your report is in progress.`;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClick}
      className={`flex gap-3 p-4 border-b border-gray-100 last:border-b-0 cursor-pointer bg-white hover:bg-gray-50`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bg}`}
      >
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm break-words ${
            isRead ? "text-gray-700" : "text-gray-900 font-medium"
          }`}
        >
          {cleanMessage}
        </p>
        <p
          className={`text-xs ${
            isRead ? "text-gray-400" : "text-blue-600 font-medium"
          } mt-1`}
        >
          {formatTimeAgo(notif.updated_at || notif.created_at)}
        </p>
      </div>
      {!isRead && (
        <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full self-center ml-2"></div>
      )}
    </motion.div>
  );
}

// --- Main Header Component ---
export default function Header({ activePage }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);

  const notificationChannelRef = useRef(null);
  const profileBtnRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const notifBtnRef = useRef(null);
  const notifDropdownRef = useRef(null);

  // --- Auth & Data Initialization (Unchanged) ---
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      console.log("Fetching user...");
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth fetch error:", error?.message);
        return;
      }

      const currentUser = data?.user;
      if (isMounted && currentUser) {
        console.log("User found:", currentUser.id);
        setUser(currentUser);
        await fetchNotifications(currentUser.id);
        subscribeToNotifications(currentUser.id);
      } else if (isMounted) {
        console.log("No user session found on init.");
        setNotifications([]);
      }
    };

    init();

    return () => {
      isMounted = false;
      console.log("Unsubscribing from notifications channel.");
      if (notificationChannelRef.current) {
        supabase
          .removeChannel(notificationChannelRef.current)
          .catch((err) => console.error("Error removing channel:", err));
        notificationChannelRef.current = null;
      }
    };
  }, []);

  // --- Close dropdown on outside click (Unchanged) ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isProfileOpen &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(event.target) &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
      if (
        isNotifOpen &&
        notifBtnRef.current &&
        !notifBtnRef.current.contains(event.target) &&
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen, isNotifOpen]);

  // --- Data Fetching & Realtime (Unchanged) ---
  const fetchNotifications = async (uid) => {
    if (!uid) {
      console.log("❌ No user ID provided for fetching notifications");
      return;
    }
    try {
      console.log("📥 Fetching notifications for user:", uid);
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, message, user_id, status, official_response, created_at, updated_at, read, report_id"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      console.log("✅ Notifications fetched:", data);
      setNotifications(data || []);
    } catch (error) {
      console.error("⚠️ Error fetching notifications:", error);
      setNotifications([]);
    }
  };

  const subscribeToNotifications = (uid) => {
    if (notificationChannelRef.current || !uid) {
      console.log(
        `${
          notificationChannelRef.current ? "Already subscribed" : "No UID"
        }, skipping subscribe.`
      );
      return;
    }
    console.log("Attempting subscribe for:", uid);
    const channel = supabase
      .channel(`realtime-notifications-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          console.log("Change received:", payload);
          fetchNotifications(uid);

          const newNotif = payload.new;
          const oldNotif = payload.old;
          let showUpdateAlert = false;
          let alertTitle = "";
          let alertText = "";

          if (payload.eventType === "INSERT") {
            const exists = notifications.some((n) => n.id === newNotif.id);
            if (!exists) {
              showUpdateAlert = true;
              alertTitle = "New Notification";
              alertText = newNotif.message;
            }
          } else if (payload.eventType === "UPDATE") {
            const readChangedOnly =
              newNotif.read !== oldNotif?.read &&
              Object.keys(payload.old || {}).length === 1 &&
              "read" in (payload.old || {});
            if (!readChangedOnly) {
              showUpdateAlert = true;
              alertTitle = "Notification Updated";
              alertText =
                newNotif.official_response &&
                newNotif.official_response !== oldNotif?.official_response
                  ? `Response added/updated.`
                  : `Status changed to ${newNotif.status}.`;
            }
          }

          if (showUpdateAlert) {
            Swal.fire({
              icon: payload.eventType === "INSERT" ? "info" : "success",
              title: alertTitle,
              text: alertText,
              timer: 3000,
              showConfirmButton: false,
              toast: true,
              position: "top-end",
              timerProgressBar: true,
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed for user ${uid}`);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`Subscription failed: ${status}`, err);
          notificationChannelRef.current = null;
        } else if (status === "CLOSED") {
          console.log(`Subscription closed for user ${uid}`);
          notificationChannelRef.current = null;
        }
        if (err) {
          console.error("Subscription specific error:", err);
        }
      });
    notificationChannelRef.current = channel;
  };

  // --- Notification Actions (Unchanged) ---
  const markOneAsRead = async (notif) => {
    if (notif.read || !user) return;
    console.log("Marking one as read:", notif.id);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", notif.id)
        .eq("user_id", user.id);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Mark one read error:", error.message);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    console.log("Marking as read:", unreadIds);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("id", unreadIds);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n))
      );
      console.log("Marked as read locally/DB.");
    } catch (error) {
      console.error("Mark read error:", error.message);
      Swal.fire("Error", "Could not mark notifications as read.", "error");
    }
  };

  const clearAllNotifications = async () => {
    if (!user || !notifications.length) return;
    const confirm = await Swal.fire({
      title: "Clear all notifications?",
      text: "This will permanently delete all your notifications.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete all",
      cancelButtonText: "Cancel",
      customClass: { popup: "rounded-lg" },
    });
    if (!confirm.isConfirmed) return;
    console.log("Clearing all notifications...");
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      setNotifications([]);
      setIsNotifOpen(false);
      console.log("Cleared all locally/DB.");
      Swal.fire("Cleared!", "All notifications deleted.", "success");
    } catch (error) {
      console.error("Delete error:", error.message);
      Swal.fire("Error", "Failed to delete notifications.", "error");
    }
  };

  // --- Memoized unread count (Unchanged) ---
  const unreadCount = useMemo(() => {
    return (notifications || []).filter((n) => !n.read).length;
  }, [notifications]);

  // --- Logout Handler (Unchanged) ---
  const handleLogout = async () => {
    console.log("Attempting to sign out...");
    setIsProfileOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      Swal.fire("Error", "Could not sign out. Please try again.", "error");
    } else {
      console.log("Sign out successful.");
      window.location.href = "/login";
    }
  };

  // --- Dynamic Page Title Helper (Unchanged) ---
  const getPageTitle = (page) => {
    switch (page) {
      case "schedule":
        return "Schedule";
      case "report":
        return "Report an Issue";
      case "education":
        return "Education";
      case "profile":
        return "Profile";
      default:
        // Fallback for dynamic title in page.jsx
        if (typeof window !== "undefined") {
           const path = window.location.pathname;
           if (path.includes("/report")) return "Report an Issue";
           if (path.includes("/education")) return "Education";
           if (path.includes("/profile")) return "Profile";
        }
        return "Schedule"; // Default
    }
  };
  
  // --- UPDATED: Get title from activePage, but show "Residents Dashboard" on schedule page ---
  const pageTitle = getPageTitle(activePage);
  const displayTitle = activePage === 'schedule' ? "Residents Dashboard" : pageTitle;


  return (
    <>
      {/* --- UPDATED Header Bar (Matches target HTML) --- */}
      <nav className="bg-[#8B0000] text-white p-4 sticky top-0 z-40 shadow-lg">
        {/* --- UPDATED: Added max-w-7xl mx-auto --- */}
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 id="page-title" className="text-xl font-bold text-white">
            {/* Show "Residents Dashboard" on schedule, else dynamic title */}
            {displayTitle}
          </h1>

          {/* --- UPDATED: space-x-4 from target --- */}
          <div className="flex items-center space-x-4">
            {/* Notification Button (Matches target style) */}
            <button
              ref={notifBtnRef}
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative p-2 text-white rounded-full hover:bg-red-800 transition-colors"
              aria-label="Open notifications"
              aria-haspopup="true"
              aria-expanded={isNotifOpen}
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-[#DC143C] text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold ring-2 ring-[#8B0000]"
                  aria-label={`${unreadCount} unread notifications`}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* --- UPDATED: Profile Button to use Menu icon --- */}
            <button
              ref={profileBtnRef}
              id="profile-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileOpen((prev) => !prev);
              }}
              className="relative p-2 text-white rounded-full hover:bg-red-800 transition-colors"
              aria-label="Open profile menu"
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
            >
              {/* --- UPDATED: Icon changed to Menu --- */}
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* --- Notification Dropdown (Unchanged) --- */}
      <AnimatePresence>
        {isNotifOpen && (
          <motion.div
            key="notif-dropdown"
            ref={notifDropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-4 top-16 mt-1 w-96 max-w-[90vw] origin-top-right bg-white rounded-xl shadow-lg z-50 ring-1 ring-black ring-opacity-5 focus:outline-none flex flex-col"
            role="dialog"
            aria-labelledby="notif-title"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-">
              <h2
                id="notif-title"
                className="text-lg font-semibold text-gray-900"
              >
                Notifications
              </h2>
              <button
                onClick={() => setIsNotifOpen(false)}
                className="p-2 text-gray-400 rounded-full hover:bg-gray-100 transition"
                aria-label="Close notifications"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[60vh]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-10 text-gray-500">
                  <Inbox className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="font-medium text-gray-700">All caught up!</p>
                  <p className="text-sm">You have no new notifications.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notif) => (
                      <MinimalNotificationItem
                        key={notif.id}
                        notif={notif}
                        onClick={() => markOneAsRead(notif)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 flex gap-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex-shrink-0">
                <button
                  onClick={markAllAsRead}
                  className="flex-1 text-sm text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!notifications.some((n) => !n.read)}
                >
                  Mark all as read
                </button>
                <div className="w-px bg-gray-200"></div>
                <button
                  onClick={clearAllNotifications}
                  className="flex-1 text-sm text-red-600 font-medium py-2 rounded-lg hover:bg-red-50 transition"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- UPDATED Profile Dropdown (Matches target style) --- */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            key="profile-dropdown"
            ref={profileDropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            // --- UPDATED: rounded-lg and shadow-xl from target ---
            className="absolute right-4 top-16 mt-1 w-48 origin-top-right bg-white rounded-lg shadow-xl z-50 ring-1 ring-black ring-opacity-5 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="profile-btn"
          >
            {/* --- UPDATED: py-2 from target --- */}
            <div className="py-2" role="none">
              <button
                onClick={() => {
                  window.location.href = "/profile";
                  setIsProfileOpen(false);
                }}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
                role="menuitem"
              >
                <User
                  className="w-4 h-4 mr-2 text-gray-400"
                  aria-hidden="true"
                />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
                role="menuitem"
              >
                <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}