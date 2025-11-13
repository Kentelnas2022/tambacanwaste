// components-residents/ScheduleSection.jsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. HELPER: Format Time ---
const formatTime = (timeStr) => {
  if (!timeStr) return "N/A";
  const [h, m] = timeStr.split(":");
  if (isNaN(h) || isNaN(m)) return "Invalid Time";
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// --- 2. HELPER: Format Date ---
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

// --- 3. HELPER: Normalize Purok ---
const normalizePurok = (p) => p.replace(/^Purok\s*/i, "").trim();

// --- 4. ICON + COLOR ---
const getWasteStyle = (wasteName, status) => {
  if (status === "ongoing") {
    return {
      title: "Today - General Waste",
      bgColor: "bg-green-50",
      borderColor: "border-green-500",
      titleColor: "text-green-800",
      subtextColor: "text-green-600",
      tagColor: "bg-green-500",
      tagText: "ONGOING",
    };
  }

  const name = (wasteName || "general").toLowerCase();
  if (name.includes("recycling") || name.includes("recyclable")) {
    return {
      title: `${wasteName}`,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
      titleColor: "text-blue-800",
      subtextColor: "text-blue-600",
      tagColor: "bg-blue-500",
      tagText: "UPCOMING",
    };
  }
  if (name.includes("organic") || name.includes("biodegradable")) {
    return {
      title: `${wasteName}`,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-500",
      titleColor: "text-yellow-800",
      subtextColor: "text-yellow-600",
      tagColor: "bg-yellow-500",
      tagText: "UPCOMING",
    };
  }
  return {
    title: `${wasteName}`,
    bgColor: "bg-gray-50",
    borderColor: "border-gray-500",
    titleColor: "text-gray-800",
    subtextColor: "text-gray-600",
    tagColor: "bg-gray-500",
    tagText: "UPCOMING",
  };
};

// --- 5. SCHEDULE CARD ---
function ScheduleCard({ sched, status }) {
  const wasteName = sched.waste_type || "General Waste";
  const {
    bgColor,
    borderColor,
    titleColor,
    subtextColor,
    tagColor,
    tagText,
  } = getWasteStyle(wasteName, status);

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const displayTitle =
    status === "ongoing"
      ? `Today - ${wasteName}`
      : `${sched.day} - ${wasteName}`;
  const displayDate = formatDate(sched.date);
  const displayTime = `${formatTime(sched.start_time)} - ${formatTime(
    sched.end_time
  )}`;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={`${bgColor} border-l-4 ${borderColor} p-4 rounded`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className={`font-semibold ${titleColor}`}>{displayTitle}</p>
          <p className={`text-sm ${subtextColor} mt-1`}>{displayDate}</p>
          <p className={`text-sm ${subtextColor} mt-1`}>{displayTime}</p>
        </div>
        <span className={`${tagColor} text-white px-2 py-1 rounded text-xs`}>
          {tagText}
        </span>
      </div>
    </motion.div>
  );
}

// --- 6. SKELETON CARD ---
function ScheduleCardSkeleton() {
  return (
    <div className="bg-gray-50 border-l-4 border-gray-200 p-4 rounded animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-32 mt-1"></div>
          <div className="h-3 bg-gray-300 rounded w-40 mt-1"></div>
        </div>
        <div className="h-5 w-16 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
}

// --- 7. EMPTY STATE ---
function EmptyState({ title, message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center text-center text-gray-500 text-sm py-6"
    >
      <AlertCircle className="w-12 h-12 text-gray-300" />
      <p className="font-medium text-gray-600 mt-3">{title}</p>
      <p className="mt-1">{message}</p>
    </motion.div>
  );
}

// --- 8. MAIN COMPONENT ---
export default function ScheduleSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH USER PUROK ---
  const fetchUserPurok = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("purok")
        .eq("uid", user.id)
        .single();
      if (profile?.purok) setResidentPurok(profile.purok);
    }
  };

  // --- UPDATED LOGIC (TIMEZONE-SAFE & ACCURATE) ---
  const updateSchedules = useCallback((data) => {
    const now = new Date();

    const ongoingSchedules = [];
    const futureSchedules = [];

    data.forEach((s) => {
      if (!s.date || !s.start_time || !s.end_time) return;

      // Convert to local time properly
      const [year, month, day] = s.date.split("-").map(Number);
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);

      const start = new Date(year, month - 1, day, sh, sm);
      const end = new Date(year, month - 1, day, eh, em);

      // Handle overnight schedules (crossing midnight)
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }

      // Determine if ongoing or upcoming
      if (now >= start && now <= end) {
        ongoingSchedules.push(s);
      } else if (start > now) {
        futureSchedules.push(s);
      }
    });

    // Sort upcoming
    futureSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Auto promote first upcoming if it's already started
    if (ongoingSchedules.length === 0 && futureSchedules.length > 0) {
      const first = futureSchedules[0];
      const [year, month, day] = first.date.split("-").map(Number);
      const [sh, sm] = first.start_time.split(":").map(Number);
      const start = new Date(year, month - 1, day, sh, sm);
      if (start <= now) {
        ongoingSchedules.push(first);
        futureSchedules.shift();
      }
    }

    setOngoing(ongoingSchedules);
    setUpcoming(futureSchedules.slice(0, 2));
  }, []);

  // --- FETCH SCHEDULES ---
  const fetchSchedules = useCallback(
    async (purok) => {
      setLoading(true);
      const normalized = normalizePurok(purok);
      try {
        const { data, error } = await supabase
          .from("schedules")
          .select("*")
          .ilike("purok", `%${normalized}%`)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) console.error(error);
        else updateSchedules(data);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    },
    [updateSchedules]
  );

  // --- USE EFFECTS ---
  useEffect(() => {
    fetchUserPurok();
  }, []);

  useEffect(() => {
    if (residentPurok) {
      fetchSchedules(residentPurok);

      const channel = supabase
        .channel("schedule-updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "schedules" },
          () => fetchSchedules(residentPurok)
        )
        .subscribe();

      const interval = setInterval(() => fetchSchedules(residentPurok), 60000);
      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [residentPurok, fetchSchedules]);

  // --- RENDER ---
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        Waste Collection Schedule
      </h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Ongoing & Upcoming
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <>
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
            </>
          ) : (
            <AnimatePresence>
              {ongoing.map((s) => (
                <ScheduleCard key={s.schedule_id} sched={s} status="ongoing" />
              ))}
              {upcoming.map((s) => (
                <ScheduleCard key={s.schedule_id} sched={s} status="upcoming" />
              ))}
            </AnimatePresence>
          )}
        </div>

        {!loading && ongoing.length === 0 && upcoming.length === 0 && (
          <EmptyState
            title="No Upcoming Collections"
            message="No collections are scheduled for your purok at this time."
          />
        )}
      </div>
    </div>
  );
}
