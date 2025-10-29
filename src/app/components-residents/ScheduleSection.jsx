// components-residents/ScheduleSection.jsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { Check, Calendar, Leaf, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. HELPER: Format Time (Unchanged) ---
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

// --- 2. HELPER: Purok Normalizer (Unchanged) ---
const normalizePurok = (p) => p.replace(/^Purok\s*/i, "").trim();

// --- 3. HELPER: NEW Icon and Color selector ---
const getWasteStyle = (wasteName) => {
  const name = wasteName.toLowerCase();
  if (name.includes("recycling")) {
    return { Icon: Calendar, bgColor: "bg-blue-100", textColor: "text-blue-600" };
  }
  if (name.includes("organic")) {
    return { Icon: Leaf, bgColor: "bg-yellow-100", textColor: "text-yellow-600" };
  }
  // Default to General Waste
  return { Icon: Trash2, bgColor: "bg-gray-100", textColor: "text-gray-600" };
};

// --- 4. UPDATED SCHEDULE CARD (New UI + Motion) ---
function ScheduleCard({ sched, status }) {
  const wasteName = sched.recyclable_type || sched.waste_type || "General Waste";
  const isOngoing = status === "ongoing";

  let Icon, bgColor, textColor, title;

  if (isOngoing) {
    Icon = Check;
    bgColor = "bg-green-100";
    textColor = "text-green-600";
    title = `Today - ${wasteName}`;
  } else {
    const style = getWasteStyle(wasteName);
    Icon = style.Icon;
    bgColor = style.bgColor;
    textColor = style.textColor;
    title = `${sched.day} - ${wasteName}`;
  }

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
      className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center space-x-4"
    >
      <div className={`${bgColor} p-3 rounded-full`}>
        <Icon className={`w-6 h-6 ${textColor}`} />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">
          Collection: {formatTime(sched.start_time)}
        </p>
      </div>
      {isOngoing && (
        <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
          TODAY
        </span>
      )}
    </motion.div>
  );
}

// --- 5. SKELETON CARD ---
function ScheduleCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center space-x-4 animate-pulse">
      <div className="bg-gray-200 p-3 rounded-full w-12 h-12"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// --- 6. MAIN COMPONENT ---
export default function ScheduleSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH PUROK FROM USERS TABLE ---
  const fetchUserPurok = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("purok")
        .eq("uid", user.id)
        .single();
      if (userProfile?.purok) setResidentPurok(userProfile.purok);
    }
  };

  const updateSchedules = useCallback((data) => {
    const now = new Date();
    const ongoingSchedules = data.filter((s) => {
      const start = new Date(`${s.date}T${s.start_time}`);
      const end = new Date(`${s.date}T${s.end_time}`);
      return now >= start && now <= end;
    });
    const futureSchedules = data
      .filter((s) => new Date(`${s.date}T${s.start_time}`) > now)
      .slice(0, 2);
    setOngoing(ongoingSchedules);
    setUpcoming(futureSchedules);
  }, []);

  const fetchSchedules = useCallback(
    async (purok) => {
      setLoading(true);
      const normalizedPurok = normalizePurok(purok);
      try {
        const { data, error } = await supabase
          .from("schedules")
          .select("*")
          .ilike("purok", `%${normalizedPurok}%`)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });
        if (!error && data) updateSchedules(data);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    },
    [updateSchedules]
  );

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

      const interval = setInterval(() => fetchSchedules(residentPurok), 30000);

      return () => {
        clearInterval(interval);
        supabase.removeChannel(scheduleChannel);
      };
    }
  }, [residentPurok, fetchSchedules]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">This Week</h2>
      <div className="grid grid-cols-1 gap-4">
        {loading && <>
          <ScheduleCardSkeleton />
          <ScheduleCardSkeleton />
        </>}

        {!loading && <>
          <AnimatePresence>
            {ongoing.map((sched) => (
              <ScheduleCard key={sched.schedule_id} sched={sched} status="ongoing" />
            ))}
            {upcoming.map((sched) => (
              <ScheduleCard key={sched.schedule_id} sched={sched} status="upcoming" />
            ))}
          </AnimatePresence>

          {ongoing.length === 0 && upcoming.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center text-center text-gray-500 text-sm py-8"
            >
              <img src="/assets/images/schedule-empty.svg" alt="No schedule" className="w-40 h-40" />
              <p className="font-medium text-gray-700 mt-4">No Collections Scheduled</p>
              <p className="mt-1">
                There are no collections scheduled for your purok right now.
              </p>
            </motion.div>
          )}
        </>}
      </div>
    </div>
  );
}
