// src/app/components-residents/ScheduleCard.jsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Leaf,
  Recycle,
  AlertTriangle,
  Trash2,
  Package,
} from "lucide-react";
import clsx from "clsx";

/**
 * Gets the corresponding icon and colors for a given waste type.
 */
const getWasteTypeVisuals = (wasteName = "General Waste") => {
  const name = wasteName.toLowerCase();

  if (name.includes("biodegradable")) {
    return {
      Icon: Leaf,
      textColor: "text-green-600",
      bgColor: "bg-green-100",
    };
  }
  if (name.includes("recyclable")) {
    return {
      Icon: Recycle,
      textColor: "text-blue-600",
      bgColor: "bg-blue-100",
    };
  }
  if (name.includes("hazardous")) {
    return {
      Icon: AlertTriangle,
      textColor: "text-red-600",
      bgColor: "bg-red-100",
    };
  }
  if (name.includes("non-biodegradable")) {
    return {
      Icon: Package,
      textColor: "text-gray-600",
      bgColor: "bg-gray-100",
    };
  }
  // Default for "General Waste" or others
  return {
    Icon: Trash2,
    textColor: "text-slate-600",
    bgColor: "bg-slate-100",
  };
};

/**
 * Formats a "HH:mm" time string into a 12-hour (AM/PM) format.
 */
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// --- New Schedule Card Component ---
export function ScheduleCard({ sched, status }) {
  const wasteName =
    sched.recyclable_type || sched.waste_type || "General Waste";
  
  // Get new visuals
  const { Icon, textColor, bgColor } = getWasteTypeVisuals(wasteName);

  const isOngoing = status === "ongoing";
  const statusColor = isOngoing ? "bg-emerald-500" : "bg-gray-400";
  const statusText = isOngoing ? "Ongoing Now" : "Upcoming";

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="flex items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm"
    >
      {/* 1. NEW Icon Circle */}
      <div
        className={clsx(
          "flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full",
          bgColor
        )}
      >
        <Icon className={clsx("w-5 h-5", textColor)} />
      </div>

      {/* 2. Middle Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base text-gray-900 truncate">
          {wasteName}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {sched.day}, {formatTime(sched.start_time)} -{" "}
          {formatTime(sched.end_time)}
        </p>
      </div>

      {/* 3. Right Side: Status Tag */}
      <div className="flex-shrink-0 ml-3">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-2.5 h-2.5 rounded-full",
              statusColor,
              isOngoing && "animate-pulse"
            )}
          ></div>
          <span
            className={clsx(
              "text-sm font-medium",
              isOngoing ? "text-emerald-700" : "text-gray-600"
            )}
          >
            {statusText}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// --- New Skeleton Component ---
export function ScheduleCardSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm animate-pulse">
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gray-200"></div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="flex-shrink-0 ml-3">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  );
}