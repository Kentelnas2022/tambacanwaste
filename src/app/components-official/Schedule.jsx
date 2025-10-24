"use client";

import { useState, useEffect } from "react";
import {
  CalendarDaysIcon,
  ArchiveBoxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/supabaseClient";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Swal from "sweetalert2";

// Fix for default leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Component to pick route points on the map
function RoutePicker({ points, setPoints }) {
  useMapEvents({
    click(e) {
      if (points.length < 2) {
        setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
      } else {
        setPoints([[e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
}

export default function Schedule() {
  const [day, setDay] = useState("");
  const [date, setDate] = useState("");
  const [purok, setPurok] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [plan] = useState("A");
  const [wasteType, setWasteType] = useState("");
  const [status, setStatus] = useState("not-started");
  const [schedules, setSchedules] = useState([]);
  const [archivedSchedules, setArchivedSchedules] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch schedules from Supabase
  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSchedules(data || []);
  };

  // Fetch archived schedules
  const fetchArchived = async () => {
    const { data, error } = await supabase
      .from("archived_schedules")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setArchivedSchedules(data || []);
  };

  useEffect(() => {
    fetchSchedules();
    fetchArchived();
  }, []);

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    if (selectedDate) {
      const d = new Date(selectedDate);
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      setDay(days[d.getDay()]);
    } else setDay("");
  };

  // Add new schedule
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    const routeJson = JSON.stringify(routePoints || []);
    const schedulePayload = {
      purok,
      plan: "A",
      day,
      date,
      start_time: startTime,
      end_time: endTime,
      waste_type: wasteType,
      status,
      route_points: routeJson,
    };

    const { data, error } = await supabase
      .from("schedules")
      .insert([schedulePayload])
      .select("*");

    if (error) Swal.fire("Error", "Failed to add schedule", "error");
    else {
      setSchedules((prev) => [data[0], ...prev]);
      Swal.fire("Success!", "New schedule has been added.", "success");
      setIsModalOpen(false);
    }
  };

  // Archive a schedule
  const handleArchive = async (sched) => {
  const confirm = await Swal.fire({
    title: "Archive Schedule?",
    text: "This will move the schedule to the archive list.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, archive it",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#2563eb",
  });
  if (!confirm.isConfirmed) return;

  // Ensure that required fields exist before archiving
  if (!sched.schedule_id || !sched.date || !sched.purok || !sched.day) {
    return Swal.fire("Error", "Missing required schedule information.", "error");
  }

  // Create an archived schedule object without the schedule_id
  const archivedItem = {
    schedule_id: sched.schedule_id, // Keep the reference to the original schedule
    date: sched.date || null,
    purok: sched.purok || null,
    day: sched.day || null,
    waste_type: sched.waste_type || null,
    status: sched.status || "not-started", // Default to "not-started" if empty
    start_time: sched.start_time || null,
    end_time: sched.end_time || null,
    plan: sched.plan || "A", // Default to "A" if empty
    route_points: sched.route_points || "[]", // Ensure JSONB field is correctly formatted
    scheduled_start: null,
    scheduled_end: null,
    actual_end: null,
    created_at: new Date().toISOString(), // Using the current date for creation
  };

  try {
    // Insert the schedule into archived_schedules
    const { error: insertError } = await supabase
      .from("archived_schedules")
      .insert([archivedItem]);

    if (insertError) {
      console.error("Insert Error:", insertError.message);
      return Swal.fire("Error", "Failed to archive schedule", "error");
    }

    // Delete the schedule from the original schedules table
    const { error: deleteError } = await supabase
      .from("schedules")
      .delete()
      .eq("schedule_id", sched.schedule_id);

    if (deleteError) {
      console.error("Delete Error:", deleteError.message);
      return Swal.fire("Error", "Failed to remove schedule from main table", "error");
    }

    // Fetch updated schedules and archived schedules after the operation
    await fetchSchedules();
    await fetchArchived();

    Swal.fire("Archived!", "Schedule has been archived successfully.", "success");
  } catch (err) {
    console.error("Error during archive operation:", err);
    Swal.fire("Error", "Something went wrong during archiving. Please check console.", "error");
  }
};

  // Restore archived schedule
  const handleRestore = async (sched) => {
    const confirm = await Swal.fire({
      title: "Restore Schedule?",
      text: "This will move it back to the active list.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, restore it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
    });
    if (!confirm.isConfirmed) return;

    try {
      const restoredItem = {
        date: sched.date || null,
        purok: sched.purok || null,
        day: sched.day || null,
        waste_type: sched.waste_type || null,
        status: sched.status || "not-started",
        start_time: sched.start_time || null,
        end_time: sched.end_time || null,
        plan: sched.plan || "A",
        route_points: sched.route_points || null,
        scheduled_start: null,
        scheduled_end: null,
        actual_end: null,
      };

      const { data: insertData, error: insertError } = await supabase
        .from("schedules")
        .insert([restoredItem])
        .select("*");

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("archived_schedules")
        .delete()
        .eq("schedule_id", sched.schedule_id);

      if (deleteError) throw deleteError;

      await fetchSchedules();
      await fetchArchived();
      Swal.fire("Restored!", "Schedule has been moved back successfully.", "success");
    } catch (err) {
      console.error("Restore failed:", err);
      Swal.fire("Error", "Failed to restore schedule. Check console.", "error");
    }
  };

  // Helpers to format date and time
  const formatDate = (dateStr, dayLabel) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} (${dayLabel || ""})`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const d = new Date(`1970-01-01T${timeStr}`);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const statusColors = {
    "not-started": "bg-red-100 text-red-800",
    ongoing: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
  };

  const filteredSchedules = schedules.filter((sched) =>
    statusFilter === "all"
      ? true
      : (sched.status || "").toLowerCase() === statusFilter
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <CalendarDaysIcon className="w-7 h-7 text-red-600" />
        Manage Garbage Collection Schedule
      </h2>

      <div className="flex justify-between items-center mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg px-4 py-2 bg-gray-100 text-gray-800"
        >
          <option value="all">All</option>
          <option value="not-started">Not Started</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>

        <div className="flex gap-2">
          <button
            onClick={() => setIsArchiveModalOpen(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
          >
            View Archives
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            + Add Schedule
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Purok</th>
                <th className="py-3 px-4 text-left">Time</th>
                <th className="py-3 px-4 text-left">Plan</th>
                <th className="py-3 px-4 text-left">Waste Type</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((sched) => (
                <tr key={sched.schedule_id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{formatDate(sched.date, sched.day)}</td>
                  <td className="py-3 px-4">Purok {sched.purok}</td>
                  <td className="py-3 px-4">
                    {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                  </td>
                  <td className="py-3 px-4">{sched.plan}</td>
                  <td className="py-3 px-4">{sched.waste_type}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[sched.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {sched.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleArchive(sched)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded transition-all duration-200 hover:scale-105"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-gray-500 italic">
                    No schedules available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

     {/* Archive Modal */}
{isArchiveModalOpen && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-gray-100 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center border-b px-6 py-4 bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <ArchiveBoxArrowDownIcon className="w-6 h-6 text-gray-600" />
          Archived Schedules
        </h3>
        <button
          onClick={() => setIsArchiveModalOpen(false)}
          className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          ✕
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-y-auto max-h-[65vh] p-6">
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Purok</th>
              <th className="py-3 px-4 text-left">Time</th>
              <th className="py-3 px-4 text-left">Plan</th>
              <th className="py-3 px-4 text-left">Waste Type</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {archivedSchedules.map((sched) => (
              <tr
                key={sched.schedule_id}
                className="hover:bg-gray-50 transition-colors duration-200"
              >
                <td className="py-3 px-4 text-gray-800">
                  {formatDate(sched.date, sched.day)}
                </td>
                <td className="py-3 px-4 text-gray-700">Purok {sched.purok}</td>
                <td className="py-3 px-4 text-gray-700">
                  {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                </td>
                <td className="py-3 px-4 text-gray-700">{sched.plan}</td>
                <td className="py-3 px-4 text-gray-700">{sched.waste_type}</td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handleRestore(sched)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 shadow-sm"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}

            {archivedSchedules.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-6 text-gray-500 italic"
                >
                  No archived schedules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t px-6 py-4 bg-gray-50">
        <button
          onClick={() => setIsArchiveModalOpen(false)}
          className="px-5 py-2 text-gray-700 hover:text-gray-900 border rounded-lg hover:bg-gray-100 transition-all duration-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* Add Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Add New Schedule (Plan A)
            </h3>
            <form onSubmit={handleAddSchedule} className="space-y-3">
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                value={day}
                readOnly
                className="w-full border p-2 rounded bg-gray-100"
              />
              <select
                value={purok}
                onChange={(e) => setPurok(e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Purok</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Purok {i + 1}
                  </option>
                ))}
              </select>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              <select
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Waste Type</option>
                <option value="Recyclable Materials">♻️ Recyclable</option>
                <option value="Toxic Materials">☣️ Toxic</option>
                <option value="Non-Recyclable Materials">
                  🗑️ Non-Recyclable
                </option>
              </select>

              <div className="border rounded-lg overflow-hidden h-60">
                <MapContainer
                  center={[8.228, 124.245]}
                  zoom={13}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap"
                  />
                  <RoutePicker points={routePoints} setPoints={setRoutePoints} />
                  {routePoints.map((pos, i) => (
                    <Marker key={i} position={pos} />
                  ))}
                  {routePoints.length === 2 && (
                    <Polyline positions={routePoints} color="red" />
                  )}
                </MapContainer>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}