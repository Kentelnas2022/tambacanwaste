// components-residents/BottomNav.jsx
"use client";

// --- REMOVED: Unused imports (useEffect, useState, useRouter, usePathname, supabase) ---
import {
  Calendar,     // Replaces LayoutDashboard
  BookOpen,
  AlertTriangle,
} from "lucide-react";

// --- UPDATED: Component now takes props from page.jsx ---
export default function BottomNav({ activePage, onNavClick }) {

  // --- REMOVED: All useEffect, localStorage, and handler logic ---

  const navItems = [
    {
      key: "schedule",
      label: "Schedule",
      icon: (isActive) => (
        <Calendar className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
      ),
    },
    {
      key: "report",
      label: "Report",
      icon: (isActive) => (
        <AlertTriangle className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
      ),
    },
    {
      key: "education",
      label: "Education",
      icon: (isActive) => (
        <BookOpen className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
      ),
    },
  ];

  // The JSX is from our previous step
  return (
    <nav className="sticky bottom-0 left-0 z-30 w-full bg-white border-t border-gray-200 md:hidden">
      <div className="flex justify-around max-w-7xl mx-auto px-4 py-3">
        
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              // --- UPDATED: Click handler now uses the prop ---
              onClick={() => onNavClick(item.key)}
              className={`nav-btn flex flex-col items-center text-xs font-medium ${
                isActive ? "text-accent-600" : "text-gray-400"
              }`}
            >
              {item.icon(isActive)}
              <span>{item.label}</span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}