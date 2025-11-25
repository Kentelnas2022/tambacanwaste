"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { 
  FiUser, 
  FiCheck, 
  FiX, 
  FiShield, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiCalendar, 
  FiList 
} from "react-icons/fi";
import Swal from "sweetalert2";
import { approveUserAction } from "../user-management/actions";

// --- Configuration ---
// Matching the visual tone of Feedback.jsx
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

export default function ManageUsersSection() {
  const [pending, setPending] = useState([]);
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const fetchPending = async () => {
      // Small delay for UX smoothness
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const { data, error } = await supabase
        .from("pending_registrations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error) setPending(data || []);
      setIsInitialLoad(false);
    };

    fetchPending();

    // Realtime subscription
    const channel = supabase
      .channel("realtime_pending_users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pending_registrations" },
        (payload) => {
          if (payload.eventType === "INSERT") setPending((prev) => [payload.new, ...prev]);
          else if (payload.eventType === "DELETE")
            setPending((prev) => prev.filter((u) => u.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleApprove = async (user) => {
    setLoadingActionId(user.id);
    const result = await approveUserAction(user);
    if (result.success) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Approved",
        text: `${user.name} has been added.`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } else {
      Swal.fire("Error", result.error, "error");
    }
    setLoadingActionId(null);
  };

  const handleDecline = async (id) => {
    setLoadingActionId(id);
    Swal.fire({
      title: "Decline Request?",
      text: "This action will permanently remove the pending registration.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#b33b3b", // Matching the Archive red from Feedback.jsx
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Decline",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from("pending_registrations").delete().eq("id", id);
        if (error) {
          Swal.fire("Error", error.message, "error");
        } else {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Declined",
            text: "Request removed.",
            showConfirmButton: false,
            timer: 3000,
          });
        }
      }
      setLoadingActionId(null);
    });
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Header (Same structure as Feedback.jsx) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            User Approvals
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and manage pending user registration requests.
          </p>
        </div>
        <div className="flex gap-3">
          {/* Status Badge (styled to fit the clean layout) */}
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm">
            <FiList className="w-4 h-4 text-blue-600" />
            <span>Pending: <span className="font-bold text-gray-900">{pending.length}</span></span>
          </div>
        </div>
      </div>

      {/* Main Content Table (Matches Feedback.jsx layout) */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/4">
                Applicant
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/5">
                Role & Location
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/4">
                Contact Info
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/6">
                Requested Date
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isInitialLoad ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500">
                  Loading requests...
                </td>
              </tr>
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    icon={FiUser}
                    title="No Pending Requests"
                    description="All registration requests have been processed."
                  />
                </td>
              </tr>
            ) : (
              pending.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  
                  {/* Applicant */}
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                         user.role === "official" ? "bg-blue-600" : "bg-orange-500"
                      }`}>
                         {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-gray-400">ID: ...{String(user.id).slice(-4)}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role & Location */}
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                        user.role === "official"
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-orange-50 text-orange-700 border-orange-100"
                      }`}>
                        <FiShield size={10} /> {user.role}
                      </span>
                      {user.purok && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <FiMapPin size={10} /> {user.purok}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="px-4 py-3 text-gray-700">
                     <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                           <FiMail className="text-gray-400 w-3 h-3" /> {user.email}
                        </div>
                        {user.mobile_number && (
                           <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <FiPhone className="text-gray-400 w-3 h-3" /> {user.mobile_number}
                           </div>
                        )}
                     </div>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                       <FiCalendar className="text-gray-400 w-3 h-3" />
                       {formatDate(user.created_at)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                       {/* Decline Button (Red - Matches Archive style) */}
                       <button
                        onClick={() => handleDecline(user.id)}
                        disabled={loadingActionId === user.id}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-[#b33b3b] rounded-md hover:bg-[#a22a2a] disabled:opacity-50 transition-colors"
                        title="Decline"
                      >
                        {loadingActionId === user.id ? "..." : <FiX size={14} />} 
                        <span className="hidden sm:inline">Decline</span>
                      </button>

                      {/* Approve Button (Blue - Matches Restore style) */}
                      <button
                        onClick={() => handleApprove(user)}
                        disabled={loadingActionId === user.id}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-gray-700 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        title="Approve"
                      >
                        {loadingActionId === user.id ? "..." : <FiCheck size={14} />} 
                        <span className="hidden sm:inline">Approve</span>
                      </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}