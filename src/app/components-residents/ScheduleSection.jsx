"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { AlertCircle, Star, X, MessageSquarePlus } from "lucide-react";
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

// --- 5. SCHEDULE CARD (Updated for Feedback Check) ---
function ScheduleCard({ sched, status, onClick }) {
  const wasteName = sched.waste_type || "General Waste";
  const {
    bgColor,
    borderColor,
    titleColor,
    subtextColor,
    tagColor,
    tagText,
  } = getWasteStyle(wasteName, status);

  // Check the new column to see if resident already provided feedback
  const isFeedbackProvided = !!sched.resident_rating;
  
  // Only clickable if ongoing AND feedback hasn't been provided
  const isClickable = status === "ongoing" && !isFeedbackProvided;

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const displayTitle =
    status === "ongoing" ? `Today - ${wasteName}` : `${sched.day} - ${wasteName}`;
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
      onClick={() => isClickable && onClick && onClick(sched)}
      className={`${bgColor} border-l-4 ${borderColor} p-4 rounded relative transition-all duration-200 ${
        isClickable
          ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-95"
          : isFeedbackProvided
          ? "opacity-90" // Slightly dim if feedback is already provided
          : ""
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className={`font-semibold ${titleColor} flex items-center gap-2`}>
            {displayTitle}
          </p>
          <p className={`text-sm ${subtextColor} mt-1`}>{displayDate}</p>
          <p className={`text-sm ${subtextColor} mt-1`}>{displayTime}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <span className={`${tagColor} text-white px-2 py-1 rounded text-xs`}>
            {tagText}
            </span>
            {/* Show Feedback Status/Hint */}
            {isFeedbackProvided ? (
                <span className="text-xs text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                    <Star size={12} className="text-yellow-500 fill-yellow-500"/> Rated ({sched.resident_rating}/5)
                </span>
            ) : isClickable ? (
                <span className="text-xs text-green-700 flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full">
                    <MessageSquarePlus size={12}/> Give Feedback
                </span>
            ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// --- 6. FEEDBACK MODAL (No Change) ---
function FeedbackModal({ isOpen, onClose, onSubmit, schedule }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
  
    if (!isOpen || !schedule) return null;
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (rating === 0) {
        alert("Please provide a star rating before submitting.");
        return;
      }
      setIsSubmitting(true);
      // onSubmit now triggers the update on the schedules table
      await onSubmit(schedule.schedule_id, rating, comment);
      setIsSubmitting(false);
      setRating(0);
      setComment("");
    };
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
            <h3 className="text-white font-semibold text-lg">Collection Feedback</h3>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>
  
          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              How was the collection for <span className="font-semibold text-gray-800">{schedule.purok}</span> today?
            </p>
  
            {/* Star Rating */}
            <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`transition-all ${rating >= star ? "text-yellow-400 scale-110" : "text-gray-300 hover:text-yellow-200"}`}
                    >
                    <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
                    </button>
                ))}
                </div>
                <span className="text-xs text-gray-500 font-medium">
                    {rating === 0 ? "Tap a star to rate" : rating === 5 ? "Excellent!" : rating === 1 ? "Poor" : rating === 2 ? "Needs Improvement" : "Good"}
                </span>
            </div>
  
            {/* Comment Box */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Was the truck on time? Was the crew polite?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm resize-none"
                rows="3"
              />
            </div>
  
            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

// --- 7. SKELETON CARD ---
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

// --- 8. EMPTY STATE ---
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

// --- 9. MAIN COMPONENT ---
export default function ScheduleSection() {
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [residentPurok, setResidentPurok] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Feedback State
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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

      const [year, month, day] = s.date.split("-").map(Number);
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);

      const start = new Date(year, month - 1, day, sh, sm);
      const end = new Date(year, month - 1, day, eh, em);

      if (end < start) {
        end.setDate(end.getDate() + 1);
      }

      if (now >= start && now <= end) {
        ongoingSchedules.push(s);
      } else if (start > now) {
        futureSchedules.push(s);
      }
    });

    futureSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));

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
          .select("*, resident_rating, resident_comment") // Ensure new columns are fetched
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

  // --- SUBMIT FEEDBACK (UPDATED TO USE `schedules` TABLE) ---
  const handleFeedbackSubmit = async (scheduleId, rating, comment) => {
    try {
        const { error } = await supabase
            .from('schedules')
            .update({
                resident_rating: rating,
                resident_comment: comment,
            })
            .eq('schedule_id', scheduleId);

        if (error) throw error;
        
        alert("Thank you! Your feedback has been saved to the schedule.");
        setIsFeedbackOpen(false);
        
        // Refetch schedules to update the UI with the new rating status
        fetchSchedules(residentPurok); 

    } catch (err) {
        console.error("Feedback update error:", err);
        alert("Failed to submit feedback. Please try again.");
    }
  };

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
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6 relative">
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
                <ScheduleCard 
                    key={s.schedule_id} 
                    sched={s} 
                    status="ongoing" 
                    onClick={(schedule) => {
                        setSelectedSchedule(schedule);
                        setIsFeedbackOpen(true);
                    }}
                />
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

      {/* FEEDBACK MODAL */}
      <AnimatePresence>
        {isFeedbackOpen && (
            <FeedbackModal 
                isOpen={isFeedbackOpen}
                schedule={selectedSchedule}
                onClose={() => setIsFeedbackOpen(false)}
                onSubmit={handleFeedbackSubmit}
            />
        )}
      </AnimatePresence>
    </div>
  );
}