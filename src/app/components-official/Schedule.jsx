"use client";

import { useState, useEffect } from "react";
import {
  CalendarDaysIcon,
  ArchiveBoxArrowDownIcon,
  XMarkIcon, // Import the X icon
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
    // Note: 'schedules' table is used for both fetch and insert
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching schedules:", error.message);
    if (!error) setSchedules(data || []);
  };

  // Fetch archived schedules
  const fetchArchived = async () => {
    const { data, error } = await supabase
      .from("archived_schedules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching archived schedules:", error.message);
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

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      console.error("Authentication Error: No user logged in.");
      Swal.fire("Error", "You must be logged in to add a schedule.", "error");
      return;
    }

    const user_id = userData.user.id;

    // ✅ FIX: stringify routePoints BEFORE saving
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
      route_points: routeJson, // ✅ FIXED
      created_by_id: user_id,
    };

    const { data, error } = await supabase
      .from("schedules")
      .insert([schedulePayload])
      .select("*");

    if (error) {
      console.error("Supabase Insert Error:", error);
      Swal.fire(
        "Error",
        `Failed to add schedule. Details: ${error.message}`,
        "error"
      );
    } else {
      // ✅ Update UI instantly
      setSchedules((prev) => [data[0], ...prev]);

      Swal.fire("Success!", "New schedule has been added.", "success");

      // ✅ Optional: Clear routePoints after save
      setRoutePoints([]);

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

    // Create an archived schedule object
    const archivedItem = {
      schedule_id: sched.schedule_id,
      date: sched.date || null,
      purok: sched.purok || null,
      day: sched.day || null,
      waste_type: sched.waste_type || null,
      status: sched.status || "not-started",
      start_time: sched.start_time || null,
      end_time: sched.end_time || null,
      plan: sched.plan || "A",
      route_points: sched.route_points || "[]",
      scheduled_start: null,
      scheduled_end: null,
      actual_end: null,
      // Pass created_by_id from the original schedule if it exists
      created_by_id: sched.created_by_id || null,
      created_at: new Date().toISOString(),
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
        return Swal.fire(
          "Error",
          "Failed to remove schedule from main table",
          "error"
        );
      }

      // Fetch updated schedules and archived schedules after the operation
      await fetchSchedules();
      await fetchArchived();

      Swal.fire("Archived!", "Schedule has been archived successfully.", "success");
    } catch (err) {
      console.error("Error during archive operation:", err);
      Swal.fire(
        "Error",
        "Something went wrong during archiving. Please check console.",
        "error"
      );
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
        // Include created_by_id for the restored schedule
        created_by_id: sched.created_by_id || null,
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
      Swal.fire(
        "Restored!",
        "Schedule has been moved back successfully.",
        "success"
      );
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
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        Manage Garbage Collection Schedule
      </h2>

      <div className="flex justify-between items-center mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg px-4 py-2 bg-gray-100 text-gray-800 border-gray-300 border"
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
            className="bg-red-800 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
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
                  <td className="py-3 px-4">
                    {formatDate(sched.date, sched.day)}
                  </td>
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
                  <td
                    colSpan={7}
                    className="text-center py-5 text-gray-500 italic"
                  >
                    No schedules available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODIFIED: Archive Modal z-index --- */}
      {isArchiveModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[300] transition-all duration-300 p-4" // <-- z-index changed to 300
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-gray-100 flex flex-col">
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
                <XMarkIcon className="w-6 h-6" />
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
                      <td className="py-3 px-4 text-gray-700">
                        Purok {sched.purok}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatTime(sched.start_time)} -{" "}
                        {formatTime(sched.end_time)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{sched.plan}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {sched.waste_type}
                      </td>
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

      {/* --- MODIFIED: Add Schedule Modal z-index --- */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[300] p-4" // <-- z-index changed to 300
          onClick={() => setIsModalOpen(false)} // Close on backdrop click
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Schedule (Plan A)
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <form
              onSubmit={handleAddSchedule}
              className="overflow-y-auto p-6 space-y-4"
            >
              {/* Date and Day */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={handleDateChange}
                    className="w-full border-gray-300 p-2 border rounded-md shadow-sm focus:ring-red-700 focus:border-red-700"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="day"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Day
                  </label>
                  <input
                    type="text"
                    id="day"
                    value={day}
                    readOnly
                    className="w-full border-gray-300 p-2 border rounded-md bg-gray-100 text-gray-500"
                  />
                </div>
              </div>

              {/* Purok */}
              <div>
                <label
                  htmlFor="purok"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Purok
                </label>
                <select
                  id="purok"
                  value={purok}
                  onChange={(e) => setPurok(e.target.value)}
                  className="w-full border-gray-300 p-2 border rounded-md shadow-sm focus:ring-red-700 focus:border-red-700"
                  required
                >
                  <option value="">Select Purok</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Purok {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start and End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="start_time"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border-gray-300 p-2 border rounded-md shadow-sm focus:ring-red-700 focus:border-red-700"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="end_time"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    End Time
                  </label>
                  <input
                    type="time"
                    id="end_time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border-gray-300 p-2 border rounded-md shadow-sm focus:ring-red-700 focus:border-red-700"
                    required
                  />
                </div>
              </div>

              {/* Waste Type */}
              <div>
                <label
                  htmlFor="waste_type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Waste Type
                </label>
                <select
                  id="waste_type"
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                  className="w-full border-gray-300 p-2 border rounded-md shadow-sm focus:ring-red-700 focus:border-red-700"
                  required
                >
                  <option value="">Select Waste Type</option>
                  <option value="Recyclable Materials">♻️ Recyclable</option>
                  <option value="Toxic Materials">☣️ Toxic</option>
                  <option value="Non-Recyclable Materials">
                    🗑️ Non-Recyclable
                  </option>
                </select>
              </div>

              {/* Map */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route Points (Click 2 points on map)
                </label>
                <div className="overflow-hidden h-60 rounded-lg border border-gray-300">
                  <MapContainer
                    center={[8.228, 124.245]}
                    zoom={13}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="© OpenStreetMap"
                    />
                    <RoutePicker
                      points={routePoints}
                      setPoints={setRoutePoints}
                    />
                    {routePoints.map((pos, i) => (
                      <Marker key={i} position={pos} />
                    ))}
                    {routePoints.length === 2 && (
                      <Polyline
                        positions={routePoints}
                        color="transparent"
                        weight={0}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md text-sm font-medium"
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