"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, AlertCircle, BookOpen } from "lucide-react"; // Added icons
import Header from "../components-residents/Header";
import ScheduleSection from "../components-residents/ScheduleSection";
import ReportPage from "../components-residents/ReportPage";
import EducationPage from "../components-residents/EducationPage";
import GreetingCard from "../components-residents/GreetingCard"; // 1. IMPORTED GREETING CARD
import { supabase } from "@/supabaseClient";

// --- UPDATED: Minimalist Loading Screen Component ---
function LoadingScreen() {
  return (
    <motion.div
      key="loading-screen"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <img
        src="img/logo.png"
        alt="Logo"
        // --- MODIFIED: Changed w-24 h-24 to w-32 h-32 ---
        className="w-32 h-32 animate-pulse"
      />
    </motion.div>
  );
}

export default function ResidentsPage() {
  const [activePage, setActivePage] = useState("schedule");
  const [loading, setLoading] = useState(true);
  const [residentName, setResidentName] = useState("");
  const router = useRouter();

  // --- Data Fetching useEffect (Unchanged) ---
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error.message);
          if (isMounted) router.replace("/login");
          return;
        }

        if (!session) {
          console.warn("No session found, redirecting to login.");
          if (isMounted) router.replace("/login");
          return;
        }

        const user = session.user;

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("name, email, role")
          .eq("email", user.email)
          .single();

        if (userError || !userData) {
          console.warn("User not found in users table, redirecting.");
          if (isMounted) {
            await supabase.auth.signOut();
            router.replace("/login");
          }
          return;
        }

        if (userData.role !== "resident") {
          console.warn(`Unauthorized role (${userData.role}), redirecting.`);
          if (isMounted) {
            await supabase.auth.signOut();
            router.replace("/login");
          }
          return;
        }

        if (isMounted) {
          setResidentName(userData.name || "Resident");
          console.log(`Welcome, ${userData.name}!`);

          setTimeout(() => {
            if (isMounted) {
              setLoading(false);
            }
          }, 500);
        }
      } catch (err) {
        console.error("Unexpected error during session check:", err);
        if (isMounted) router.replace("/login");
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // --- Render Logic (Unchanged) ---
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <LoadingScreen key="loader" />
      ) : (
        <motion.div
          key="main-app"
          // This shell matches your app's mobile-first container
          className="flex flex-col h-screen max-w-lg mx-auto bg-white shadow-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Header activePage={activePage} />

          {/* --- UPDATED Main Content Area --- */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 bg-gray-100">
            {/* 2. ADDED GREETING CARD COMPONENT */}
            <GreetingCard residentName={residentName} />

            {/* --- NEW: Quick Actions Grid (from target HTML) --- */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setActivePage("schedule")}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center text-center"
              >
                <Calendar className="w-6 h-6 text-[#8B0000] mb-2" />
                <h3 className="text-xs font-medium text-gray-800">Schedule</h3>
              </button>

              <button
                onClick={() => setActivePage("report")}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center text-center"
              >
                <AlertCircle className="w-6 h-6 text-[#DC143C] mb-2" />
                <h3 className="text-xs font-medium text-gray-800">Report</h3>
              </button>

              <button
                onClick={() => setActivePage("education")}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center text-center"
              >
                <BookOpen className="w-6 h-6 text-[#FF6B6B] mb-2" />
                <h3 className="text-xs font-medium text-gray-800">Learn</h3>
              </button>
            </div>

            {/* --- UPDATED: Content Area Wrapper (for fade-in) --- */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activePage === "schedule" && <ScheduleSection />}
                {activePage === "report" && <ReportPage />}
                {activePage === "education" && <EducationPage />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* BottomNav Removed */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}