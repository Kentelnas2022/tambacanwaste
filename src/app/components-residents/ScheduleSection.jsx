// components/ScheduleSection.jsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Change: Moved helper functions to the top level ---
// These functions don't depend on component state, so they don't
// need to be re-created on every render.

/**
 * Normalizes a purok string by removing the "Purok " prefix.
 */
const normalizePurok = (p) => p.replace(/^Purok\s*/i, "").trim();

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

// --- Cleaner Schedule Card Sub-Component (No Changes) ---
// This component was already in great shape.
function ScheduleCard({ sched, status }) {
  // Determine waste type name
  const wasteName =
    sched.recyclable_type || sched.waste_type || "General Waste";

  // Determine status color and text
  const isOngoing = status === "ongoing";
  const statusColor = isOngoing ? "bg-emerald-500" : "bg-gray-400";
  const statusText = isOngoing ? "Ongoing Now" : "Upcoming";

  // Animation variants for the card
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
      className="flex items-center justify-between bg-white border border-gray-200 p-4 md:p-5 rounded-xl shadow-sm"
    >
      {/* Left Side: Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base md:text-lg text-gray-900 truncate">
          {wasteName}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5 md:mt-1">
          {sched.day}, {formatTime(sched.start_time)} -{" "}
          {formatTime(sched.end_time)}
        </p>
      </div>

      {/* Right Side: Status Tag */}
      <div className="flex-shrink-0 ml-3 md:ml-4">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${statusColor} ${
              isOngoing ? "animate-pulse" : ""
            }`}
          ></div>
          <span
            className={`text-sm font-medium ${
              isOngoing ? "text-emerald-700" : "text-gray-600"
            }`}
          >
            {statusText}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// --- Main Schedule Section Component ---
export default function ScheduleSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);

  // --- Data Fetching (Unchanged) ---
  // This logic is fine, but see "Next-Level Improvement" below.
  const fetchResidentPurok = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let { data: profile } = await supabase
        .from("profiles")
        .select("purok")
        .eq("id", user.id)
        .single();

      if (!profile) {
        const { data: resident } = await supabase
          .from("residents")
          .select("purok")
          .eq("user_id", user.id)
          .single();
        if (resident) profile = resident;
      }

      if (profile?.purok) setResidentPurok(profile.purok);
    }
  };

  // --- Change: Wrapped data-handling functions in useCallback ---
  // This prevents them from being re-created on every render,
  // which stabilizes the component and useEffect dependencies.
  const updateSchedules = useCallback((data) => {
    const now = new Date();

    // Heads-up on Timezones: new Date("YYYY-MM-DDTHH:MM") creates a date
    // in the *user's local timezone*. This is fine if your schedule
    // times are meant to be local, but can cause bugs if the times
    // are for a specific, different timezone.
    const ongoingSchedules = data.filter((s) => {
      const start = new Date(`${s.date}T${s.start_time}`);
      const end = new Date(`${s.date}T${s.end_time}`);
      return now >= start && now <= end;
    });
    const futureSchedules = data
      .filter((s) => new Date(`${s.date}T${s.start_time}`) > now)
      .slice(0, 2); // Still correctly slices to 2

    setOngoing(ongoingSchedules);
    setUpcoming(futureSchedules);
  }, []); // No dependencies, as setState functions are stable.

  const fetchSchedules = useCallback(
    async (purok) => {
      const normalizedPurok = normalizePurok(purok);
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .ilike("purok", `%${normalizedPurok}%`)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (!error && data) {
        updateSchedules(data);
      }
    },
    [updateSchedules]
  ); // Depends on the stable updateSchedules function

  // --- Effects ---
  useEffect(() => {
    // This effect runs once to get the user's purok.
    fetchResidentPurok();
  }, []);

  useEffect(() => {
    // This effect activates once residentPurok is known.
    if (residentPurok) {
      fetchSchedules(residentPurok); // Initial fetch

      const scheduleChannel = supabase
        .channel("schedule-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "schedules" },
          () => fetchSchedules(residentPurok) // Calls the stable fetch function
        )
        .subscribe();

      const interval = setInterval(() => {
        fetchSchedules(residentPurok); // Polling calls the stable fetch function
      }, 30000);

      // Cleanup function
      return () => {
        clearInterval(interval);
        supabase.removeChannel(scheduleChannel);
      };
    }
    // --- Change: Added fetchSchedules to the dependency array ---
    // This is now safe because fetchSchedules is stable (from useCallback).
    // It ensures the effect always uses the latest (but stable) function.
  }, [residentPurok, fetchSchedules]);

  // --- JSX for Schedule Section (No Changes) ---
  return (
    <div className="text-gray-900 font-sans">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          Collection Schedule
        </h2>

        <div className="space-y-3">
          <AnimatePresence>
            {/* --- ONGOING CARDS --- */}
            {ongoing.map((sched) => (
              <ScheduleCard
                key={sched.schedule_id}
                sched={sched}
                status="ongoing"
              />
            ))}

            {/* --- UPCOMING CARDS --- */}
            {upcoming.map((sched) => (
              <ScheduleCard
                key={sched.schedule_id}
                sched={sched}
                status="upcoming"
              />
            ))}
          </AnimatePresence>

          {/* --- "No Schedule" Message --- */}
          {ongoing.length === 0 && upcoming.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center text-gray-500 text-sm py-8"
            >
              There are no collections scheduled for your purok right now.
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}