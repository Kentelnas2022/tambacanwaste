"use client";

import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
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
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Default center (fallback)
const DEFAULT_CENTER = [8.228, 124.245];

// --- RoutePicker: picks points on click (max 2, reset afterward) ---
function RoutePicker({ points, setPoints }) {
  useMapEvents({
    click(e) {
      // console.log("map clicked", e.latlng);
      if (!points || points.length === 0) {
        setPoints([[e.latlng.lat, e.latlng.lng]]);
      } else if (points.length === 1) {
        setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
      } else {
        // start over with new first point
        setPoints([[e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
}

// MapController: keep map view in sync and fix size after modal visible
function MapController({ points }) {
  const map = useMapEvents({});
  useEffect(() => {
    // invalidate size after mount / when points change to ensure map receives clicks
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        /* ignore */
      }
    }, 200);

    if (points && points.length > 0) {
      // center to first point
      try {
        map.setView(points[0], 15);
      } catch (e) {
        /* ignore */
      }
    }
  }, [map, points]);

  return null;
}

// 🧭 Safely parse route coordinates
const parseCoordinates = (coordData) => {
  if (!coordData) return [];
  if (Array.isArray(coordData)) return coordData;
  try {
    const parsed = JSON.parse(typeof coordData === "string" ? coordData.replace(/'/g, '"') : coordData);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    // fallback
  }
  return [];
};

// 🧠 Log collector activity
const logActivity = async (schedule_id, action, type) => {
  const philippineTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
  });

  const { error } = await supabase.from("activities").insert([
    {
      schedule_id,
      action,
      type,
      created_at: philippineTime,
    },
  ]);

  if (error) console.error("Error logging activity:", error.message);
  else console.log("Activity logged:", action);
};

// --- StatusModal (updated) ---
const StatusModal = ({ purok, onClose, onUpdate }) => {
  const [newStatus, setNewStatus] = useState(purok.status || "not-started");
  const [newRoutePlan, setNewRoutePlan] = useState(purok.routePlan || "A");
  const [newRoutePoints, setNewRoutePoints] = useState(purok.coordinates || []);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to format time (copied from main component)
  const formatTime = (time) => {
    if (!time) return "—";
    const [hour, minute] = time.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  // handle plan change — explicit behavior: Plan A restores, Plan B clears
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
        plan: newRoutePlan, // Save new plan
        route_points: JSON.stringify(newRoutePoints), // Save new route points
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

    // Log the activity
    let actionText = `Updated schedule for ${purok.purok}`;
    let type = "update";

    if (newStatus !== purok.status) {
      if (newStatus === "completed") {
        actionText = `Marked ${purok.purok} collection as completed`;
        type = "complete";
      } else if (newStatus === "ongoing") {
        actionText = `Started collection for ${purok.purok}`;
      }
    } else if (newRoutePlan !== purok.routePlan) {
      actionText = `Updated ${purok.purok} plan to ${newRoutePlan}`;
    } else if (JSON.stringify(newRoutePoints) !== JSON.stringify(purok.coordinates)) {
      actionText = `Updated route points for ${purok.purok}`;
    }

    await logActivity(purok.id, actionText, type);

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
          <h3 className="text-lg font-semibold text-gray-900 truncate">Update Schedule</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow p-6 space-y-4 overflow-y-auto">
          {/* Date and Day */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="text"
                value={purok.scheduleDate || "mm/dd/yyyy"}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Purok</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="text"
                value={formatTime(purok.scheduleStart)}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
            <input
              type="text"
              value={purok.wasteType || "---"}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
          </div>

          {/* Route Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Route Plan</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Route Points (Click to change)</label>
            <div className="overflow-hidden h-60 rounded-lg border border-gray-300">
              <MapContainer
                key={newRoutePlan + JSON.stringify(newRoutePoints)} // remount on plan or points change
                center={newRoutePoints.length > 0 ? newRoutePoints[0] : DEFAULT_CENTER}
                zoom={15}
                className="h-full w-full"
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

                {/* controllers */}
                <MapController points={newRoutePoints} />

                {/* route picker */}
                <RoutePicker points={newRoutePoints} setPoints={setNewRoutePoints} />

                {/* markers & polyline */}
                {newRoutePoints.map((pos, i) => (
                  <Marker key={i} position={pos}>
                    <Popup>{i === 0 ? "Start" : i === newRoutePoints.length - 1 ? "End" : `Stop ${i}`}</Popup>
                  </Marker>
                ))}

                {newRoutePoints.length > 0 && <Polyline positions={newRoutePoints} />}
              </MapContainer>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
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

  // Fetch schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      const { data, error } = await supabase.from("schedules").select("*").order("date", { ascending: true });
      if (error) {
        console.error("Error fetching schedules:", error);
        return;
      }

      const mapped = data.map((r, index) => {
        const parsedRoute = parseCoordinates(r.route_points);
        return {
          id: r.schedule_id,
          purok: r.purok || `Purok ${index + 1}`,
          routeType: r.type || "Unknown",
          routePlan: r.plan || "Not set",
          scheduleDay: r.day || "—",
          scheduleDate: r.date || "—",
          scheduleStart: r.start_time || null,
          scheduleEnd: r.end_time || null,
          status: (r.status || "not-started").toLowerCase(),
          wasteType: r.waste_type || "General",
          coordinates: parsedRoute,
        };
      });
      setSchedules(mapped);
    };
    fetchSchedules();
  }, []);

  const getStatusClasses = (status) => {
    const styles = {
      "not-started": "bg-red-100 text-red-800",
      ongoing: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const handleUpdate = (updatedSchedule) => {
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
      const { error: archiveError } = await supabase.from("collection_archive").insert([
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

      const { error: deleteError } = await supabase.from("schedules").delete().eq("schedule_id", item.id);
      if (deleteError) throw deleteError;

      setSchedules((prev) => prev.filter((p) => p.id !== item.id));

      Swal.fire("Archived!", `${item.purok} has been archived.`, "success");
    } catch (err) {
      console.error("Archive failed:", err.message);
      Swal.fire("Error", `Archive failed: ${err.message}`, "error");
    }
  };

  const formatTime = (time) => {
    if (!time) return "—";
    const [hour, minute] = time.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  const formatDateWithDay = (dateString, day) => {
    if (!dateString || dateString === "—") return "—";
    const date = new Date(dateString);
    return `${day}, ${date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
  };

  const uniqueSchedules = useMemo(() => {
    const map = new Map();
    schedules.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [schedules]);

  const sortedSchedules = [...uniqueSchedules].sort((a, b) => {
    const numA = parseInt(a.purok.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.purok.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  return (
    <motion.div className="" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <StatsOverview puroks={sortedSchedules} />

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mt-6 -webkit-overflow-scrolling-touch">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purok</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Type</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Plan</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waste Type</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            <AnimatePresence>
              {sortedSchedules.map((p) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800 whitespace-nowrap">{p.purok}</td>
                  <td className="py-3 px-4 text-gray-600">
                    <button onClick={() => setMapSelected(p)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5">
                      <Eye size={16} />
                      <span>{p.routeType}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{p.routePlan}</td>
                  <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{formatDateWithDay(p.scheduleDate, p.scheduleDay)}</span>
                      <span className="text-gray-500 text-xs">
                        {formatTime(p.scheduleStart)} – {formatTime(p.scheduleEnd)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{p.wasteType}</td>
                  <td className="py-3 px-4">
                    <motion.span layout className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusClasses(p.status)}`}>
                      {p.status.replace("-", " ")}
                    </motion.span>
                  </td>
                  <td className="py-3 px-4 text-right flex justify-end gap-2">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelected(p)} className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-red-800 text-white rounded-lg shadow-sm hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                      Update
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleArchive(p)} className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-gray-600 text-white rounded-lg shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                      Archive
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <AnimatePresence>{selected && <StatusModal key={selected.id} purok={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}</AnimatePresence>

      {mapSelected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-2">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg md:max-w-2xl p-4 relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10" onClick={() => setMapSelected(null)}>
              ✖
            </button>
            <h2 className="text-lg font-semibold mb-3">Route for {mapSelected.purok}</h2>
            <div className="h-80 sm:h-96 w-full rounded-lg overflow-hidden">
              <MapContainer center={mapSelected.coordinates[0] || DEFAULT_CENTER} zoom={15} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                {mapSelected.coordinates.length > 0 && (
                  <>
                    {mapSelected.coordinates.map((pos, idx) => (
                      <Marker key={idx} position={pos}>
                        <Popup>{idx === 0 ? "Start Point" : idx === mapSelected.coordinates.length - 1 ? "End Point" : `Stop ${idx}`}</Popup>
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
