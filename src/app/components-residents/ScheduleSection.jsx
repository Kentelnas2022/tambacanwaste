// components-residents/ScheduleSection.jsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx"; // You may need to run: npm install clsx

// --- 1. HELPER: Format Time ---
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

// --- 2. HELPER: Purok Normalizer ---
const normalizePurok = (p) => p.replace(/^Purok\s*/i, "").trim();


// --- 3. NEW MINIMALIST SCHEDULE CARD ---
function ScheduleCard({ sched, status }) {
  const wasteName =
    sched.recyclable_type || sched.waste_type || "General Waste";

  const isOngoing = status === "ongoing";

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
      // The card is a flex container with a hidden overflow
      className="flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
    >
      {/* 1. This is the new Status Bar */}
      <div
        className={clsx(
          "w-1.5 flex-shrink-0",
          isOngoing ? "bg-emerald-500" : "bg-gray-300"
        )}
      ></div>

      {/* 2. Main content area */}
      <div className="flex flex-1 items-center justify-between p-4 min-w-0">
        {/* Left Side: Info */}
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
        <div className="flex-shrink-0 ml-4">
          {isOngoing ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-semibold text-emerald-700">
                Ongoing
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-600">
              Upcoming
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- 4. NEW SKELETON CARD (matches new design) ---
function ScheduleCardSkeleton() {
  return (
    <div className="flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-pulse">
      {/* Skeleton bar */}
      <div className="w-1.5 flex-shrink-0 bg-gray-200"></div>
      
      <div className="flex flex-1 items-center justify-between p-4 min-w-0">
        {/* Skeleton info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        {/* Skeleton status */}
        <div className="flex-shrink-0 ml-4">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}


// --- 5. MAIN SCHEDULE SECTION COMPONENT (UPDATED) ---
export default function ScheduleSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Data Fetching ---
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

        if (!error && data) {
          updateSchedules(data);
        }
      } catch (err) {
        console.error("Error fetching schedules:", err);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    },
    [updateSchedules]
  ); 

  // --- Effects ---
  useEffect(() => {
    fetchResidentPurok();
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

      const interval = setInterval(() => {
        fetchSchedules(residentPurok);
      }, 30000);

      return () => {
        clearInterval(interval);
        supabase.removeChannel(scheduleChannel);
      };
    }
  }, [residentPurok, fetchSchedules]);

  // --- JSX for Schedule Section (UPDATED) ---
  return (
    <div className="text-gray-900 font-sans">
      <div>
        {/* 1. Enhanced Header */}
        <div className="mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
            Collection Schedule
          </h2>
          {/* 2. Personalization Sub-header (REMOVED) */}
        </div>

        <div className="space-y-3">
          {/* 3. Skeleton Loader */}
          {loading && (
            <>
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
            </>
          )}

          {/* 4. Real Content */}
          {!loading && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}