"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import Header from "./components-official/Header";
import NavigationTabs from "./components-official/NavigationTabs";
import Dashboard from "./components-official/Dashboard";
import SMS from "./components-official/SMS";
import Reports from "./components-official/Reports";
import Education from "./components-official/Education";
import OfficialFeedbackPage from "./components-official/Feedback";
// 🆕 IMPORT: The new section component we created
import ManageUsersSection from "./components-official/ManageUsersSection"; 

// ✅ Dynamically import Schedule to disable SSR
const Schedule = dynamic(() => import("./components-official/Schedule"), {
  ssr: false,
});

export default function Home() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error.message);
          router.replace("/login");
          return;
        }

        const user = session?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: userRecord, error: userError } = await supabase
          .from("users")
          .select("email, role")
          .eq("email", user.email)
          .single();

        if (userError || !userRecord) {
          console.warn("User not found in users table, redirecting.");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (["official", "admin"].includes(userRecord.role)) {
          setIsAuthorized(true);
          setLoading(false);
        } else {
          console.warn(`Unauthorized role (${userRecord.role}), redirecting.`);
          await supabase.auth.signOut();
          router.replace("/login");
        }
      } catch (err) {
        console.error("Unexpected error during auth check:", err);
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold text-gray-700">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="bg-white min-h-screen">
      <Header />
      
      {/* 🧭 Tabs: Make sure 'Manage User' is in your tabs list here */}
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {activeTab === "Dashboard" && <Dashboard />}
        {activeTab === "Schedule" && <Schedule />}
        {activeTab === "SMS Alerts" && <SMS />}
        {activeTab === "Reports" && <Reports />}
        {activeTab === "Education" && <Education />}
        {activeTab === "Feedback" && <OfficialFeedbackPage />}

        {/* 🆕 NEW TAB CONTENT: This renders your new section */}
        {activeTab === "Manage User" && <ManageUsersSection />}
      </main>
    </div>
  );
}