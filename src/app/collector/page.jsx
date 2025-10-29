"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import Header from "../components-collector/Header";
import Tabs from "../components-collector/Tabs";
import Schedule from "../components-collector/Schedule";

export default function CollectorDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ✅ Get active session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error.message);
          router.replace("/login");
          return;
        }

        const user = session?.user;
        if (!user) {
          console.warn("No active user session found. Redirecting...");
          router.replace("/login");
          return;
        }

        // ✅ Fetch user info from unified 'users' table (case-insensitive)
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, role")
          .ilike("email", user.email)
          .single();

        if (userError || !userData) {
          console.warn("User not found in users table. Redirecting...");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // ✅ Allow only collectors
        if (userData.role === "collector") {
          setIsAuthorized(true);
        } else {
          console.warn(`Unauthorized role (${userData.role}), redirecting...`);
          await supabase.auth.signOut();
          router.replace("/login");
        }
      } catch (err) {
        console.error("Error during authentication:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // ⏳ Loading Screen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold text-gray-700">Loading...</p>
      </div>
    );
  }

  // 🚫 Unauthorized users see nothing while redirecting
  if (!isAuthorized) return null;

  // ✅ Authorized collector view
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <Tabs />
        <Schedule />
      </div>
    </div>
  );
}
