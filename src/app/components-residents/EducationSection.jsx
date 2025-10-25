// components/EducationSection.jsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import clsx from "clsx";

// --- ✅ 1. NEW SKELETON CARD COMPONENT ---
// This component mimics the layout of your real card
function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 w-full p-4 bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse">
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gray-200"></div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export default function EducationSection({ isEduModalOpen, onCloseEduModal }) {
  const [items, setItems] = useState([]);
  const [loadingEdu, setLoadingEdu] = useState(true);
  const [errorEdu, setErrorEdu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  // --- Helper Functions ---
  const getCategoryIcon = (category) => {
    const cleanCategory = category || "General";
    
    switch (cleanCategory.toLowerCase()) {
      case "waste segregation":
      case "recycling":
      case "plastic waste management":
      case "e-waste management":
        return {
          Icon: Recycle,
          textColor: "text-green-600",
          bgColor: "bg-green-100",
          borderColor: "border-green-200",
        };
      case "composting":
      case "water conservation":
      case "sustainable living":
        return {
          Icon: Leaf,
          textColor: "text-emerald-600",
          bgColor: "bg-emerald-100",
          borderColor: "border-emerald-200",
        };
      case "waste reduction":
      case "proper disposal":
        return {
          Icon: Target,
          textColor: "text-blue-600",
          bgColor: "bg-blue-100",
          borderColor: "border-blue-200",
        };
      case "hazardous waste":
      case "health and safety":
        return {
          Icon: AlertTriangle,
          textColor: "text-red-600",
          bgColor: "bg-red-100",
          borderColor: "border-red-200",
        };
      default: // "General" or any other
        return {
          Icon: BookOpen,
          textColor: "text-gray-600",
          bgColor: "bg-gray-100",
          borderColor: "border-gray-200",
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
      // Set a small artificial delay so the skeleton is visible
      // This makes the transition feel smoother than a harsh "flash"
      setTimeout(() => {
         setLoadingEdu(false);
      }, 300); // 300ms delay
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (isEduModalOpen) {
      fetchEducation();
    }
  }, [isEduModalOpen]);

  useEffect(() => {
    const educationChannel = supabase
      .channel("education-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "educational_contents" },
        (payload) => {
          const newItem = payload.new;
          const newCategory = newItem.category || "General";
          setItems((prevItems) => [newItem, ...prevItems]);
          setActiveCategory(newCategory);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "educational_contents" },
        (payload) => {
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
          setItems((prevItems) =>
            prevItems.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(educationChannel);
    };
  }, []);

  // --- Memoized values for filtering ---
  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(items.map((item) => item.category || "General")),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "All") {
      return items;
    }
    return items.filter(
      (item) => (item.category || "General") === activeCategory
    );
  }, [items, activeCategory]);


  // --- Handlers ---
  const handleCloseModal = () => {
    onCloseEduModal();
    setTimeout(() => {
      setSelectedItem(null);
      setActiveCategory("All");
    }, 300);
  };

  const handleDragEnd = (event, info) => {
    const dragThreshold = 100;
    const velocityThreshold = 500;
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }} 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center md:justify-center z-50"
          onClick={handleCloseModal}
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
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            drag="y"
            onDragEnd={handleDragEnd}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            className="bg-gray-100 rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-full md:max-w-md max-h-[85vh] md:max-h-[80vh] flex flex-col cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            {/* --- Drag Handle --- */}
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
                      <div className="flex justify-between items-center mb-4">
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

                      {/* --- Category Filter Chips (Horizontal Scroll) --- */}
                      <div className="flex overflow-x-auto gap-2 pb-1 -mx-5 px-5 hide-scrollbar">
                        {categories.map((category) => {
                          const isActive = activeCategory === category;
                          const { textColor, bgColor, borderColor } =
                            getCategoryIcon(isActive ? category : "General");
                          
                          return (
                            <button
                              key={category}
                              onClick={() => setActiveCategory(category)}
                              className={clsx(
                                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors",
                                isActive
                                  ? `${textColor} ${bgColor} ${borderColor}`
                                  : "text-gray-700 bg-white border-gray-200 hover:bg-gray-50"
                              )}
                            >
                              {category}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* --- ✅ 2. UPDATED SCROLLING CONTENT --- */}
                    <div className="px-5 pb-10">
                      {errorEdu && (
                        <p className="text-red-500 text-sm">{errorEdu}</p>
                      )}

                      <div className="flex flex-col gap-3">
                        {/* Show skeletons while loading */}
                        {loadingEdu && (
                          <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                          </>
                        )}

                        {/* Show content *after* loading */}
                        {!loadingEdu && (
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={activeCategory} // This key triggers the animation
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="flex flex-col gap-3"
                            >
                              {filteredItems.length > 0 ? (
                                filteredItems.map((item) => {
                                  const { Icon, textColor, bgColor } =
                                    getCategoryIcon(item.category);
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => setSelectedItem(item)}
                                      className="flex items-center gap-4 w-full p-4 text-left bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]"
                                    >
                                      <div
                                        className={clsx(
                                          "flex-shrink-0 p-3 rounded-full",
                                          bgColor
                                        )}
                                      >
                                        <Icon className={clsx("w-5 h-5", textColor)} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-800 line-clamp-1">
                                          {item.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                          {item.description}
                                        </p>
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    </button>
                                  );
                                })
                              ) : (
                                // Empty state for filters
                                <div className="text-center py-10">
                                  <p className="font-semibold text-gray-700">No items found</p>
                                  <p className="text-sm text-gray-500">
                                    There are no tips for "{activeCategory}" yet.
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        )}
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
                    className="bg-white" 
                  >
                    {/* ... (Detail view code is unchanged) ... */}
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 p-4 border-b border-gray-200 bg-white">
                      <button
                        onClick={() => setSelectedItem(null)} // Go back to list
                        className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-bold text-gray-800 line-clamp-1">
                        {selectedItem.title}
                      </h3>
                    </div>

                    {/* Scrolling Content */}
                    <div className="p-6 pb-10">
                      {/* --- Category tag --- */}
                      <div className="mb-4">
                        <span
                          className={clsx(
                            "inline-block px-3 py-1 rounded-full text-xs font-semibold",
                            getCategoryIcon(selectedItem.category).bgColor,
                            getCategoryIcon(selectedItem.category).textColor
                          )}
                        >
                          {selectedItem.category || "General"}
                        </span>
                      </div>

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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

