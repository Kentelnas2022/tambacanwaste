"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

// ✅ Skeleton Loader
function GreetingCardSkeleton() {
  return (
    <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="w-1.5 flex-shrink-0 bg-gray-200"></div>
      <div className="p-5 sm:p-6 w-full">
        <div className="h-5 bg-gray-200 rounded-md w-1/2 mb-2.5"></div>
        <div className="space-y-2">
          <div className="h-3.5 bg-gray-200 rounded-md w-full"></div>
          <div className="h-3.5 bg-gray-200 rounded-md w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

export default function GreetingCard() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Resident");
  const [loading, setLoading] = useState(true);

  // ✅ Determine greeting based on current hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // ✅ Fetch user's name from `users` table
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        // Get currently logged-in user
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw new Error("User not authenticated.");

        // Fetch user record from `users` table using uid
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("name")
          .eq("uid", user.id)
          .single();

        if (profileError || !userProfile) {
          console.warn("User not found in users table.");
          setUserName("Resident");
        } else {
          setUserName(userProfile.name || "Resident");
        }
      } catch (err) {
        console.error("Error fetching user name:", err);
        setUserName("Resident");
      } finally {
        // Smooth fade transition
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchUserName();
  }, []);

  if (loading) return <GreetingCardSkeleton />;

  return (
    <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-1.5 flex-shrink-0 bg-[#8B0000]"></div>
      <div className="p-5 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-1 text-[#8B0000]">
          {greeting}, {userName}!
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed max-w-md">
          Here’s your updated waste collection schedule. Stay organized and help keep Tambacan clean!
        </p>
      </div>
    </div>
  );
}
