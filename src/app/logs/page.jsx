"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/supabaseClient";
import { CheckCircle2, RefreshCcw, ArrowLeft, ListChecks } from "lucide-react";

const typeStyles = {
  complete: { icon: CheckCircle2, className: "text-green-500" },
  update: { icon: RefreshCcw, className: "text-yellow-600" },
  ongoing: { icon: RefreshCcw, className: "text-blue-500" },
};

function LogHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-red-900 text-white shadow-md">
      <div className="grid grid-cols-3 items-center p-4 max-w-xl mx-auto">
        <button
          onClick={() => router.back()}
          className="justify-self-start p-2 rounded-full hover:bg-red-800 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-center tracking-tight">
          Activity Log
        </h1>
        <div></div>
      </div>
    </header>
  );
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("schedules")
        .select("schedule_id, status, date, purok, updated_at, plan")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((s) => {
        const status = s.status?.toLowerCase() || "not-started";
        const purok = s.purok || "Unknown";
        const plan = s.plan || "A";
        let type = "update";
        let action = "";

        if (status === "completed") {
          action = `Collection completed in Purok ${purok}.`;
          type = "complete";
        } else if (status === "ongoing") {
          action = `Collection ongoing in Purok ${purok} (Plan ${plan}).`;
          type = "ongoing";
        } else {
          action = `Schedule updated for Purok ${purok} (Plan: ${plan}, Status: ${status}).`;
          type = "update";
        }

        return {
          id: s.schedule_id,
          type,
          action,
          created_at: s.updated_at || new Date().toISOString(),
        };
      });

      setActivities(mapped);
      setLoading(false);
    };

    fetchActivities();

    const channel = supabase
      .channel("realtime-collector-logs")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "schedules" },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <LogHeader />
      <main className="flex-1 p-4 sm:p-6 max-w-xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
            <RefreshCcw className="w-6 h-6 mb-2 animate-spin text-gray-400" />
            <p className="text-sm">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 text-gray-500">
            <ListChecks className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium">No recent activities found</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {activities.map((activity) => {
              const style = typeStyles[activity.type] || typeStyles.update;
              const Icon = style.icon;
              return (
                <motion.div
                  key={`${activity.id}-${activity.created_at}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-3 bg-white shadow-sm rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex-shrink-0 mt-1">
                    <Icon className={`w-5 h-5 ${style.className}`} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm text-gray-800 leading-snug">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
