"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { FiArchive, FiChevronDown, FiRotateCcw, FiMessageSquare } from "react-icons/fi";
import clsx from "clsx";
import Swal from "sweetalert2"; // Import SweetAlert2

// Helper: Empty State (Remains unchanged)
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="text-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

export default function Feedback() {
  const [feedback, setFeedback] = useState([]);
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [openSort, setOpenSort] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  // --- Data Fetching and Logic (Functions updated with SweetAlert) ---
  const getFeedback = async () => {
    const { data, error } = await supabase
      .from("general_feedback")
      .select("*");
    if (!error) {
      setFeedback(sortFeedback(data, sortBy));
    }
  };

  const getArchived = async () => {
    const { data, error } = await supabase
      .from("archived_feedback")
      .select("*")
      .order("archived_at", { ascending: false });
    if (!error) {
      setArchived(data);
    }
  };

  const sortFeedback = (data, type) => {
    switch (type) {
      case "oldest":
        return [...data].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
      case "az":
        return [...data].sort((a, b) =>
          a.comment_text.localeCompare(b.comment_text)
        );
      case "za":
        return [...data].sort((a, b) =>
          b.comment_text.localeCompare(a.comment_text)
        );
      default:
        return [...data].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }
  };

  const archiveFeedback = async (item) => {
    const result = await Swal.fire({
      title: "Archive Feedback?",
      text: "This will move the feedback to the archive view. You can restore it later.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#b33b3b", // Custom color for archive action
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Archive it!",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      const { error: archiveError } = await supabase
        .from("archived_feedback")
        .insert({
          id: crypto.randomUUID(),
          original_id: item.id,
          user_id: item.user_id,
          comment_text: item.comment_text,
          created_at: item.created_at,
        });

      if (!archiveError) {
        await supabase.from("general_feedback").delete().eq("id", item.id);
        setFeedback((prev) => prev.filter((fb) => fb.id !== item.id));
        getArchived();
        Swal.fire(
          "Archived!",
          "The feedback has been moved to the archive.",
          "success"
        );
      } else {
        Swal.fire("Error!", "Failed to archive feedback.", "error");
      }
    }
  };

  const restoreFeedback = async (item) => {
    const result = await Swal.fire({
      title: "Restore Feedback?",
      text: "This will move the feedback back to the active list.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6", // A blue color for restoration
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Restore it!",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      // 1. Insert back into general_feedback
      const { error: restoreError } = await supabase.from("general_feedback").insert({
        id: item.original_id,
        user_id: item.user_id,
        comment_text: item.comment_text,
        created_at: item.created_at,
      });

      if (!restoreError) {
        // 2. Delete from archived_feedback
        await supabase
          .from("archived_feedback")
          .delete()
          .eq("id", item.id);

        setArchived((prev) => prev.filter((a) => a.id !== item.id));
        getFeedback();
        Swal.fire(
          "Restored!",
          "The feedback has been moved back to the active list.",
          "success"
        );
      } else {
        Swal.fire("Error!", "Failed to restore feedback.", "error");
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getFeedback(), getArchived()]).finally(() =>
      setLoading(false)
    );
  }, []);

  useEffect(() => {
    setFeedback((prev) => sortFeedback(prev, sortBy));
  }, [sortBy]);
  // --- End Data Fetching and Logic ---

  // Helper to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Header (Same spacing and structure as Education.jsx) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {showArchive ? "Archived Feedback" : "Resident Feedback"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage feedback submitted by residents.
          </p>
        </div>
        <div className="flex gap-3">
          {/* Sorting Dropdown */}
          {!showArchive && (
            <div className="relative">
              <button
                onClick={() => setOpenSort(!openSort)}
                className="flex items-center justify-between w-40 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Sort by: <span className="capitalize font-semibold">{sortBy}</span>
                <FiChevronDown className="w-4 h-4" />
              </button>

              {openSort && (
                <div className="absolute z-10 w-40 mt-2 bg-white border rounded-lg shadow-lg">
                  {[
                    { key: "newest", label: "Newest" },
                    { key: "oldest", label: "Oldest" },
                    { key: "az", label: "A–Z (Text)" },
                    { key: "za", label: "Z–A (Text)" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        setSortBy(item.key);
                        setOpenSort(false);
                      }}
                      className={clsx(
                        "block w-full px-4 py-2 text-left text-gray-700 text-sm hover:bg-gray-100",
                        sortBy === item.key && "font-semibold bg-gray-50"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View Archive Button (White/Border Style) */}
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showArchive ? (
              <>
                <FiMessageSquare className="w-4 h-4" /> View Active
              </>
            ) : (
              <>
                <FiArchive className="w-4 h-4" /> View Archive
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Table (Adopted from Education.jsx for clean presentation) */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/2">
                Feedback Comment
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/4">
                {showArchive ? "Archived Date" : "Received Date"}
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-1/4">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-gray-500">
                  Loading feedback...
                </td>
              </tr>
            ) : (showArchive ? archived : feedback).length === 0 ? (
              <tr>
                <td colSpan={3} className="p-0">
                  <EmptyState
                    icon={showArchive ? FiArchive : FiMessageSquare}
                    title={
                      showArchive
                        ? "No Archived Feedback"
                        : "No Resident Feedback"
                    }
                    description={
                      showArchive
                        ? "Past feedback that has been archived will appear here."
                        : "Feedback submitted by residents will be displayed here."
                    }
                  />
                </td>
              </tr>
            ) : (
              (showArchive ? archived : feedback).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-sm whitespace-normal">
                    {item.comment_text}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(showArchive ? item.archived_at : item.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {showArchive ? (
                      // Restore Button (Secondary/View style)
                      <button
                        onClick={() => restoreFeedback(item)}
                        className="flex-shrink-0 ml-auto px-3 py-1 text-sm text-white bg-gray-700 rounded-md hover:bg-gray-800 flex items-center gap-1"
                      >
                        <FiRotateCcw size={14} /> Restore
                      </button>
                    ) : (
                      // Archive Button (Primary/Red style)
                      <button
                        onClick={() => archiveFeedback(item)}
                        className="flex-shrink-0 ml-auto px-3 py-1 text-sm text-white bg-[#b33b3b] rounded-md hover:bg-[#a22a2a] flex items-center gap-1"
                      >
                        <FiArchive size={14} /> Archive
                      </button>
                    )}
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