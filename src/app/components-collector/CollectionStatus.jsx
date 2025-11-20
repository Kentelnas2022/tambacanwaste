"use client";

import { useState, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { supabase } from "@/supabaseClient";
import StatsOverview from "./StatsOverview";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, X } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "leaflet/dist/leaflet.css";

// 🧩 Fix Leaflet marker icons (client-only)
if (typeof window !== "undefined") {
  const L = require("leaflet");
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Default center (fallback)
const DEFAULT_CENTER = [8.228, 124.245];

// --- RoutePicker Component ---
function RoutePicker({ points, setPoints }) {
  // ... (This component is unchanged)
  useMapEvents({
    click(e) {
      if (!points || points.length === 0) {
        setPoints([[e.latlng.lat, e.latlng.lng]]);
      } else if (points.length === 1) {
        setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
      } else {
        setPoints([[e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
}

// --- MapController Component ---
function MapController({ points }) {
  // ... (This component is unchanged)
  const map = useMapEvents({});
  useEffect(() => {
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        /* ignore */
      }
    }, 200);

    if (points && points.length > 0) {
      try {
        map.setView(points[0], 15);
      } catch (e) {
        /* ignore */
      }
    }
  }, [map, points]);

  return null;
}

// --- parseCoordinates Helper ---
const parseCoordinates = (coordData) => {
  // ... (This function is unchanged)
  if (!coordData) return [];
  if (Array.isArray(coordData)) return coordData;
  try {
    const parsed = JSON.parse(
      typeof coordData === "string" ? coordData.replace(/'/g, '"') : coordData
    );
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    // fallback
  }
  return [];
};

// --- StatusModal Component ---
const StatusModal = ({ purok, onClose, onUpdate }) => {
  // ... (This component is unchanged)
  const [newStatus, setNewStatus] = useState(purok.status || "not-started");
  const [newRoutePlan, setNewRoutePlan] = useState(purok.routePlan || "A");
  const [newRoutePoints, setNewRoutePoints] = useState(purok.coordinates || []);
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (time) => {
    if (!time) return "—";
    const [hour, minute] = time.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  const handlePlanChange = (e) => {
    const selectedPlan = e.target.value;
    setNewRoutePlan(selectedPlan);

    if (selectedPlan === "A") {
      setNewRoutePoints(purok.coordinates || []);
    } else {
      setNewRoutePoints([]);
    }
  };

  const handleUpdateClick = async () => {
    setIsLoading(true);
    Swal.fire({
      title: "Updating...",
      text: "Please wait while the schedule is updated.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const { data: updatedData, error } = await supabase
      .from("schedules")
      .update({
        status: newStatus,
        plan: newRoutePlan,
        route_points: JSON.stringify(newRoutePoints),
        updated_at: new Date().toISOString(),
      })
      .eq("schedule_id", purok.id)
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message,
      });
      console.error("Update error:", error);
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Schedule Updated!",
      text: `${purok.purok} schedule has been successfully updated.`,
      showConfirmButton: false,
      timer: 1800,
    });

    onUpdate(updatedData);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            Update Schedule
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow p-6 space-y-4 overflow-y-auto">
          {/* Date and Day */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="text"
                value={purok.scheduleDate || "mm/dd/yyyy"}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day
              </label>
              <input
                type="text"
                value={purok.scheduleDay || "---"}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
            </div>
          </div>

          {/* Purok */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purok
            </label>
            <input
              type="text"
              value={purok.purok || "---"}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
          </div>

          {/* Start and End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={formatTime(purok.scheduleStart)}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="text"
                value={formatTime(purok.scheduleEnd)}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
            </div>
          </div>

          {/* Waste Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Waste Type
            </label>
            <input
              type="text"
              value={purok.wasteType || "---"}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
          </div>

          {/* Route Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Plan
            </label>
            <select
              value={newRoutePlan}
              onChange={handlePlanChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent text-sm"
            >
              <option value="A">Plan A</option>
              <option value="B">Plan B</option>
            </select>
          </div>

          {/* Map */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Points (Click to change)
            </label>
            <div className="overflow-hidden h-60 rounded-lg border border-gray-300">
              <MapContainer
                key={newRoutePlan + JSON.stringify(newRoutePoints)}
                center={
                  newRoutePoints.length > 0 ? newRoutePoints[0] : DEFAULT_CENTER
                }
                zoom={15}
                className="h-full w-full"
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap"
                />
                <MapController points={newRoutePoints} />
                <RoutePicker
                  points={newRoutePoints}
                  setPoints={setNewRoutePoints}
                />
                {newRoutePoints.map((pos, i) => (
                  <Marker key={i} position={pos}>
                    <Popup>
                      {i === 0
                        ? "Start"
                        : i === newRoutePoints.length - 1
                        ? "End"
                        : `Stop ${i}`}
                    </Popup>
                  </Marker>
                ))}
                {newRoutePoints.length > 0 && (
                  <Polyline positions={newRoutePoints} />
                )}
              </MapContainer>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Update Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent text-sm"
            >
              <option value="not-started">Not Started</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateClick}
            className="px-4 py-2 rounded-md bg-red-800 hover:bg-red-700 text-white font-medium transition disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Schedule"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
// --- end StatusModal ---

export default function CollectionStatus() {
  const [schedules, setSchedules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mapSelected, setMapSelected] = useState(null);

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    key: "purok",
    direction: "asc",
  });

  // 💡 NEW: State for the status filter
  const [statusFilter, setStatusFilter] = useState("all");

  // HELPER: Converts a Supabase row to the local state format
  const mapSupabaseRow = (r) => {
    // ... (This function is unchanged)
    const parsedRoute = parseCoordinates(r.route_points);
    return {
      id: r.schedule_id,
      purok: r.purok || "Purok (Details Missing)",
      routeType: r.type || "View Route",
      routePlan: r.plan || "Not set",
      scheduleDay: r.day || "—",
      scheduleDate: r.date || "—",
      scheduleStart: r.start_time || null,
      scheduleEnd: r.end_time || null,
      status: (r.status || "not-started").toLowerCase(),
      wasteType: r.waste_type || "General",
      coordinates: parsedRoute,
    };
  };

  // Fetch schedules and set up real-time subscription
  useEffect(() => {
    // ... (This useEffect is unchanged)
    // 1. Initial Fetch
    const fetchSchedules = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching schedules:", error);
        return;
      }

      const { data: archivedData, error: archivedError } = await supabase
        .from("collection_archive")
        .select("schedule_id");

      if (archivedError) {
        console.error("Error fetching archives:", archivedError);
      }

      const archivedIds = new Set(
        (archivedData || []).map((a) => a.schedule_id)
      );
      const filtered = (data || []).filter(
        (r) => !archivedIds.has(r.schedule_id)
      );

      const mapped = filtered.map(mapSupabaseRow);
      setSchedules(mapped);
    };

    fetchSchedules();

    // 2. Set up Realtime Subscription
    const channel = supabase
      .channel("schedules-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "schedules" },
        (payload) => {
          console.log("Realtime INSERT:", payload.new);
          const newSchedule = mapSupabaseRow(payload.new);
          setSchedules((prevSchedules) => [...prevSchedules, newSchedule]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "schedules" },
        (payload) => {
          console.log("Realtime UPDATE:", payload.new);
          const updatedSchedule = mapSupabaseRow(payload.new);
          setSchedules((prevSchedules) =>
            prevSchedules.map((s) =>
              s.id === updatedSchedule.id ? updatedSchedule : s
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "schedules" },
        (payload) => {
          console.log("Realtime DELETE:", payload.old);
          setSchedules((prevSchedules) =>
            prevSchedules.filter((s) => s.id !== payload.old.schedule_id)
          );
        }
      )
      .subscribe();

    // 3. Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Only run on mount

  // Handler for changing the sort
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Helper to show sort arrow
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return " ↕"; // Default, unsorted
    }
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  const getStatusClasses = (status) => {
    // ... (This function is unchanged)
    const styles = {
      "not-started": "bg-red-100 text-red-800",
      ongoing: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const handleUpdate = (updatedSchedule) => {
    // ... (This function is unchanged)
    setSchedules((prev) =>
      prev.map((p) =>
        p.id === updatedSchedule.id
          ? {
              ...p,
              status: updatedSchedule.status,
              plan: updatedSchedule.plan,
              coordinates: parseCoordinates(updatedSchedule.route_points),
              routePlan: updatedSchedule.plan,
            }
          : p
      )
    );
    setSelected(null);
  };

  const handleArchive = async (item) => {
    // ... (This function is unchanged)
    if (!item?.id) {
      Swal.fire("Error", "Missing schedule ID — cannot archive.", "error");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to archive ${item.purok}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, archive it!",
    });

    if (!result.isConfirmed) return;

    try {
      const { error: archiveError } = await supabase
        .from("collection_archive")
        .insert([
          {
            schedule_id: item.id,
            purok: item.purok,
            route_type: item.routeType,
            route_plan: item.routePlan,
            schedule_day: item.scheduleDay,
            schedule_date: item.scheduleDate,
            start_time: item.scheduleStart,
            end_time: item.scheduleEnd,
            waste_type: item.wasteType,
            status: item.status,
            coordinates: JSON.stringify(item.coordinates || []),
            archived_at: new Date().toISOString(),
          },
        ]);

      if (archiveError) throw archiveError;

      const { error: deleteError } = await supabase
        .from("schedules")
        .delete()
        .eq("schedule_id", item.id);
      if (deleteError) throw deleteError;

      setSchedules((prev) => prev.filter((p) => p.id !== item.id));

      Swal.fire("Archived!", `${item.purok} has been archived.`, "success");
    } catch (err) {
      console.error("Archive failed:", err.message);
      Swal.fire("Error", `Archive failed: ${err.message}`, "error");
    }
  };

  const formatTime = (time) => {
    // ... (This function is unchanged)
    if (!time) return "—";
    const [hour, minute] = time.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  const formatDateWithDay = (dateString, day) => {
    // ... (This function is unchanged)
    if (!dateString || dateString === "—") return "—";
    const date = new Date(dateString);
    return `${day}, ${date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
  };

  // --- Data Flow Memos ---

  const uniqueSchedules = useMemo(() => {
    // ... (This memo is unchanged)
    const map = new Map();
    schedules.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [schedules]);

  // 💡 NEW: Memo for filtering
  const filteredSchedules = useMemo(() => {
    if (statusFilter === "all") {
      return uniqueSchedules;
    }
    return uniqueSchedules.filter(
      (schedule) => schedule.status === statusFilter
    );
  }, [uniqueSchedules, statusFilter]); // Depends on uniqueSchedules and the filter

  // 💡 MODIFIED: This memo now depends on filteredSchedules
  const sortedSchedules = useMemo(() => {
    const sortableItems = [...filteredSchedules]; // Use filteredSchedules

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Specific handling for different keys
        if (sortConfig.key === "purok") {
          aValue = parseInt(aValue.replace(/\D/g, "")) || 0;
          bValue = parseInt(bValue.replace(/\D/g, "")) || 0;
        } else if (sortConfig.key === "scheduleDate") {
          // Handle dates
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else {
          // Default to string comparison
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredSchedules, sortConfig]); // Depends on filteredSchedules

  return (
    <motion.div
      className=""
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <StatsOverview puroks={sortedSchedules} />

      {/* 💡 NEW: Filter Dropdown */}
      <div className="flex justify-end mt-4">
        <label
          htmlFor="status-filter"
          className="block text-sm font-medium text-gray-700 mr-2 self-center"
        >
          Filter by status:
        </label>
        <select
          id="status-filter"
          name="status-filter"
          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Show All</option>
          <option value="not-started">Not Started</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mt-2 -webkit-overflow-scrolling-touch">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => requestSort("purok")}
                  className="flex items-center gap-1 font-semibold uppercase text-xs"
                >
                  Purok
                  <span className="text-gray-400">
                    {getSortIndicator("purok")}
                  </span>
                </button>
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Route Type
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => requestSort("routePlan")}
                  className="flex items-center gap-1 font-semibold uppercase text-xs"
                >
                  Route Plan
                  <span className="text-gray-400">
                    {getSortIndicator("routePlan")}
                  </span>
                </button>
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => requestSort("scheduleDate")}
                  className="flex items-center gap-1 font-semibold uppercase text-xs"
                >
                  Schedule
                  <span className="text-gray-400">
                    {getSortIndicator("scheduleDate")}
                  </span>
                </button>
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => requestSort("wasteType")}
                  className="flex items-center gap-1 font-semibold uppercase text-xs"
                >
                  Waste Type
                  <span className="text-gray-400">
                    {getSortIndicator("wasteType")}
                  </span>
                </button>
              </th>
              
              {/* 💡 MODIFIED: Removed sorting button from Status header */}
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            <AnimatePresence>
              {sortedSchedules.map((p) => (
                <motion.tr
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-800 whitespace-nowrap">
                    {p.purok}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <button
                      onClick={() => setMapSelected(p)}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                    >
                      <Eye size={16} />
                      <span>{p.routeType}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{p.routePlan}</td>
                  <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">
                        {formatDateWithDay(p.scheduleDate, p.scheduleDay)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatTime(p.scheduleStart)} –{" "}
                        {formatTime(p.scheduleEnd)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{p.wasteType}</td>
                  <td className="py-3 px-4">
                    <motion.span
                      layout
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusClasses(
                        p.status
                      )}`}
                    >
                      {p.status.replace("-", " ")}
                    </motion.span>
                  </td>
                  <td className="py-3 px-4 text-right flex justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelected(p)}
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-red-800 text-white rounded-lg shadow-sm hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Update
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleArchive(p)}
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-gray-600 text-white rounded-lg shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Archive
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* ... (Modals are unchanged) ... */}
      <AnimatePresence>
        {selected && (
          <StatusModal
            key={selected.id}
            purok={selected}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
          />
        )}
      </AnimatePresence>

      {mapSelected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-2">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg md:max-w-2xl p-4 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
              onClick={() => setMapSelected(null)}
            >
              ✖
            </button>
            <h2 className="text-lg font-semibold mb-3">
              Route for {mapSelected.purok}
            </h2>
            <div className="h-80 sm:h-96 w-full rounded-lg overflow-hidden">
              <MapContainer
                center={mapSelected.coordinates[0] || DEFAULT_CENTER}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {mapSelected.coordinates.length > 0 && (
                  <>
                    {mapSelected.coordinates.map((pos, idx) => (
                      <Marker key={idx} position={pos}>
                        <Popup>
                          {idx === 0
                            ? "Start Point"
                            : idx === mapSelected.coordinates.length - 1
                            ? "End Point"
                            : `Stop ${idx}`}
                        </Popup>
                      </Marker>
                    ))}
                    <Polyline positions={mapSelected.coordinates} />
                  </>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}