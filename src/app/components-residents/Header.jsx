// components/layout/Header.jsx
"use client";

import React, { useEffect, useRef, useState } from "react"; // Ensure React is imported
import { supabase } from "@/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";
import {
  Bell,
  X,
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  CheckCircle2, // For modal footer
  Trash2, // For modal footer
  Inbox, // For empty state
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Time Helper ---
function formatTimeAgo(dateString) {
  if (!dateString) return ''; // Handle null/undefined dates
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) return 'just now'; // Handle future dates gracefully

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + "s ago";
}

// --- Notification Item Component (Uses 'notif' from notifications table) ---
function NotificationItem({ notif }) {
  const isRead = notif.read;

  return (
    <div className="flex gap-3 py-4 px-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/75">
      {/* Blue "unread" dot */}
      <div className="w-2.5 flex-shrink-0 pt-1.5">
        {!isRead && (
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
        )}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0">
        {/* 1. Main Message */}
        <p
          className={`text-sm ${
            isRead ? "text-gray-700" : "text-gray-900 font-semibold"
          }`}
        >
          {notif.message || "No message content."} {/* Added fallback */}
        </p>

        {/* 2. Status Badge */}
        {notif.status && (
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${
              notif.status === "Resolved"
                ? "bg-green-100 text-green-800"
                : notif.status === "In Progress"
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800" // Pending
            }`}
          >
            Status: {notif.status}
          </span>
        )}

        {/* 3. Official Response */}
        {notif.official_response && (
          <div className="mt-2 p-2 bg-gray-100 rounded-md border border-gray-200">
            <p className="text-xs font-semibold text-gray-800">
              Official Response:
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {notif.official_response}
            </p>
          </div>
        )}

        {/* 4. Timestamp */}
        <p
          className={`text-xs ${
            isRead ? "text-gray-400" : "text-blue-600 font-medium"
          } mt-2`}
        >
          {formatTimeAgo(notif.updated_at || notif.created_at)}
        </p>
      </div>
    </div>
  );
}

// --- Notification Modal Component (Includes working Footer) ---
function NotificationModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead, // Prop for marking read
  onClearAll, // Prop for clearing
}) {
  // ... (modal animation unchanged) ...
   const modalVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } },
  };

  const modalTransition = {
    ease: [0.32, 0.72, 0, 1],
    duration: 0.3,
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal Panel */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={modalTransition}
            className="fixed bottom-auto top-16 right-4 left-auto w-96 max-w-[90vw] max-h-[70vh] bg-white rounded-2xl shadow-xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Notifications
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Inbox className="w-12 h-12 mb-3" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">You have no new notifications.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Map over notifications state */}
                  {notifications.map((notif) => (
                    // Use 'id' from notifications table as key
                    <NotificationItem key={notif.id} notif={notif} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with working buttons */}
            {notifications.length > 0 && (
              <div className="p-4 flex gap-3 bg-gray-50/75 border-t border-gray-200 rounded-b-2xl">
                <button
                  onClick={() => {
                    onMarkAllAsRead(); // Call the passed function
                  }}
                  className="flex-1 text-sm flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                  // Disable if no unread notifications exist
                  disabled={!notifications.some(n => !n.read)}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark all as read
                </button>
                <button
                  onClick={() => {
                    onClearAll(); // Call the passed function
                  }}
                  className="flex-1 text-sm flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium transition hover:bg-gray-300 active:bg-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- Main Header Component ---
export default function Header() {
  const [open, setOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  // ✅ State uses 'notifications'
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("/default-avatar.png");
  const router = useRouter();
  const pathname = usePathname();
  // ✅ Renamed channel ref
  const notificationChannelRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      // ... (Auth unchanged) ...
       const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        console.error("Auth fetch error:", error?.message);
        // Consider redirecting if no user
        // router.push('/login');
        return;
      }
      const currentUser = data.user;
      setUser(currentUser);
      setUserEmail(currentUser.email || "Unknown User");

      // ... (Avatar fetch unchanged) ...
        const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", currentUser.id)
        .single();
      if (profile?.avatar_url) setUserAvatar(profile.avatar_url);


      // ✅ Fetch initial notifications and subscribe
      await fetchNotifications(currentUser.id);
      subscribeToNotifications(currentUser.id);
    };

    init();

    return () => {
      // ... (Cleanup unchanged) ...
       if (notificationChannelRef.current) {
        supabase.removeChannel(notificationChannelRef.current);
        notificationChannelRef.current = null;
      }
    };
  }, []); // Added empty dependency array to run only once

  // ... (Active page logic unchanged) ...
   useEffect(() => {
    const currentPath = pathname || "";
    let newActivePage = "dashboard"; // Default
    if (currentPath.includes("/profile")) {
      newActivePage = "profile";
    } else if (currentPath.includes("/history")) {
      newActivePage = "activity";
    }
    setActivePage(newActivePage);
  }, [pathname]);

  // ✅ Fetches from 'notifications' table
  const fetchNotifications = async (uid) => {
    // Make sure user ID is valid before fetching
    if (!uid) return;

    const { data, error } = await supabase
      .from("notifications")
      // Ensure all needed columns are selected
      .select("id, message, status, official_response, created_at, updated_at, read, report_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }); // Or updated_at if you prefer

    if (error) {
        console.error("Fetch notifications error:", error.message);
        setNotifications([]); // Set to empty array on error
    }
    else setNotifications(data || []);
  };

  // ✅ Subscribes to 'notifications' table
  const subscribeToNotifications = (uid) => {
    if (notificationChannelRef.current || !uid) return; // Prevent multiple subs or subbing without user

    notificationChannelRef.current = supabase
      .channel(`realtime-notifications-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for INSERT, UPDATE, DELETE
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`, // Filter changes for the current user
        },
        (payload) => {
          const newNotif = payload.new;
          const oldNotif = payload.old;
          let showUpdateAlert = false;
          let alertTitle = "";
          let alertText = "";

          console.log("Notification change received:", payload); // Log for debugging

          switch (payload.eventType) {
            case "INSERT":
              setNotifications((prev) => {
                // Prevent adding if already exists (belt-and-suspenders for upsert)
                const exists = prev.some((n) => n.id === newNotif.id);
                if (exists) return prev;
                showUpdateAlert = true;
                alertTitle = "New Notification";
                alertText = newNotif.message;
                return [newNotif, ...prev]; // Add to start of list
              });
              break;

            case "UPDATE":
              setNotifications((prev) =>
                // Update the specific notification in the list
                prev.map((n) => (n.id === newNotif.id ? { ...n, ...newNotif } : n))
              );
               showUpdateAlert = true;
               alertTitle = "Notification Updated";
               alertText = newNotif.official_response && newNotif.official_response !== oldNotif?.official_response
                ? `Response added/updated for your report.` // More generic if only response changed
                : `Report status changed to ${newNotif.status}.`;
               // Avoid alert if only 'read' status changed
               if (oldNotif && newNotif.read !== oldNotif.read && Object.keys(payload.old).length === 1) {
                   showUpdateAlert = false;
               }
              break;

            case "DELETE":
              setNotifications((prev) =>
                prev.filter((n) => n.id !== oldNotif.id)
              );
              // Optionally show a different alert for deletion
              // showUpdateAlert = true;
              // alertTitle = "Notification Removed";
              // alertText = "A notification was removed.";
              break;
            default:
              console.log("Unhandled event type:", payload.eventType);
              break;
          }
          // Show alert outside the state setter if needed
           if (showUpdateAlert) {
              Swal.fire({
                icon: payload.eventType === 'INSERT' ? "info" : "success",
                title: alertTitle,
                text: alertText,
                timer: 3000, // Slightly longer timer
                showConfirmButton: false,
                toast: true, // Use toast for less interruption
                position: 'top-end'
              });
           }
        }
      )
     .subscribe((status, err) => {
if (status === 'SUBSCRIBED') {
console.log(`Subscribed to notifications for user ${uid}`);
} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
 // These are actual errors
 console.error(`Subscription failed: ${status}`, err);
// Optionally try to resubscribe after a delay
} else if (status === 'CLOSED') {
// This is an intentional close, usually from the useEffect cleanup
console.log(`Subscription closed for user ${uid}`);
}

// You can keep this or merge it into the 'CHANNEL_ERROR' block
if (err) {
console.error("Subscription specific error:", err);
}
});
  }
  // ✅ Mark all as read (targets 'notifications' table)
  const markAllAsRead = async () => {
    if (!user) return; // Need user to perform action

    // Find IDs of notifications that are currently unread
    const unreadIds = notifications
      .filter((n) => !n.read)
      .map((n) => n.id);

    if (unreadIds.length === 0) {
      // Don't show alert if nothing to mark
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() }) // Also update timestamp
      .eq('user_id', user.id) // Ensure we only update for the current user
      .in("id", unreadIds); // Target only the unread ones

    if (error) {
      console.error("Mark read error:", error.message);
      Swal.fire("Error", "Could not mark notifications as read.", "error");
    } else {
      // Update local state immediately for responsiveness
      // This is handled automatically by the subscription now,
      // but doing it locally feels faster. Ensure consistency.
       setNotifications((prev) =>
         prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n))
       );
       console.log("Marked as read:", unreadIds);
    }
  };

  // ✅ Clear all (targets 'notifications' table)
  const clearAllNotifications = async () => {
     if (!user || !notifications.length) {
       // Don't show confirmation if nothing to clear or no user
      return;
    }

    const confirm = await Swal.fire({
      title: "Clear all notifications?",
      text: "This will permanently delete all your notifications.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete all",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id); // Make sure to only delete for the current user

    if (error) {
      console.error("Delete error:", error.message);
      Swal.fire("Error", "Failed to delete notifications.", "error");
    } else {
      // State update might be handled by subscription, but clear locally too.
      setNotifications([]);
      setIsNotifOpen(false); // Close modal
      Swal.fire("Cleared!", "All notifications deleted.", "success");
    }
  };


  const openNotifModal = () => {
    // Check 'notifications' state here
    if (!notifications.length) {
      Swal.fire({
        title: "No Notifications",
        text: "You're all caught up!",
        icon: "info",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }
    setIsNotifOpen(true);
  };

  // ✅ Calculates unread count from 'notifications' state
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ... (handleLogout, shortenEmail, menuItems unchanged) ...
   const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("activePage");
    setOpen(false);
    router.push("/login");
  };

  const shortenEmail = (email) =>
    email.length > 20 ? email.slice(0, 17) + "..." : email;

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      href: "/residents",
    },
    {
      key: "profile",
      label: "Profile",
      icon: <User className="w-5 h-5" />,
      href: "/profile",
    },
    {
      key: "activity",
      label: "Activity Log",
      icon: <ClipboardList className="w-5 h-5" />,
      href: "/history",
    },
  ];


  return (
    <>
      {/* 1. HEADER (Top Bar) - Uses unreadCount */}
      <nav className="bg-[#8B0000] text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Residents Dashboard</h1>
          <div className="flex items-center gap-3 relative">
            <button
              onClick={openNotifModal}
              className="relative p-2 rounded-full hover:bg-[#a30000] transition"
            >
              <Bell className="w-6 h-6" />
              {/* Uses the unreadCount state */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold ring-2 ring-[#8B0000]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-full hover:bg-[#a30000] transition hidden md:block"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. SIDEBAR (Desktop - Unchanged) */}
       <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setOpen(false)}
      >
        <div
          className={`fixed top-0 right-0 h-full w-72 bg-gradient-to-b from-white to-gray-100 shadow-2xl flex flex-col transform transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          } rounded-l-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-[#8B0000] text-white rounded-tl-2xl">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-full hover:bg-[#a30000] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Profile */}
          <div className="flex flex-col items-center py-6 border-b">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#8B0000] shadow-md mb-3">
              <img
                src={userAvatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-base font-semibold text-gray-800">
              {shortenEmail(userEmail)}
            </p>
          </div>
          {/* Menu Items */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="py-4 space-y-1 px-3">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    router.push(item.href);
                    setActivePage(item.key);
                    localStorage.setItem("activePage", item.key);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full text-left px-5 py-3 font-medium rounded-lg transition-all ${
                    activePage === item.key
                      ? "bg-[#8B0000] text-white shadow-md"
                      : "text-gray-800 hover:bg-[#8B0000]/10"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            {/* Logout */}
            <div className="border-t p-4">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium hover:bg-gray-900 transition"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* 3. NOTIFICATION MODAL (Using 'notifications' state and working actions) */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={markAllAsRead} // Pass the working function
        onClearAll={clearAllNotifications} // Pass the working function
      />
    </>
  );
}