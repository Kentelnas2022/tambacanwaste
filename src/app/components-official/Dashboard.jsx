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
  ChevronRight, // Added for card arrow
  ArrowUp, // Added for percentage arrow
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

// Helper component for the gradient icon containers (Slightly adjusted rounding)
const IconContainer = ({ accent, children }) => {
  const gradients = {
    "blue-500": "from-blue-500 to-blue-600",
    "green-500": "from-green-500 to-green-600",
    "yellow-500": "from-yellow-500 to-orange-500", // Adjusted for better color
    "purple-500": "from-purple-500 to-violet-600", // Adjusted for better color
    "indigo-500": "from-indigo-500 to-indigo-600",
    "red-500": "from-red-500 to-red-600",
  };
  return (
    <div
      className={`bg-gradient-to-br ${
        gradients[accent] || "from-gray-500 to-gray-600"
      } p-4 sm:p-5 rounded-2xl shadow-lg flex-shrink-0`} // Increased padding and rounding
    >
      {children}
    </div>
  );
};

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

  const typeStyles = {
    complete: {
      icon: CheckCircle2,
      color: "green",
      bg: "from-green-50 to-emerald-50 border-green-500",
    },
    create: {
      icon: PlusCircle,
      color: "blue",
      bg: "from-blue-50 to-indigo-50 border-blue-500",
    },
    update: {
      icon: RefreshCcw,
      color: "yellow",
      bg: "from-yellow-50 to-amber-50 border-yellow-500",
    },
    delete: {
      icon: Trash2,
      color: "red",
      bg: "from-red-50 to-pink-50 border-red-500",
    },
    message: {
      icon: MessageSquare,
      color: "indigo",
      bg: "from-indigo-50 to-violet-50 border-indigo-500",
    },
    report: {
      icon: FileText,
      color: "purple",
      bg: "from-purple-50 to-fuchsia-50 border-purple-500",
    },
  };

  // --- ALL DATA FETCHING & REALTIME LOGIC IS UNCHANGED ---
  // ... (All your useEffect hooks remain here) ...
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
        .filter((s) =>
          ["ongoing", "completed"].includes(s.status?.toLowerCase())
        )
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

  // --- CARD DEFINITIONS UPDATED ---
  // Restored all 6 cards
  const cards = [
    {
      id: "collections",
      title: "Total Collections Today",
      value: completedCollectionsToday,
      subtitle: "+12% vs yesterday",
      accent: "blue-500",
      valueColor: "text-blue-600",
      icon: Trash2,
      subtitleColor: "text-green-500",
      showTrendIcon: true,
    },
    {
      id: "compliance",
      title: "Compliance Rate",
      value: "4.7/5",
      subtitle: "+5% this month",
      accent: "green-500",
      valueColor: "text-green-600",
      icon: CheckCircle2,
      subtitleColor: "text-green-500",
      showTrendIcon: true,
    },
    {
      id: "reports",
      title: "Pending Reports",
      value: pendingReports,
      subtitle: "Needs attention",
      accent: "yellow-500",
      valueColor: "text-yellow-600",
      icon: Info,
      subtitleColor: "text-yellow-600",
      showTrendIcon: false,
    },
    {
      id: "routes",
      title: "Active Routes",
      value: activeRoutes,
      subtitle: activeRoutes > 0 ? "All operational" : "No active routes",
      accent: "purple-500",
      valueColor: "text-purple-600",
      icon: MapPin,
      subtitleColor: "text-green-600",
      showTrendIcon: false,
    },
    {
      id: "education",
      title: "Active Education",
      value: activeEducation,
      subtitle: "Published contents",
      accent: "indigo-500",
      valueColor: "text-indigo-600",
      icon: BookOpen,
      subtitleColor: "text-indigo-600",
      showTrendIcon: false, // Assuming no trend icon for this
    },
    {
      id: "archived",
      title: "Archived Education",
      value: archivedEducation,
      subtitle: "Stored contents",
      accent: "red-500",
      valueColor: "text-red-600",
      icon: Archive,
      subtitleColor: "text-red-600",
      showTrendIcon: false, // Assuming no trend icon for this
    },
  ];

  // --- UI Render ---
  return (
    <section className="dashboard-bg min-h-screen p-4 sm:p-6 space-y-6 relative z-0">
      {/* --- Floating Background Elements --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-green-200 rounded-full opacity-10 blur-3xl animation-delay-300"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-yellow-200 rounded-full opacity-10 blur-3xl animation-delay-600"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-10 blur-3xl animation-delay-900"></div>
      </div>

      {/* --- Container to limit width and center --- */}
      <div className="max-w-7xl mx-auto space-y-6">

        {/* --- Top Cards: NEW DESIGN APPLIED --- */}
        {/* Kept lg:grid-cols-6 to fit all 6 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 relative z-10">
          {cards.map((card) => {
            const accentBg = `bg-${card.accent.split("-")[0]}-500`; // e.g., bg-blue-500
            return (
              <motion.div
                key={card.id}
                whileTap={{ scale: 0.98 }}
                className=" hover-lift rounded-3xl shadow-lg p-5 sm:p-6 relative overflow-hidden"
              >
                {/* Background Blob */}
                <div
                  className={`absolute -top-1/3 -left-1/3 w-2/3 h-2/3 ${accentBg} rounded-full opacity-15 blur-2xl pointer-events-none`}
                ></div>

                <div className="flex justify-between items-center relative z-10">
                  {/* Left Side: Text Content */}
                  <div className="flex flex-col">
                    <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                      {card.title}
                    </p>
                    <h2
                      className={`text-3xl sm:text-4xl font-bold ${card.valueColor}`}
                    >
                      {card.value}
                    </h2>
                    <div
                      className={`flex items-center mt-2 text-xs ${card.subtitleColor}`}
                    >
                      {card.showTrendIcon && (
                        <ArrowUp className="w-3 h-3 mr-1" />
                      )}
                      {!card.showTrendIcon &&
                        card.id === "reports" &&
                        card.value > 0 && (
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></div> // Dot for pending reports
                        )}
                      {!card.showTrendIcon && card.id === "routes" && (
                        <div
                          className={`w-1.5 h-1.5 ${
                            activeRoutes > 0 ? "bg-green-500" : "bg-gray-400"
                          } rounded-full mr-1.5`}
                        ></div> // Dot for active routes
                      )}
                      <span>{card.subtitle}</span>
                    </div>
                  </div>

                  {/* Right Side: Icon */}
                  <IconContainer accent={card.accent}>
                    <card.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </IconContainer>
                </div>

                {/* Subtle Arrow Bottom Right */}
                <ChevronRight className="absolute bottom-4 right-4 w-5 h-5 text-gray-300 opacity-50" />
              </motion.div>
            );
          })}
        </div>

        {/* --- Main Content Area: APPLYING NEW CARD STYLE to 2x2 LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 relative z-10">
          {/* --- Cell 1: Residents per Purok --- */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className=" hover-lift rounded-3xl shadow-lg p-5 sm:p-6 relative overflow-hidden" // Applied new style
          >
            {/* Background Blob */}
            <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-white rounded-full opacity-10 blur-2xl pointer-events-none"></div>
            <div className="relative z-10"> {/* Content needs higher z-index */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold gradient-text flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Residents per Purok
                </h3>
                <div className="flex items-center gap-3 mt-3 sm:mt-0">
                  <label className="text-sm font-medium text-slate-600">
                    Filter:
                  </label>
                  <select
                    value={selectedPurok}
                    onChange={(e) => setSelectedPurok(e.target.value)}
                    className="border-slate-300 rounded-md shadow-sm p-2 text-sm focus:ring-green-500 focus:border-green-500 bg-white bg-opacity-80 backdrop-blur-sm" // Added slight transparency
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
                <span className="font-bold text-blue-600">
                  {totalResidents}
                </span>
              </p>
              {/* Chart container adjusted for new card style */}
              <div className="chart-container h-64 sm:h-72 bg-opacity-70 rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={purokData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5}/>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value} residents`, "Count"]}
                      contentStyle={{
                        borderRadius: "0.5rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        border: "none",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(5px)",
                      }}
                    />
                    <Bar
                      dataKey="users"
                      fill="url(#colorUvMain)"
                      radius={[4, 4, 0, 0]}
                    />
                     <defs>
                      <linearGradient id="colorUvMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#764ba2" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* --- Cell 2: Compliance Rate --- */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className=" hover-lift rounded-3xl shadow-lg p-5 sm:p-6 relative overflow-hidden" // Applied new style
          >
             {/* Background Blob */}
             <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2  rounded-full opacity-10 blur-2xl pointer-events-none"></div>
             <div className="relative z-10">
                <h3 className="text-lg sm:text-xl font-bold gradient-text mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Compliance Rates by Area
                </h3>
                <div className="chart-container h-64 sm:h-72 bg-opacity-70 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={complianceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5}/>
                      <XAxis dataKey="area" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          border: "none",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(5px)",
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
          </motion.div>

          {/* --- Cell 3: Collection Efficiency --- */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className=" hover-lift rounded-3xl shadow-lg p-5 sm:p-6 relative overflow-hidden" // Applied new style
          >
             {/* Background Blob */}
             <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-white rounded-full opacity-10 blur-2xl pointer-events-none"></div>
             <div className="relative z-10">
                <h3 className="text-lg sm:text-xl font-bold gradient-text mb-4 flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5" />
                  Collection Efficiency (Weekly)
                </h3>
                <div className="chart-container h-64 sm:h-72 bg-opacity-70 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={efficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5}/>
                      <XAxis dataKey="day" />
                      <YAxis unit="%" />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Efficiency"]}
                         contentStyle={{
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          border: "none",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(5px)",
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
          </motion.div>

          {/* --- Cell 4: Recent Activities & Detailed Analytics (Stacked) --- */}
          <div className="space-y-6 lg:space-y-8">
            {/* --- Recent Activities --- */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              className=" hover-lift rounded-3xl shadow-lg p-5 sm:p-6 relative overflow-hidden" // Applied new style
            >
               {/* Background Blob */}
              <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-white rounded-full opacity-10 blur-2xl pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-500 bg-clip-text text-transparent">
                    Recent Activities
                  </h3>
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-2.5 h-2.5 rounded-full pulse-dot"></div>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[180px] sm:max-h-[220px] pr-1"> {/* Adjusted height */}
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
                          transition={{ duration: 0.3 }}
                          className={`activity-item flex items-center space-x-3 p-3 bg-gradient-to-r ${style.bg} rounded-lg border-l-4 bg-opacity-80 backdrop-blur-sm`} // Added slight transparency
                        >
                          <Icon
                            className={`w-5 h-5 text-${style.color}-600 animate-bounce flex-shrink-0`}
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 text-sm">
                              {activity.action}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(activity.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>

            {/* --- Detailed Analytics --- */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              className=" hover-lift rounded-3xl shadow-lg p-5 sm:p-6 relative overflow-hidden" // Applied new style
            >
               {/* Background Blob */}
              <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500 rounded-full opacity-10 blur-2xl pointer-events-none"></div>
              <div className="relative z-10">
                  <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-4">
                    Detailed Analytics
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Item 1: Efficiency */}
                    <div className="p-3 bg-green-50 bg-opacity-80 backdrop-blur-sm rounded-xl text-center">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-100 text-green-700 mb-1 mx-auto">
                        <PackageCheck className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-slate-700 text-xs leading-tight mb-0.5">
                        Collection Efficiency
                      </h4>
                      <p className="text-xl font-bold text-green-700">
                        {collectionEfficiency}%
                      </p>
                    </div>
                    {/* Item 2: Participation */}
                    <div className="p-3 bg-amber-50 bg-opacity-80 backdrop-blur-sm rounded-xl text-center">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-700 mb-1 mx-auto">
                        <Users className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-slate-700 text-xs leading-tight mb-0.5">
                        Citizen Participation
                      </h4>
                      <p className="text-xl font-bold text-amber-700">
                        {citizenParticipation}%
                      </p>
                    </div>
                    {/* Item 3: Waste Reduction */}
                    <div className="p-3 bg-blue-50 bg-opacity-80 backdrop-blur-sm rounded-xl text-center">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-700 mb-1 mx-auto">
                        <Recycle className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-slate-700 text-xs leading-tight mb-0.5">
                        Waste Reduction
                      </h4>
                      <p className="text-xl font-bold text-blue-700">50%</p> {/* Example Value */}
                    </div>
                  </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}