// src/app/components-residents/BottomNav.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  AlertTriangle,
  User,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabaseClient";

export default function BottomNav({ onOpenReport, onOpenEducation }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => {
    const currentPath = pathname || "";
    let newActivePage = "dashboard";
    if (currentPath.includes("/profile")) {
      newActivePage = "profile";
    }
    setActivePage(newActivePage);
    localStorage.setItem("activePage", newActivePage);
  }, [pathname]);

  const handleNav = (key, href) => {
    setActivePage(key);
    localStorage.setItem("activePage", key);
    window.dispatchEvent(new Event("storage"));
    router.push(href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActivePage("dashboard");
    localStorage.setItem("activePage", "dashboard");
    router.push("/");
  };

  // --- ✅ UPDATED: navItems array ---
  // All icons now use 'strokeWidth' for a consistent, minimal active state
  // instead of 'fill', which can look heavy.
  const navItems = [
    {
      key: "dashboard",
      label: "Home",
      icon: (isActive) => (
        <Home
          className="w-6 h-6"
          strokeWidth={isActive ? 2.5 : 2} // ✅ Changed from 'fill'
        />
      ),
      onClick: () => handleNav("dashboard", "/residents"),
    },
    {
      key: "education",
      label: "Education",
      icon: (isActive) => (
        <BookOpen
          className="w-6 h-6"
          strokeWidth={isActive ? 2.5 : 2} // Unchanged, already good
        />
      ),
      onClick: onOpenEducation,
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
          strokeWidth={isActive ? 2.5 : 2} // ✅ Changed from 'fill'
        />
      ),
      onClick: () => handleNav("profile", "/profile"),
    },
    {
      key: "logout",
      label: "Logout",
      icon: (isActive) => (
        <LogOut
          className="w-6 h-6"
          strokeWidth={isActive ? 2.5 : 2} // Unchanged, already good
        />
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-30 w-full h-16 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] border-t border-gray-200 flex items-center justify-center md:hidden">
      <AnimatePresence>
        {navItems.map((item) => {
          if (item.isCentral) {
            return <div key={item.key} className="flex-1" />;
          }

          const isActive = activePage === item.key;

          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className="relative flex flex-1 h-full flex-col items-center justify-center"
            >
              {/* This 'div' is now the relative parent for the new indicator */}
              <div
                className={`relative z-10 flex flex-col items-center gap-0.5 transition-colors ${
                  isActive ? "text-red-600" : "text-gray-500 hover:text-gray-700"
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

                {/* --- ✅ ADDED: New minimal dot indicator --- */}
                {/* This replaces the old background pill. */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-dot" // New layoutId
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-600 rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                {/* --- End of new indicator --- */}
              </div>

              {/* --- ✅ DELETED: Old "pill" indicator --- */}
              {/* The motion.div that was here has been removed. */}
            </button>
          );
        })}
      </AnimatePresence>

      {/* This central "Report" button is unchanged */}
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