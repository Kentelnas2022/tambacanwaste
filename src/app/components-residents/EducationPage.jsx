// components/EducationPage.jsx
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
  ThumbsUp, // Added for new UI
  MinusCircle, // Added for new UI
} from "lucide-react";
import clsx from "clsx";

// --- 1. NEW SKELETON CARD (Matches new UI) ---
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className="bg-gray-200 rounded-full p-2 w-10 h-10"></div>
          <div className="h-5 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}

// --- 2. YOUR HELPER (Unchanged, it works perfectly) ---
// Note: I modified this slightly to use the icons from the target file
// for a closer match (e.g., ThumbsUp, MinusCircle).
const getCategoryIcon = (category) => {
  const cleanCategory = category || "General";
  
  switch (cleanCategory.toLowerCase()) {
    case "waste segregation":
    case "recycling":
    case "plastic waste management":
    case "e-waste management":
      return {
        Icon: ThumbsUp, // From lastna.html
        textColor: "text-green-600",
        bgColor: "bg-green-100",
      };
    case "composting":
    case "water conservation":
    case "sustainable living":
      return {
        Icon: Leaf, // From lastna.html
        textColor: "text-blue-600",
        bgColor: "bg-blue-100",
      };
    case "waste reduction":
    case "proper disposal":
      return {
        Icon: MinusCircle, // From lastna.html
        textColor: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    case "hazardous waste":
    case "health and safety":
      return {
        Icon: AlertTriangle, // From lastna.html
        textColor: "text-red-600",
        bgColor: "bg-red-100",
      };
    default: // "General" or any other
      return {
        Icon: BookOpen,
        textColor: "text-gray-600",
        bgColor: "bg-gray-100",
      };
  }
};

// --- 3. NEW CARD COMPONENT (Dynamic data + New UI) ---
function EducationCard({ item, onClick }) {
  const { Icon, textColor, bgColor } = getCategoryIcon(item.category);
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden text-left hover:shadow-lg transition-shadow active:scale-[0.99]"
    >
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className={`${bgColor} rounded-full p-2`}>
            <Icon className={`w-5 h-5 ${textColor}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
            {item.title}
          </h3>
        </div>
        {/* This renders the description from your database.
          'whitespace-pre-wrap' respects newlines (for bullets).
          'line-clamp-3' keeps the cards tidy.
        */}
        <p className="text-sm text-gray-600 list-inside whitespace-pre-wrap line-clamp-3">
          {item.description}
        </p>
      </div>
    </button>
  );
}


// --- 4. MAIN PAGE COMPONENT (Converted from Modal) ---
export default function EducationPage() {
  const [items, setItems] = useState([]);
  const [loadingEdu, setLoadingEdu] = useState(true);
  const [errorEdu, setErrorEdu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  // --- REMOVED: 'activeCategory' and filter logic ---

  // --- Data Fetching (Unchanged) ---
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
      setTimeout(() => {
        setLoadingEdu(false);
      }, 300);
    }
  };

  // --- Effects (Updated to fetch on mount) ---
  useEffect(() => {
    fetchEducation();
  }, []);

  // --- Real-time subscription (Unchanged) ---
  useEffect(() => {
    const educationChannel = supabase
      .channel("education-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "educational_contents" },
        // Simple refetch on any change
        () => fetchEducation()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(educationChannel);
    };
  }, []);

  // --- REMOVED: Memoized values for filtering ---
  // --- REMOVED: Modal Handlers (handleCloseModal, handleDragEnd) ---
  // --- REMOVED: Modal Variants ---

  return (
    // This is the main page wrapper from lastna.html
    <div id="page-education" className="space-y-6 animate-fade-in">
      {/* This 'AnimatePresence' handles the swap between List and Detail */}
      <AnimatePresence mode="wait">
        
        {/* --- VIEW 1: Education List (New UI) --- */}
        {!selectedItem ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {errorEdu && (
              <p className="text-red-500 text-sm">{errorEdu}</p>
            )}
            
            {/* --- Skeleton Loader --- */}
            {loadingEdu && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* --- Dynamic Card List --- */}
            {!loadingEdu && items.map((item) => (
              <EducationCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}

          
          </motion.div>
        ) : (
          
          /* --- VIEW 2: Item Detail (Your Existing UI) --- */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="bg-white rounded-xl shadow-md border" // Changed to match card style
          >
            {/* Sticky Header */}
            <div className=" z-10 flex items-center gap-2 p-4 border-b border-gray-200 bg-white rounded-t-xl">
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
              {/* Category tag */}
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

              {/* Description (Your logic) */}
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                {selectedItem.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}