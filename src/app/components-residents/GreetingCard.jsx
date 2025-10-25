"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient"; // ✅ Make sure this import path is correct

/**
 * NEW: Skeleton Loader Component
 * This mimics the design of the real card but in a loading state.
 */
function GreetingCardSkeleton() {
  return (
    <div
      className="
        flex 
        bg-white
        rounded-xl
        shadow-sm 
        border border-gray-200
        overflow-hidden
        animate-pulse
      "
    >
      {/* 1. The skeleton color bar */}
      <div className="w-1.5 flex-shrink-0 bg-gray-200"></div>

      {/* 2. Skeleton content wrapper */}
      <div className="p-5 sm:p-6 w-full">
        {/* Skeleton for "Good Morning, John!" */}
        <div className="h-5 bg-gray-200 rounded-md w-1/2 mb-2.5"></div>
        
        {/* Skeleton for the paragraph */}
        <div className="space-y-2">
          <div className="h-3.5 bg-gray-200 rounded-md w-full"></div>
          <div className="h-3.5 bg-gray-200 rounded-md w-5/6"></div>
        </div>
      </div>
    </div>
  );
}


/**
 * Main Greeting Card Component
 */
export default function GreetingCard() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Resident"); // Default fallback name
  const [loading, setLoading] = useState(true); // ✅ ADDED loading state

  // Determine greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Fetch current user and their name from Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Try to fetch from "profiles" table
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .single();

          // Set userName with priority order
          setUserName(
            profileData?.name ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "Resident"
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Keep default "Resident" name on error
      } finally {
        // ✅ Stop loading after a short delay for a smoother transition
        setTimeout(() => {
          setLoading(false);
        }, 300); // 300ms delay
      }
    };

    fetchUserData();
  }, []);

  // --- ✅ UPDATED RENDER ---
  // Show the skeleton while loading
  if (loading) {
    return <GreetingCardSkeleton />;
  }

  // Show the real card when loading is false
  return (
    <div
      className="
        flex 
        bg-white
        rounded-xl
        shadow-sm 
        border border-gray-200
        overflow-hidden 
      "
    >
      {/* 1. The minimalist color bar, using your palette */}
      <div className="w-1.5 flex-shrink-0 bg-[#8B0000]"></div>

      {/* 2. Content wrapper with padding */}
      <div className="p-5 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-1 text-[#8B0000]">
          {greeting}, {userName}!
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed max-w-md">
          Here’s your updated waste collection schedule. Stay organized and help
          keep Tambacan clean!
        </p>
      </div>
    </div>
  );
}