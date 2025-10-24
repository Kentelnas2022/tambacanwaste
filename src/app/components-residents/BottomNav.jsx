// src/app/components-residents/BottomNav.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  BookOpen, // Replaces ClipboardList
  AlertTriangle,
  User,
  LogOut, // ✅ Added Logout icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabaseClient"; // ✅ Added Supabase client for logout

// --- Props ---
// onOpenReport: function to open the report modal
// onOpenEducation: function to open the education modal
export default function BottomNav({ onOpenReport, onOpenEducation }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activePage, setActivePage] = useState("dashboard");

  // ✅ UPDATED: This effect no longer checks for "/history"
  useEffect(() => {
    const currentPath = pathname || "";
    let newActivePage = "dashboard"; // Default
    if (currentPath.includes("/profile")) {
      newActivePage = "profile";
    }
    setActivePage(newActivePage);
    localStorage.setItem("activePage", newActivePage);
  }, [pathname]);

  // Function to handle page navigation
  const handleNav = (key, href) => {
    setActivePage(key);
    localStorage.setItem("activePage", key);
    window.dispatchEvent(new Event("storage"));
    router.push(href);
  };

  // ✅ NEW: Function to handle user logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Reset active page and redirect to home/login
    setActivePage("dashboard");
    localStorage.setItem("activePage", "dashboard");
    router.push("/");
  };

  // --- ✅ UPDATED: navItems array ---
  // Order: Home, Education, Report (central), Profile, Logout
  const navItems = [
    {
      key: "dashboard",
      label: "Home",
      icon: (isActive) => (
        <Home
          className="w-6 h-6"
          fill={isActive ? "currentColor" : "none"}
        />
      ),
      onClick: () => handleNav("dashboard", "/residents"),
    },
    {
      key: "education",
      label: "Education", // ✅ Renamed from "Learn"
      icon: (isActive) => (
        <BookOpen
          className="w-6 h-6"
          strokeWidth={isActive ? 2.5 : 2}
        />
      ),
      onClick: onOpenEducation, // Uses the prop
    },
    {
      key: "report",
      label: "Report",
      icon: () => <AlertTriangle className="w-5 h-5" />,
      onClick: onOpenReport,
      isCentral: true,
    },
    {
      key: "profile",
      label: "Profile",
      icon: (isActive) => (
        <User
          className="w-6 h-6"
          fill={isActive ? "currentColor" : "none"}
        />
      ),
      onClick: () => handleNav("profile", "/profile"),
    },
    {
      key: "logout",
      label: "Logout", // ✅ Added Logout
      icon: (isActive) => (
        <LogOut
          className="w-6 h-6"
          strokeWidth={isActive ? 2.5 : 2}
        />
      ),
      onClick: handleLogout, // Uses new logout function
    },
  ];

  return (
    // This JSX does not need to change. The logic below
    // correctly handles the new 5-item array.
    <div className="fixed bottom-0 left-0 z-30 w-full h-16 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] border-t border-gray-200 flex items-center justify-center md:hidden">
      <AnimatePresence>
        {/* This map loops through all 5 items */}
        {navItems.map((item) => {
          // This finds "Report" and renders the invisible spacer
          if (item.isCentral) {
            return <div key={item.key} className="flex-1" />;
          }

          const isActive = activePage === item.key;

          // This renders "Home", "Education", "Profile", and "Logout"
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className="relative flex flex-1 h-full flex-col items-center justify-center"
            >
              <div
                className={`relative z-10 flex flex-col items-center gap-0.5 transition-colors ${
                  isActive ? "text-green-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.icon(isActive)}
                <span
                  className={`text-xs transition-all ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {/* The animated pill will only appear for "Home" or "Profile" */}
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-x-2.5 inset-y-2.5 bg-green-50 rounded-xl z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </AnimatePresence>

      {/* This renders the central "Report" button on top of the spacer */}
      <button
        onClick={onOpenReport}
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 z-40"
      >
        <div className="w-14 h-14 bg-red-600 text-white rounded-full shadow-lg ring-4 ring-white flex flex-col items-center justify-center transform transition-transform active:scale-95">
          {navItems.find((item) => item.isCentral).icon(false)}
          <span className="text-[9px] font-bold uppercase tracking-wide">
            Report
          </span>
        </div>
      </button>
    </div>
  );
}