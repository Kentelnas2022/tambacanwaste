// components/EducationSection.jsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Recycle,
  Leaf,
  Target,
  AlertTriangle,
  BookOpen,
  X,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

export default function EducationSection({ isEduModalOpen, onCloseEduModal }) {
  const [items, setItems] = useState([]);
  const [loadingEdu, setLoadingEdu] = useState(true);
  const [errorEdu, setErrorEdu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // --- Helper Functions ---

  const getCategoryIcon = (category) => {
    if (!category) {
      return {
        Icon: BookOpen,
        iconColor: "text-indigo-600",
        bgColor: "bg-indigo-100",
      };
    }
    switch (category.toLowerCase()) {
      case "waste segregation":
      case "recycling":
      case "plastic waste management":
      case "e-waste management":
        return {
          Icon: Recycle,
          iconColor: "text-green-600",
          bgColor: "bg-green-100",
        };
      case "composting":
      case "water conservation":
      case "sustainable living":
        return {
          Icon: Leaf,
          iconColor: "text-emerald-600",
          bgColor: "bg-emerald-100",
        };
      case "waste reduction":
      case "proper disposal":
        return {
          Icon: Target,
          iconColor: "text-blue-600",
          bgColor: "bg-blue-100",
        };
      case "hazardous waste":
      case "health and safety":
        return {
          Icon: AlertTriangle,
          iconColor: "text-red-600",
          bgColor: "bg-red-100",
        };
      default:
        return {
          Icon: BookOpen,
          iconColor: "text-gray-600",
          bgColor: "bg-gray-100",
        };
    }
  };

  // --- Data Fetching ---

  const fetchEducation = async () => {
    setLoadingEdu(true);
    try {
      const { data, error } = await supabase
        .from("educational_contents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setErrorEdu(err.message || String(err));
    } finally {
      setLoadingEdu(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    // 1. Initial fetch when modal opens
    if (isEduModalOpen) {
      fetchEducation();
    }
  }, [isEduModalOpen]);

  // ✅ UPDATED: Real-time subscription logic
  useEffect(() => {
    // 2. Listen for real-time changes
    const educationChannel = supabase
      .channel("education-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "educational_contents" },
        (payload) => {
          // ✅ --- This is your requested feature ---
          // A new item is added; insert it at the top of the list
          setItems((prevItems) => [payload.new, ...prevItems]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "educational_contents" },
        (payload) => {
          // An item was updated; find it and replace it
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.id === payload.new.id ? payload.new : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "educational_contents" },
        (payload) => {
          // An item was deleted; remove it from the list
          setItems((prevItems) =>
            prevItems.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(educationChannel);
    };
  }, []); // Empty dependency array ensures this runs once

  // --- Handlers ---

  const handleCloseModal = () => {
    onCloseEduModal();
    setTimeout(() => {
      setSelectedItem(null);
    }, 300); // Reset view after animation
  };

  const handleDragEnd = (event, info) => {
    const dragThreshold = 100; // Min pixels to drag down to close
    const velocityThreshold = 500; // Min velocity to "flick" close

    if (info.offset.y > dragThreshold || info.velocity.y > velocityThreshold) {
      handleCloseModal();
    }
  };

  // --- Animation Variants ---

  const modalVariants = {
    hidden: { opacity: 0, y: "100%" },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: "100%" },
  };

  const desktopModalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.95 },
  };

  return (
    <AnimatePresence>
      {isEduModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center md:justify-center z-50"
          onClick={handleCloseModal} // Close on backdrop click
        >
          {/* --- Modal Container --- */}
          <motion.div
            variants={
              typeof window !== "undefined" && window.innerWidth < 768
                ? modalVariants
                : desktopModalVariants
            }
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            onDragEnd={handleDragEnd}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            className="bg-gray-100 rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-full md:max-w-md max-h-[85vh] md:max-h-[80vh] flex flex-col cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            {/* --- Drag Handle (Visual Cue) --- */}
            <div className="w-full flex justify-center pt-3 pb-2 cursor-grab">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            {/* --- Content (Swaps between List and Detail) --- */}
            <div className="flex-1 overflow-y-auto cursor-auto">
              <AnimatePresence mode="wait">
                {/* --- VIEW 1: Education List --- */}
                {!selectedItem ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-gray-100 z-10 px-5 pt-2 pb-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-900">
                          Learn & Tips
                        </h3>
                        <button
                          onClick={handleCloseModal}
                          className="p-1.5 text-gray-500 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Scrolling Content */}
                    <div className="px-5 pb-10">
                      {loadingEdu && (
                        <p className="text-gray-600 text-sm">Loading...</p>
                      )}
                      {errorEdu && (
                        <p className="text-red-500 text-sm">{errorEdu}</p>
                      )}

                      {/* --- List View --- */}
                      <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {items.map((item, index) => {
                          const { Icon, iconColor, bgColor } = getCategoryIcon(
                            item.category
                          );
                          return (
                            <button
                              key={item.id}
                              onClick={() => setSelectedItem(item)}
                              className={`flex items-center gap-4 w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                                index < items.length - 1
                                  ? "border-b border-gray-200"
                                  : ""
                              }`}
                            >
                              <div
                                className={`flex-shrink-0 p-3 rounded-full ${bgColor}`}
                              >
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-800 line-clamp-1">
                                  {item.title}
                                </h4>
                                <p className="text-sm text-gray-600 line-clamp-1">
                                  {item.description}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* --- VIEW 2: Item Detail --- */
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 p-4 border-b border-gray-200 bg-gray-100">
                      <button
                        onClick={() => setSelectedItem(null)} // Go back to list
                        className="p-1.5 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-bold text-gray-800 line-clamp-1">
                        {selectedItem.title}
                      </h3>
                    </div>

                    {/* Scrolling Content */}
                    <div className="p-6 pb-10 bg-white">
                      <p className="text-xs text-gray-700 mb-4">
                        <span className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                          {selectedItem.category || "General"}
                        </span>
                      </p>

                      {/* Media (Video/Image) */}
                      {selectedItem.media_url &&
                        (selectedItem.media_type?.startsWith("video") ? (
                          <video
                            src={selectedItem.media_url}
                            controls
                            className="rounded-lg w-full max-h-60 object-cover border border-gray-200 mb-4 bg-gray-100"
                          />
                        ) : selectedItem.media_type?.startsWith("image") ? (
                          <img
                            src={selectedItem.media_url}
                            alt={selectedItem.title}
                            className="rounded-lg w-full max-h-60 object-cover border border-gray-200 mb-4 bg-gray-100"
                          />
                        ) : null)}

                      {/* Description */}
                      <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {selectedItem.description}
                      </p>                  
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}