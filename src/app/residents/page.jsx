// page.jsx
"use client";

import { useState, useEffect } from "react";
// ✅ UPDATED IMPORTS
import Header from "../components-residents/Header";
import BottomNav from "../components-residents/BottomNav";
import GreetingCard from "../components-residents/GreetingCard";
import ScheduleSection from "../components-residents/ScheduleSection";
import EducationSection from "../components-residents/EducationSection";
import ReportModal from "../components-residents/ReportModal";
import { supabase } from "@/supabaseClient";

export default function ResidentsPage() {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  // const [user, setUser] = useState(null); // This state can be removed, as Header manages it
  const [loading, setLoading] = useState(true);

  // ✅ Simplified useEffect
  useEffect(() => {
    // Just check for auth status to decide on loading, Header handles the rest
    const checkUser = async () => {
      await supabase.auth.getUser();
      setLoading(false);
    };
    checkUser();
  }, []);

  // 🌐 Loading Skeleton (Unchanged)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        {/* ... (skeleton code unchanged) ... */}
        <style jsx>{`
          /* ... (shimmer css unchanged) ... */
        `}</style>
      </div>
    );
  }

  // ✅ Main Residents Page Content
  return (
    <div className="bg-gray-100 min-h-screen pb-24 md:pb-0">
      {/* --- NEW LAYOUT --- */}
      <Header />
      <BottomNav
        onOpenReport={() => setIsReportOpen(true)}
        onOpenEducation={() => setIsEduModalOpen(true)}
      />
      {/* --- END NEW LAYOUT --- */}

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 fade-in">
        <GreetingCard />
        <div id="contentArea">
          <ScheduleSection />
        </div>
      </main>

      {/* ReportModal remains as-is */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* EducationSection remains as-is */}
      <EducationSection
        isEduModalOpen={isEduModalOpen}
        onCloseEduModal={() => setIsEduModalOpen(false)}
      />

      <style jsx global>{`
        .fade-in {
          animation: fadeIn 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}