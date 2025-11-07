// components/EducationPage.jsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  AlertTriangle,
  BookOpen,
  ArrowLeft,
  ThumbsUp,
  MinusCircle,
} from "lucide-react";
import clsx from "clsx";

// --- 1. SkeletonCard (Unchanged) ---
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="flex items-center space-x-3.5 mb-4">
          <div className="bg-gray-200 rounded-xl p-2.5 w-10 h-10"></div>
        </div>
        <div className="space-y-2.5 text-sm text-gray-600">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

// --- 2. getCategoryIcon (Unchanged) ---
const getCategoryIcon = (category) => {
  const cleanCategory = category || "General";

  switch (cleanCategory.toLowerCase()) {
    case "waste segregation":
    case "recycling":
    case "plastic waste management":
    case "e-waste management":
      return {
        Icon: ThumbsUp,
        textColor: "text-green-600",
        bgColor: "bg-green-100",
      };
    case "composting":
    case "water conservation":
    case "sustainable living":
      return {
        Icon: Leaf,
        textColor: "text-blue-600",
        bgColor: "bg-blue-100",
      };
    case "waste reduction":
    case "proper disposal":
      return {
        Icon: MinusCircle,
        textColor: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    case "hazardous waste":
    case "health and safety":
      return {
        Icon: AlertTriangle,
        textColor: "text-red-600",
        bgColor: "bg-red-100",
      };
    default:
      return {
        Icon: BookOpen,
        textColor: "text-gray-600",
        bgColor: "bg-gray-100",
      };
  }
};

// --- 3. EducationCard (Unchanged) ---
function EducationCard({ item, onClick }) {
  const { Icon, textColor, bgColor } = getCategoryIcon(item.category);
  return (
    <motion.button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left 
                 hover:shadow-lg transition-all duration-300 ease-in-out
                 active:scale-[0.985]"
      layout
    >
      <div className="p-6">
        <div className="flex items-center space-x-3.5 mb-4">
          <div className={`${bgColor} rounded-xl p-2.5`}>
            <Icon className={`w-5 h-5 ${textColor}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
            {item.title}
          </h3>
        </div>
        <p className="text-sm text-gray-500 list-inside whitespace-pre-wrap line-clamp-3">
          {item.description}
        </p>
      </div>
    </motion.button>
  );
}

// --- 4. MAIN PAGE COMPONENT (FIX APPLIED) ---
export default function EducationPage() {
  const [items, setItems] = useState([]);
  const [loadingEdu, setLoadingEdu] = useState(true);
  const [errorEdu, setErrorEdu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // --- All data fetching logic is unchanged ---
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

  useEffect(() => {
    fetchEducation();
  }, []);

  useEffect(() => {
    const educationChannel = supabase
      .channel("education-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "educational_contents" },
        () => fetchEducation()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(educationChannel);
    };
  }, []);

  return (
    <div id="page-education" className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedItem ? (
          // --- VIEW 1: Education List (FIXED) ---
          <motion.div
            key="list"
            // --- FIX: Removed initial, animate, exit, and transition props ---
            // This allows the parent (page.jsx) animation to take over,
            // matching the behavior of Schedule and Report pages.
            className="space-y-4"
          >
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                Waste Management Education
              </h2>
              <div className="space-y-4">
                {errorEdu && (
                  <p className="text-red-500 text-sm">{errorEdu}</p>
                )}
                {loadingEdu && (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                )}
                {!loadingEdu &&
                  items.map((item) => (
                    <EducationCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* --- VIEW 2: Item Detail (Unchanged, this animation is correct) --- */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
          >
            <div className="sticky top-0 z-10 flex items-center gap-2 p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm rounded-t-2xl">
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-semibold text-gray-900 line-clamp-1">
                {selectedItem.title}
              </h3>
            </div>
            <div className="p-6 pb-10">
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
              {selectedItem.media_url &&
                (selectedItem.media_type?.startsWith("video") ? (
                  <video
                    src={selectedItem.media_url}
                    controls
                    className="rounded-xl w-full max-h-60 object-cover border border-gray-200 mb-4 bg-gray-100"
                  />
                ) : selectedItem.media_type?.startsWith("image") ? (
                  <img
                    src={selectedItem.media_url}
                    alt={selectedItem.title}
                    className="rounded-xl w-full max-h-60 object-cover border border-gray-200 mb-4 bg-gray-100"
                  />
                ) : null)}
              <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedItem.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}