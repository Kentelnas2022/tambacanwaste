"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components-residents/Header";
import BottomNav from "../components-residents/BottomNav";
import ScheduleSection from "../components-residents/ScheduleSection";
import ReportPage from "../components-residents/ReportPage";
import EducationPage from "../components-residents/EducationPage";
import GreetingCard from "../components-residents/GreetingCard";
import { supabase } from "@/supabaseClient";

export default function ResidentsPage() {
  const [activePage, setActivePage] = useState("schedule");
  const [loading, setLoading] = useState(true);
  const [residentName, setResidentName] = useState("");
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        // ✅ Get current Supabase session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error.message);
          if (isMounted) router.replace("/login");
          return;
        }

        // ✅ If no session, redirect to login
        if (!session) {
          console.warn("No session found, redirecting to login.");
          if (isMounted) router.replace("/login");
          return;
        }

        const user = session.user;

        // ✅ Fetch user details from 'users' table using email
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("name, email, role")
          .eq("email", user.email)
          .single();

        // ❌ Redirect if not found or query failed
        if (userError || !userData) {
          console.warn("User not found in users table, redirecting.");
          if (isMounted) {
            await supabase.auth.signOut();
            router.replace("/login");
          }
          return;
        }

        // ❌ Redirect if user role is not 'resident'
        if (userData.role !== "resident") {
          console.warn(`Unauthorized role (${userData.role}), redirecting.`);
          if (isMounted) {
            await supabase.auth.signOut();
            router.replace("/login");
          }
          return;
        }

        // ✅ All checks passed → allow access and store name
        if (isMounted) {
          setResidentName(userData.name || "Resident");
          console.log(`Welcome, ${userData.name}!`);
          setLoading(false);
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

  // --- Loading screen while checking auth ---
  if (loading) {
    return (
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-white shadow-xl animate-pulse">
        <div className="bg-gray-300 h-16 w-full flex-shrink-0"></div>
        <div className="flex-1 bg-gray-100 p-4">
          <div className="h-10 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="h-24 bg-gray-300 rounded w-full"></div>
        </div>
        <div className="bg-gray-300 h-16 w-full flex-shrink-0 border-t border-gray-400"></div>
      </div>
    );
  }

  // --- Main App Shell (for verified residents only) ---
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white shadow-xl">
      <Header activePage={activePage} />

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 bg-gray-50 fade-in">
        {activePage === "schedule" && (
          <>
            {/* ✅ Pass resident name to GreetingCard */}
            <GreetingCard residentName={residentName} />
            <ScheduleSection />
          </>
        )}
        {activePage === "report" && <ReportPage />}
        {activePage === "education" && <EducationPage />}
      </main>

      <BottomNav
        activePage={activePage}
        onNavClick={(page) => setActivePage(page)}
      />
    </div>
  );
}
