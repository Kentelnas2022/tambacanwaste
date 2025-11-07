"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import Header from "../components-collector/Header";
import Tabs from "../components-collector/Tabs";

export default function CollectorDashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verifyCollector = async () => {
      try {
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        const user = session?.user;

        if (!user) {
          console.warn("No active session found. Redirecting...");
          router.replace("/login");
          return;
        }

        // Fetch user info from Supabase "users" table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, role")
          .eq("email", user.email)
          .single();

        if (userError || !userData) {
          console.warn("User not found in users table. Redirecting...");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // Only allow "collector" role
        if (userData.role !== "collector") {
          console.warn(`Unauthorized role: ${userData.role}`);
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setAuthorized(true);
      } catch (err: any) {
        console.error("Error during authentication:", err.message);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    verifyCollector();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold text-gray-700">Loading...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <Tabs />
      </main>
    </div>
  );
}
