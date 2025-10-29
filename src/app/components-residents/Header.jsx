"use client";

import React, { useEffect, useRef, useState, useMemo } from "react"; 
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation"; 
import Swal from "sweetalert2";
import {
  Bell,         // Used in both
  X,            // Used in both modals
  User,         // Used for Profile Dropdown
  LogOut,       // Used for Profile Dropdown
  CheckCircle2, // Used in original modal footer
  Trash2,      // Used in original modal footer
  Inbox,       // Used in original modal empty state
  // Menu, LayoutDashboard, ClipboardList (Removed - from original sidebar)
  // Clock, AlertCircle (Removed - from minimalist item)
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Time Helper (Copied from original) ---
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) return 'just now';

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + (interval >= 2 ? " years ago" : " year ago");
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + (interval >= 2 ? " months ago" : " month ago");
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + (interval >= 2 ? " days ago" : " day ago");
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + (interval >= 2 ? " hours ago" : " hour ago");
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + (interval >= 2 ? " minutes ago" : " minute ago");
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + " seconds ago";
}

// --- REMOVED: getNotifStyle helper (was for minimalist items) ---

// --- Notification Item Component (FROM ORIGINAL CODE) ---
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
          className={`text-sm break-words ${ 
            isRead ? "text-gray-700" : "text-gray-900 font-semibold"
          }`}
        >
          {notif.message || "No message content."} 
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
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words"> 
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


// --- Notification Modal Component (FROM ORIGINAL CODE, including positioning & blur) ---
function NotificationModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead, 
  onClearAll, 
}) {
   const modalVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } },
  };

  const modalTransition = {
    ease: [0.32, 0.72, 0, 1], 
    duration: 0.3,
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden'; 
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = ''; 
    }
    return () => {
      document.body.style.overflow = ''; 
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (with blur) */}
          <motion.div
            key="notif-backdrop-original"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            // ✅ Original blur class. Ensure it works in your Tailwind setup.
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" 
          />

          {/* Modal Panel (positioned top-right) */}
          <motion.div
            key="notif-modal-original"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={modalTransition}
            onClick={(e) => e.stopPropagation()}
            // ✅ Original positioning classes
            className="fixed bottom-auto top-16 right-4 left-auto w-96 max-w-[90vw] max-h-[70vh] bg-white rounded-2xl shadow-xl flex flex-col z-50" 
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-modal-title-original"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 id="notification-modal-title-original" className="text-lg font-semibold text-gray-900">
                Notifications
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 rounded-full hover:bg-gray-100 transition"
                aria-label="Close notifications"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body (Uses the original NotificationItem) */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 min-h-[200px]">
                  <Inbox className="w-12 h-12 mb-3 text-gray-400" aria-hidden="true" />
                  <p className="font-medium text-gray-700">All caught up!</p>
                  <p className="text-sm">You have no new notifications.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <NotificationItem key={notif.id} notif={notif} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 flex gap-3 bg-gray-50/75 border-t border-gray-200 rounded-b-2xl flex-shrink-0">
                <button
                  onClick={onMarkAllAsRead} 
                  className="flex-1 text-sm flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed" // Original blue color
                  disabled={!notifications.some(n => !n.read)}
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true"/>
                  Mark all as read
                </button>
                <button
                  onClick={onClearAll} 
                  className="flex-1 text-sm flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium transition hover:bg-gray-300 active:bg-gray-400" // Original gray color
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true"/>
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
export default function Header({ activePage }) {
  // Profile state remains the same
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  
  // Notification state (using original logic source)
  const [isNotifOpen, setIsNotifOpen] = useState(false); 
  const [notifications, setNotifications] = useState([]); // Use 'notifications' to match original logic
  
  const [user, setUser] = useState(null);
  
  const router = useRouter();
  // Notification ref (using original logic source)
  const notificationChannelRef = useRef(null); 
  const profileBtnRef = useRef(null);
  const profileDropdownRef = useRef(null);

 // --- Auth & Data Initialization (USING ORIGINAL LOGIC'S APPROACH) ---
 useEffect(() => {
    let isMounted = true; // Flag to prevent setting state on unmounted component

    const init = async () => {
      console.log("(Original Init) Fetching user...");
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("(Original Init) Auth fetch error:", error?.message);
        return; // Early exit on error
      }
      
      const currentUser = data?.user;
      if (isMounted && currentUser) {
        console.log("(Original Init) User found:", currentUser.id);
        setUser(currentUser);
        // Fetch initial notifications and subscribe (using original functions)
        await fetchNotifications(currentUser.id);
        subscribeToNotifications(currentUser.id);
      } else if (isMounted) {
          console.log("(Original Init) No user session found on init.");
          // Clear state if no user on initial load (optional but good practice)
          setNotifications([]);
      }
    };

    init();

    // Original code didn't explicitly listen to onAuthStateChange, 
    // relying on page reload or component remount. We'll keep the init logic.
    // If you NEED instant updates on login/logout without page refresh, 
    // the onAuthStateChange listener is better, but let's stick to the original first.

    return () => {
      isMounted = false; // Set flag on unmount
      console.log("(Original Cleanup) Unsubscribing from notifications channel.");
      if (notificationChannelRef.current) {
        supabase.removeChannel(notificationChannelRef.current)
            .catch(err => console.error("(Original Cleanup) Error removing channel:", err));
        notificationChannelRef.current = null;
      }
    };
  }, []); // Run only once on mount


  // --- Close dropdown on outside click (Kept current logic) ---
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
     };
     document.addEventListener("mousedown", handleClickOutside);
     return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [isProfileOpen]); 

  // --- Data Fetching & Realtime (USING ORIGINAL LOGIC) ---
  const fetchNotifications = async (uid) => {
  if (!uid) {
    console.log("❌ No user ID provided for fetching notifications");
    return;
  }

  try {
    console.log("📥 Fetching notifications for user:", uid);

    const { data, error } = await supabase
      .from("notifications")
      .select("id, message, user_id, status, official_response, created_at, updated_at, read, report_id")
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
     // Prevent multiple subs or subbing without user (from original)
     if (notificationChannelRef.current || !uid) { 
        console.log(`(Original Sub) ${notificationChannelRef.current ? 'Already subscribed' : 'No UID'}, skipping subscribe.`);
        return; 
     }

     console.log("(Original Sub) Attempting subscribe for:", uid);
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
           console.log("(Original Sub) Change received:", payload); 
           // Re-fetch data on change
           fetchNotifications(uid); 

           // --- Original Toast Logic ---
           const newNotif = payload.new;
           const oldNotif = payload.old;
           let showUpdateAlert = false;
           let alertTitle = "";
           let alertText = "";

           if (payload.eventType === 'INSERT') {
              // Check if notification might already exist due to potential race conditions
              const exists = notifications.some(n => n.id === newNotif.id);
              if (!exists) {
                showUpdateAlert = true;
                alertTitle = "New Notification";
                alertText = newNotif.message;
              }
           } else if (payload.eventType === 'UPDATE') {
              // Avoid alert if only 'read' status changed
              const readChangedOnly = newNotif.read !== oldNotif?.read && Object.keys(payload.old || {}).length === 1 && 'read' in (payload.old || {});
              if (!readChangedOnly) {
                 showUpdateAlert = true;
                 alertTitle = "Notification Updated";
                 alertText = newNotif.official_response && newNotif.official_response !== oldNotif?.official_response
                   ? `Response added/updated.`
                   : `Status changed to ${newNotif.status}.`;
              }
           }

           if (showUpdateAlert) {
             Swal.fire({
               icon: payload.eventType === 'INSERT' ? "info" : "success",
               title: alertTitle,
               text: alertText,
               timer: 3000, 
               showConfirmButton: false,
               toast: true, 
               position: 'top-end',
               timerProgressBar: true
             });
           }
         }
       )
       .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
           console.log(`(Original Sub) Successfully subscribed for user ${uid}`);
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
           console.error(`(Original Sub) Subscription failed: ${status}`, err);
           // Clear ref on failure to allow retry?
           notificationChannelRef.current = null; 
         } else if (status === 'CLOSED') {
           console.log(`(Original Sub) Subscription closed for user ${uid}`);
           // Clear ref when closed?
           notificationChannelRef.current = null;
         }
         if (err) {
           console.error("(Original Sub) Subscription specific error:", err);
         }
       });
     notificationChannelRef.current = channel; // Assign channel to ref
   };
  
  // --- Notification Actions (USING ORIGINAL LOGIC) ---
   const markAllAsRead = async () => {
     if (!user) return; 
     const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
     if (unreadIds.length === 0) return;

     console.log("(Original Action) Marking as read:", unreadIds);
     try {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true, updated_at: new Date().toISOString() }) 
            .eq('user_id', user.id) 
            .in("id", unreadIds); 

        if (error) throw error;
        // Original code had optimistic update here:
        setNotifications((prev) =>
          prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n))
        );
        console.log("(Original Action) Marked as read locally/DB.");

     } catch(error) {
        console.error("(Original Action) Mark read error:", error.message);
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
       customClass: { popup: 'rounded-lg' }
     });

     if (!confirm.isConfirmed) return;

     console.log("(Original Action) Clearing all notifications...");
     try {
        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", user.id); 
            
        if (error) throw error;

        // Original code had optimistic update and success Swal here:
        setNotifications([]); 
        setIsNotifOpen(false); // Close modal
        console.log("(Original Action) Cleared all locally/DB.");
        Swal.fire("Cleared!", "All notifications deleted.", "success");

     } catch(error) {
        console.error("(Original Action) Delete error:", error.message);
        Swal.fire("Error", "Failed to delete notifications.", "error");
     }
   };


   // --- openNotifModal (USING ORIGINAL LOGIC) ---
   const openNotifModal = () => {
     console.log("(Original Action) openNotifModal called.");
     // Check 'notifications' state length *before* opening
     if (!user) { // Added check for user login
        console.log("(Original Action) No user logged in.");
        Swal.fire("Login Required", "Please log in to view notifications.", "warning");
        return;
     }
     if (notifications.length === 0) {
        console.log("(Original Action) No notifications in state, showing Swal.");
        Swal.fire({
            title: "No Notifications",
            text: "You're all caught up!",
            icon: "info",
            timer: 2000,
            showConfirmButton: false,
        });
        // Optionally fetch here in case state is stale
        // fetchNotifications(user.id); 
        return; // Don't open if empty
     }
     console.log("(Original Action) Opening notification modal.");
     // Optional: Fetch latest just before opening
     // fetchNotifications(user.id); 
     setIsNotifOpen(true); 
   };
  
  // Memoized unread count (using original logic source)
  const unreadCount = useMemo(() => {
      // Ensure notifications is always an array
      return (notifications || []).filter((n) => !n.read).length;
  }, [notifications]);
  
  // --- Logout Handler (Kept current improved logic) ---
  const handleLogout = async () => {
    console.log("Attempting to sign out...");
    setIsProfileOpen(false); 
    const { error } = await supabase.auth.signOut();
    if (error) {
       console.error("Error signing out:", error.message);
       Swal.fire("Error", "Could not sign out. Please try again.", "error");
    } else {
      console.log("Sign out successful.");
      // State cleanup should happen via onAuthStateChange listener
      router.push("/login"); // Redirect
    }
  };

  // --- Dynamic Page Title Helper (Kept current logic) ---
  const getPageTitle = (page) => {
    switch (page) {
      case 'schedule': return 'Schedule';
      case 'report': return 'Report an Issue';
      case 'education': return 'Education';
      case 'profile': return 'Profile';
      default:
        console.warn("getPageTitle called with unknown page key:", page);
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        if (path.includes('/report')) return 'Report an Issue';
        if (path.includes('/education')) return 'Education';
        if (path.includes('/profile')) return 'Profile';
        return 'Schedule'; 
    }
  };

  return (
    <>
      {/* Header Bar (Dark Red theme) */}
      <nav className="bg-[#8B0000] text-white px-4 py-4 sticky top-0 z-40 shadow-md"> 
        <div className="flex justify-between items-center">
          <h1 id="page-title" className="text-xl font-bold text-white">
            {getPageTitle(activePage)}
          </h1>
          
          <div className="flex items-center space-x-3 sm:space-x-4"> 
            
            {/* Notification Button (USING ORIGINAL STYLING adapted for dark bg) */}
            <button
              onClick={openNotifModal} // Uses original openNotifModal
              className="relative p-2 text-white rounded-full " 
              aria-label="Open notifications"
            >
              <Bell className="w-6 h-6" />
              {/* Original badge styling */}
              {unreadCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 bg-red-600 text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold ring-2 ring-[#8B0000]" // Original badge classes
                  aria-label={`${unreadCount} unread notifications`}
                 >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            
            {/* Profile Button (Current logic/styling) */}
            <button
              ref={profileBtnRef}
              id="profile-btn"
              onClick={(e) => { e.stopPropagation(); setIsProfileOpen(prev => !prev); }}
              className="relative p-1 text-white rounded-full " 
              aria-label="Open profile menu"
              aria-haspopup="true"
              aria-expanded={isProfileOpen} 
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Profile Dropdown (Current logic/styling) */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            key="profile-dropdown" 
            ref={profileDropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }} 
            className="absolute right-4 top-16 mt-1 w-48 origin-top-right bg-white rounded-md shadow-lg z-50 ring-1 ring-black ring-opacity-5 focus:outline-none" 
            role="menu" aria-orientation="vertical" aria-labelledby="profile-btn"
          >
            <div className="py-1" role="none"> 
              <button
                onClick={() => { router.push('/profile'); setIsProfileOpen(false); }}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150" 
                role="menuitem"
              >
                <User className="w-4 h-4 mr-2 text-gray-400" aria-hidden="true" /> 
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
      
      {/* Notification Modal (USING ORIGINAL COMPONENT & LOGIC) */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications} // Passed 'notifications' state
        onMarkAllAsRead={markAllAsRead} // Passed original function
        onClearAll={clearAllNotifications} // Passed original function
      />
    </>
  );
}