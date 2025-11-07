// components-residents/ScheduleSection.jsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import {
  Calendar,
  Leaf,
  Trash2,
  Recycle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. HELPER: Format Time (Unchanged) ---
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

// --- 2. HELPER: Format Date (Unchanged) ---
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: 'UTC',
  });
};

// --- 3. HELPER: Purok Normalizer (Unchanged) ---
const normalizePurok = (p) => p.replace(/^Purok\s*/i, "").trim();

// --- 4. UPDATED: Icon and Color selector (Unchanged from your code) ---
const getWasteStyle = (wasteName, status) => {
  if (status === "ongoing") {
    return {
      title: "Today - General Waste",
      bgColor: "bg-green-50",
      borderColor: "border-green-500",
      titleColor: "text-green-800",
      subtextColor: "text-green-600",
      tagColor: "bg-green-500",
      tagText: "TODAY",
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
  // Default to General Waste
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


// --- 5. UPDATED SCHEDULE CARD (Time range added) ---
function ScheduleCard({ sched, status }) {
  const wasteName = sched.waste_type || "General Waste";
  const {
    title,
    bgColor,
    borderColor,
    titleColor,
    subtextColor,
    tagColor,
    tagText,
  } = getWasteStyle(wasteName, status);

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };
  
  const displayTitle = status === 'ongoing' ? `Today - ${wasteName}` : `${sched.day} - ${wasteName}`;
  
  // --- MODIFIED: Shows both start and end time ---
  const displayTime = `${formatTime(sched.start_time)} - ${formatTime(sched.end_time)}`;

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
          {/* --- MODIFIED: Added mt-1 for better spacing --- */}
          <p className={`text-sm ${subtextColor} mt-1`}>{displayTime}</p>
        </div>
        <span className={`${tagColor} text-white px-2 py-1 rounded text-xs`}>
          {tagText}
        </span>
      </div>
    </motion.div>
  );
}

// --- 6. UPDATED SKELETON CARD (Matches new card UI) ---
function ScheduleCardSkeleton() {
  return (
    <div className="bg-gray-50 border-l-4 border-gray-200 p-4 rounded animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
          {/* --- MODIFIED: Made skeleton subtitle wider for time range --- */}
          <div className="h-3 bg-gray-300 rounded w-40"></div>
        </div>
        <div className="h-5 w-16 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
}

// --- 7. EMPTY STATE COMPONENT (Unchanged) ---
function EmptyState({ title, message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="flex flex-col items-center text-center text-gray-500 text-sm py-6"
    >
      <AlertCircle className="w-12 h-12 text-gray-300" />
      <p className="font-medium text-gray-600 mt-3">{title}</p>
      <p className="mt-1">{message}</p>
    </motion.div>
  );
}

// --- 8. MAIN COMPONENT (Logic Simplified, Layout Updated) ---
export default function ScheduleSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH PUROK (Unchanged) ---
  const fetchUserPurok = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("purok")
        .eq("uid", user.id)
        .single();
      if (userProfile?.purok) setResidentPurok(userProfile.purok);
    }
  };

  // --- PROCESS SCHEDULES (Unchanged) ---
  const updateSchedules = useCallback((data) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const ongoingSchedules = [];
    const upcomingSchedules = [];

    data.forEach((s) => {
      if (!s.date || !s.start_time || !s.end_time) return;
      const startTime = new Date(`${s.date}T${s.start_time}`);
      const endTime = new Date(`${s.date}T${s.end_time}`);

      if (s.date === todayStr && now >= startTime && now <= endTime) {
        ongoingSchedules.push(s);
      } else if (endTime > now) {
        upcomingSchedules.push(s);
      }
    });

    setOngoing(ongoingSchedules);
    setUpcoming(upcomingSchedules);
  }, []);

  // --- FETCH SCHEDULES (Unchanged) ---
  const fetchSchedules = useCallback(
    async (purok) => {
      setLoading(true);
      const normalizedPurok = normalizePurok(purok);
      const today = new Date().toISOString().split("T")[0];

      try {
        const { data, error } = await supabase
          .from("schedules")
          .select("*")
          .ilike("purok", `%${normalizedPurok}%`)
          .gte("date", today)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (!error && data) {
          updateSchedules(data);
        } else if (error) {
          console.error("Error fetching schedules:", error);
        }
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    },
    [updateSchedules]
  );

  // --- useEffects (Unchanged) ---
  useEffect(() => {
    fetchUserPurok();
  }, []);

  useEffect(() => {
    if (residentPurok) {
      fetchSchedules(residentPurok);
      const scheduleChannel = supabase
        .channel("schedule-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "schedules" },
          () => fetchSchedules(residentPurok)
        )
        .subscribe();
      const interval = setInterval(() => fetchSchedules(residentPurok), 60000);
      return () => {
        clearInterval(interval);
        supabase.removeChannel(scheduleChannel);
      };
    }
  }, [residentPurok, fetchSchedules]);

  // --- RENDER FUNCTION (UPDATED Layout) ---
  return (
    // --- UPDATED: Wrapper from target HTML ---
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      
      {/* --- Section Title (from target) --- */}
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        Waste Collection Schedule
      </h2>

      {/* --- ONGOING/THIS WEEK SECTION --- */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Ongoing & Upcoming
        </h3>
        {/* --- UPDATED: Grid layout from target --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && (
            <>
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
            </>
          )}

          {!loading && (
            <>
              <AnimatePresence>
                {/* Render Ongoing first */}
                {ongoing.map((sched) => (
                  <ScheduleCard
                    key={sched.schedule_id}
                    sched={sched}
                    status="ongoing"
                  />
                ))}
                {/* Then render Upcoming */}
                {upcoming.map((sched) => (
                  <ScheduleCard
                    key={sched.schedule_id}
                    sched={sched}
                    status="upcoming"
                  />
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
        
        {!loading && upcoming.length === 0 && ongoing.length === 0 && (
          <EmptyState
            title="No Upcoming Collections"
            message="No collections are scheduled for your purok at this time."
          />
        )}
      </div>

      {/* Note: The "Next Week" section from the target HTML is omitted
          as the React logic correctly shows all "Upcoming" items in one list. */}
    </div>
  );
}