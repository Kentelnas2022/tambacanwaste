"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Trash2,
  Info,
  MapPin,
  MessageSquare,
  FileText,
  BookOpen,
  Archive,
  RefreshCcw,
  PlusCircle,
  BarChart3,
  LineChart as LineChartIcon,
  CheckCircle,
  PackageCheck,
  Users,
  Recycle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { supabase } from "@/supabaseClient";

export default function Dashboard() {
  const [activeEducation, setActiveEducation] = useState(0);
  const [archivedEducation, setArchivedEducation] = useState(0);
  const [allResidents, setAllResidents] = useState([]);
  const [purokData, setPurokData] = useState([]);
  const [purokList, setPurokList] = useState([]);
  const [selectedPurok, setSelectedPurok] = useState("All");
  const [totalResidents, setTotalResidents] = useState(0);
  const [complianceData, setComplianceData] = useState([]);
  const [completedCollectionsToday, setCompletedCollectionsToday] = useState(0);
  const [activities, setActivities] = useState([]);
  const [collectionEfficiency, setCollectionEfficiency] = useState(0);
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState(0);
  const [citizenParticipation, setCitizenParticipation] = useState(0);

  // --- THIS SECTION IS UNCHANGED ---
  const typeStyles = {
    complete: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "from-green-50 to-green-100",
    },
    create: {
      icon: PlusCircle,
      color: "text-blue-600",
      bg: "from-blue-50 to-blue-100",
    },
    update: {
      icon: RefreshCcw,
      color: "text-yellow-600",
      bg: "from-yellow-50 to-yellow-100",
    },
    delete: {
      icon: Trash2,
      color: "text-red-600",
      bg: "from-red-50 to-red-100",
    },
    message: {
      icon: MessageSquare,
      color: "text-indigo-600",
      bg: "from-indigo-50 to-indigo-100",
    },
    report: {
      icon: FileText,
      color: "text-purple-600",
      bg: "from-purple-50 to-purple-100",
    },
  };

  // --- ALL DATA FETCHING & REALTIME LOGIC IS UNCHANGED ---

  // 🧠 Fetch education
  useEffect(() => {
    const fetchEducationStats = async () => {
      const { count: activeCount } = await supabase
        .from("educational_contents")
        .select("*", { count: "exact", head: true })
        .eq("status", "Published");
      const { count: archivedCount } = await supabase
        .from("archived_education")
        .select("*", { count: "exact", head: true });
      setActiveEducation(activeCount || 0);
      setArchivedEducation(archivedCount || 0);
    };
    fetchEducationStats();
  }, []);

  // 👥 Residents
  useEffect(() => {
    const fetchResidents = async () => {
      const { data, error, count } = await supabase
        .from("residents")
        .select("id, purok, mobile", { count: "exact" })
        .neq("purok", null);
      if (error) {
        console.error("Error fetching residents:", error.message);
        return;
      }
      setAllResidents(data || []);
      setTotalResidents(count || 0);
      setPurokList([...new Set((data || []).map((r) => r.purok))].sort());
    };
    fetchResidents();
  }, []);

  // Group by purok for chart
  useEffect(() => {
    const filtered =
      selectedPurok === "All"
        ? allResidents
        : allResidents.filter((r) => r.purok === selectedPurok);
    setTotalResidents(filtered.length);

    const grouped = filtered.reduce((acc, r) => {
      acc[r.purok] = (acc[r.purok] || 0) + 1;
      return acc;
    }, {});
    setPurokData(
      Object.keys(grouped)
        .map((purok) => ({
          name: purok,
          users: grouped[purok],
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [allResidents, selectedPurok]);

  // 🧾 Compliance (static)
  useEffect(() => {
    setComplianceData([
      { area: "Purok 1", rate: 75 },
      { area: "Purok 2", rate: 82 },
      { area: "Purok 3", rate: 90 },
      { area: "Purok 4", rate: 85 },
      { area: "Purok 5", rate: 95 },
    ]);
  }, []);

  // ✅ Active Routes (only ongoing) - Realtime
  useEffect(() => {
    const fetchActiveRoutes = async () => {
      const { count } = await supabase
        .from("schedules")
        .select("status", { count: "exact", head: true })
        .eq("status", "ongoing");
      setActiveRoutes(count || 0);
    };
    fetchActiveRoutes();
    const channel = supabase
      .channel("realtime-active-routes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        (payload) => {
          const newStatus = payload.new?.status?.toLowerCase();
          const oldStatus = payload.old?.status?.toLowerCase();
          if (newStatus === "ongoing" || oldStatus === "ongoing") {
            fetchActiveRoutes();
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ✅ Completed Schedules
  useEffect(() => {
    const fetchCompleted = async () => {
      const { count } = await supabase
        .from("schedules")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");
      setCompletedCollectionsToday(count || 0);
    };
    fetchCompleted();
  }, []);

  // 🕒 Recent Activities (dynamic from schedules) - Realtime
  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("schedule_id, status, date, purok, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5); // Limit to 5 for a clean sidebar
      if (error) {
        console.error("Error fetching schedules:", error);
        return;
      }

      const filtered = (data || [])
        .filter((s) => ["ongoing", "completed"].includes(s.status?.toLowerCase()))
        .map((s) => ({
          id: s.schedule_id,
          type: s.status.toLowerCase() === "completed" ? "complete" : "update",
          action:
            s.status.toLowerCase() === "completed"
              ? `Collection completed in Purok ${s.purok || "Unknown"}`
              : `Collection ongoing in Purok ${s.purok || "Unknown"}`,
          created_at: s.updated_at || new Date().toISOString(),
        }));
      setActivities(filtered);
    };
    fetchActivities();
    const channel = supabase
      .channel("realtime-schedules")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "schedules" },
        (payload) => {
          const newStatus = payload.new.status?.toLowerCase();
          if (["ongoing", "completed"].includes(newStatus)) {
            fetchActivities();
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ✅ Pending Reports
  useEffect(() => {
    const fetchReports = async () => {
      const { data: reports } = await supabase.from("reports").select("id");
      if (!reports || reports.length === 0) return setPendingReports(0);
      const reportIds = reports.map((r) => r.id);
      const { data: statuses } = await supabase
        .from("report_status")
        .select("report_id, status")
        .in("report_id", reportIds);
      const latestStatus = {};
      statuses?.forEach((s) => (latestStatus[s.report_id] = s.status));
      const pending = reports.filter(
        (r) => (latestStatus[r.id] || "Pending") === "Pending"
      );
      setPendingReports(pending.length);
    };
    fetchReports();
    // TODO: Add realtime listener for reports
  }, []);

  // ✅ Citizen Participation
  useEffect(() => {
    if (totalResidents === 0) return;
    const fetchReportsForParticipation = async () => {
      const { data: reports } = await supabase
        .from("reports")
        .select("user_id"); // Assumes user_id is the resident
      if (!reports || reports.length === 0) {
        setCitizenParticipation(0);
        return;
      }
      const reportedResidents = new Set(
        reports.map((report) => report.user_id)
      );
      const participationPercentage =
        (reportedResidents.size / totalResidents) * 100;
      setCitizenParticipation(
        participationPercentage > 100
          ? 100
          : participationPercentage.toFixed(1)
      );
    };
    fetchReportsForParticipation();
  }, [totalResidents]);

  // ✅ Cards Definition - THIS SECTION IS UNCHANGED
  const cards = [
    {
      id: "collections",
      title: "Completed Collections",
      value: completedCollectionsToday,
      subtitle: "All-time completed schedules",
      accent: "blue-500",
      valueColor: "text-blue-600",
      iconBg: "bg-blue-100",
      icon: Trash2,
      subtitleColor: "text-green-600",
    },
    {
      id: "compliance",
      title: "Compliance Rate",
      value: "4.7/5",
      subtitle: "+5% this month",
      accent: "green-500",
      valueColor: "text-green-600",
      iconBg: "bg-green-100",
      icon: CheckCircle2,
      subtitleColor: "text-green-600",
    },
    {
      id: "reports",
      title: "Pending Reports",
      value: pendingReports,
      subtitle: "Needs attention",
      accent: "yellow-500",
      valueColor: "text-yellow-600",
      iconBg: "bg-yellow-100",
      icon: Info,
      subtitleColor: "text-yellow-600",
    },
    {
      id: "routes",
      title: "Active Routes",
      value: activeRoutes,
      subtitle: activeRoutes > 0 ? "Currently operating" : "No active routes",
      accent: "purple-500",
      valueColor: "text-purple-600",
      iconBg: "bg-purple-50",
      icon: MapPin,
      subtitleColor: "text-green-600",
    },
    {
      id: "education",
      title: "Active Education",
      value: activeEducation,
      subtitle: "Published contents",
      accent: "indigo-500",
      valueColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      icon: BookOpen,
      subtitleColor: "text-indigo-600",
    },
    {
      id: "archived",
      title: "Archived Education",
      value: archivedEducation,
      subtitle: "Stored contents",
      accent: "red-500",
      valueColor: "text-red-600",
      iconBg: "bg-red-50",
      icon: Archive,
      subtitleColor: "text-red-600",
    },
  ];

  // ✅ Efficiency chart
  useEffect(() => {
    const fetchEfficiency = async () => {
      const { data } = await supabase.from("schedules").select("date, status");
      if (!data || data.length === 0) {
        setEfficiencyData([]);
        setCollectionEfficiency(0);
        return;
      }
      const grouped = data.reduce((acc, s) => {
        const day = new Date(s.date).toLocaleString("en-US", {
          weekday: "short",
        });
        acc[day] = acc[day] || { total: 0, completed: 0 };
        acc[day].total++;
        if (s.status === "completed") acc[day].completed++;
        return acc;
      }, {});

      const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const formattedData = dayOrder.map((day) => ({
        day,
        efficiency: grouped[day]
          ? ((grouped[day].completed / grouped[day].total) * 100).toFixed(0)
          : 0,
      }));
      setEfficiencyData(formattedData);

      const totalCompleted = data.filter(
        (s) => s.status === "completed"
      ).length;
      const totalSchedules = data.length;
      const avgEfficiency =
        totalSchedules > 0
          ? ((totalCompleted / totalSchedules) * 100).toFixed(1)
          : 0;
      setCollectionEfficiency(avgEfficiency);
    };
    fetchEfficiency();
  }, []);

  // --- ✅ UI Render ---
  return (
    // SECTION UNCHANGED
    <section className="min-h-screen p-4 sm:p-6 space-y-6">
      {/* --- Top Cards: UNCHANGED (as requested) --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.15 }}
            className={`bg-white rounded-2xl shadow-md hover:shadow-xl px-4 sm:px-6 py-4 border-l-4 border-${card.accent} flex flex-col justify-between transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <p className="text-gray-500 font-bold text-xs sm:text-sm">
                  {card.title}
                </p>
                <h2
                  className={`text-3xl sm:text-4xl font-extrabold ${card.valueColor}`}
                >
                  {card.value}
                </h2>
              </div>
              <div className={`${card.iconBg} p-3 sm:p-4 rounded-xl`}>
                <card.icon
                  className={`w-7 sm:w-9 h-7 sm:h-9 ${card.valueColor}`}
                />
              </div>
            </div>
            <p className={`text-xs sm:text-sm mt-2 ${card.subtitleColor}`}>
              {card.subtitle}
            </p>
          </motion.div>
        ))}
      </div>

      {/* --- Main Content Area: UNCHANGED --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Main Column (Charts) --- */}
        <div className="lg:col-span-2 space-y-6">
          {/* --- Residents per Purok: UNCHANGED --- */}
          <div className="bg-white rounded-xl shadow-lg border border-stone-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-700" />
                Residents per Purok
              </h3>
              <div className="flex items-center gap-3 mt-3 sm:mt-0">
                <label className="text-sm font-medium text-slate-600">
                  Filter:
                </label>
                <select
                  value={selectedPurok}
                  onChange={(e) => setSelectedPurok(e.target.value)}
                  className="border-slate-300 rounded-md shadow-sm p-2 text-sm focus:ring-green-500 focus:border-green-500"
                >
                  <option value="All">All Puroks</option>
                  {purokList.map((purok) => (
                    <option key={purok} value={purok}>
                      {purok}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Total residents in view:{" "}
              <span className="font-bold text-green-700">{totalResidents}</span>
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purokData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis
                    stroke="#6b7280"
                    allowDecimals={false}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} residents`, "Count"]}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="users" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- Compliance Rate: UNCHANGED --- */}
          <div className="bg-white rounded-xl shadow-lg border border-stone-200 p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-700" />
              Compliance Rates by Area
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="area" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      border: "none",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#16a34a" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- Sidebar Column (Activities & Analytics) --- */}
        <div className="lg:col-span-1 space-y-6">
          {/* --- Recent Activities: UNCHANGED (as requested) --- */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 hover:shadow-3xl transition">
            <h3 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-pink-600 mb-4">
              Recent Activities
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1 sm:pr-2">
              {activities.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activities</p>
              ) : (
                activities.map((activity) => {
                  const style = typeStyles[activity.type] || typeStyles.update;
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${style.bg} hover:bg-white hover:shadow-md transition-all`}
                    >
                      <Icon
                        className={`w-6 h-6 ${style.color} animate-bounce`}
                      />
                      <div>
                        <p className="font-medium text-gray-700 text-sm sm:text-base">
                          {activity.action}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* --- Efficiency Chart: UNCHANGED --- */}
          <div className="bg-white rounded-xl shadow-lg border border-stone-200 p-5">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <LineChartIcon className="w-6 h-6 text-green-700" />
              Collection Efficiency (Weekly)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" unit="%" fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Efficiency"]}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      border: "none",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#16a34a" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- Detailed Analytics: SECTION MODIFIED --- */}
          {/* Changed from 'space-y-4' to 'grid grid-cols-2 gap-4' */}
          {/* Re-styled items to be compact mini-cards */}
          <div className="bg-white rounded-xl shadow-lg border border-stone-200 p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">
              Detailed Analytics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Item 1: Efficiency */}
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 text-green-700 mb-2">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm leading-tight">
                  Collection Efficiency
                </h4>
                <p className="text-2xl font-bold text-green-700">
                  {collectionEfficiency}%
                </p>
              </div>

              {/* Item 2: Participation */}
              <div className="p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-700 mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm leading-tight">
                  Citizen Participation
                </h4>
                <p className="text-2xl font-bold text-amber-700">
                  {citizenParticipation}%
                </p>
              </div>

              {/* Item 3: Waste Reduction */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-700 mb-2">
                  <Recycle className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm leading-tight">
                  Waste Reduction
                </h4>
                <p className="text-2xl font-bold text-blue-700">50%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}