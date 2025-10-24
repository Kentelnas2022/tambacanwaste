"use client";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/supabaseClient";
import {
  Paperclip,
  MessageSquare,
  CheckCircle,
  MapPin,
  Archive,
  RotateCcw,
  Inbox,
  CornerDownLeft, // For the "Add Response" button
  X, // For the "Cancel" button
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Helper component for a cleaner "Empty State"
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="text-center p-12 bg-white rounded-lg border-2 border-dashed border-slate-300">
    <Icon className="mx-auto h-12 w-12 text-slate-400" />
    <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState([]);
  const [user, setUser] = useState(null);
  const [official, setOfficial] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [respondingToId, setRespondingToId] = useState(null);
  const responseTextAreaRef = useRef(null);

  useEffect(() => {
    if (respondingToId && responseTextAreaRef.current) {
      responseTextAreaRef.current.focus();
    }
  }, [respondingToId]);

  // --- START: Data Fetching & Auth Hooks ---
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const verifyOfficial = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("officials")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data) setOfficial(data);
    };
    verifyOfficial();
  }, [user]);

  const normalizeReport = (r) => {
    let file_urls = r.file_urls;
    if (!file_urls) file_urls = [];
    if (typeof file_urls === "string") {
      try {
        file_urls = JSON.parse(file_urls);
      } catch {
        file_urls = [file_urls];
      }
    }
    return { ...r, file_urls, draftResponse: r.official_response || "" };
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error } = await supabase
        .from("reports")
        .select(
          // ✅ ADDED user_id TO THE SELECT
          "id, title, description, file_urls, user_id, location, status, official_response, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      const reportIds = (reportsData || []).map((r) => r.id);
      let latest = {};

      if (reportIds.length > 0) {
        const { data: statuses } = await supabase
          .from("report_status")
          .select(
            "id, report_id, status, official_response, updated_at, location, updated_by"
          )
          .in("report_id", reportIds)
          .order("updated_at", { ascending: true });
        (statuses || []).forEach((s) => (latest[s.report_id] = s));
      }

      const enriched = (reportsData || []).map((r) => {
        const last = latest[r.id];
        return normalizeReport({
          ...r,
          latest_status: last?.status || r.status || "Pending",
          official_response: last?.official_response || r.official_response,
          latest_status_row: last || null,
        });
      });
      setReports(enriched);
    } catch (err) {
      console.error(err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedReports = async () => {
    try {
      const { data } = await supabase
        .from("archive")
        .select("*")
        .order("archived_at", { ascending: false });
      setArchived((data || []).map(normalizeReport));
    } catch (err) {
      console.error(err);
      setArchived([]);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchArchivedReports();
    const channel = supabase
      .channel("realtime-report-status-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_status" },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();
    const channel2 = supabase
      .channel("realtime-reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel2);
    };
  }, []);

  useEffect(() => {
    if (refreshKey > 0) {
      fetchReports();
      fetchArchivedReports();
    }
  }, [refreshKey]);
  // --- END: Data Fetching & Auth Hooks ---

  // --- Inside Reports.jsx ---

const handleRespond = async (report, resolve = false) => {
  const responseText = report.draftResponse || ""; // Get text from state
  const nextStatus = resolve ? "Resolved" : "In Progress";

  // --- Input Validation ---
  if (!responseText && resolve) {
    Swal.fire("Response Required", "Please add a response before marking as resolved.", "warning");
    return;
  }
  // Allow marking "In Progress" without a response, but still require response text to send one
  // if (!responseText && !resolve) { // This check might be too strict if you just want to mark "In Progress"
  //   Swal.fire("Response Required", "Please add a response.", "warning");
  //   return;
  // }

  setProcessingIds((prev) => [...prev, report.id]);

  try {
    // --- 1. Update report_status table (using upsert) ---
    const statusPayload = {
      report_id: report.id,
      status: nextStatus,
      official_response: responseText, // Also save here for consistency if needed
      updated_by: official?.user_id || null,
      // location: report.location || null, // location usually doesn't change here
      updated_at: new Date().toISOString(),
    };
    const { error: upsertStatusError } = await supabase
      .from("report_status")
      .upsert(statusPayload, { onConflict: "report_id" });
    if (upsertStatusError) throw upsertStatusError;

    // --- 2. Update reports table (optional, but good practice) ---
    const { error: updateReportError } = await supabase
      .from("reports")
      .update({
        status: nextStatus,
        official_response: responseText, // Save here too if this is your main source
      })
      .eq("id", report.id);
    if (updateReportError) throw updateReportError;

    // --- 3. Upsert Notification (CRITICAL FIX) ---
    if (report.user_id) { // Ensure the report has a user associated
      const notifPayload = {
        user_id: report.user_id,
        report_id: report.id, // Must match your UNIQUE constraint column
        message: `Your report "${report.title || 'Untitled'}" status updated to ${nextStatus.toLowerCase()}.`,
        status: nextStatus,
        official_response: responseText, // *** This sends the response text ***
        read: false, // Mark as unread on update
        updated_at: new Date().toISOString(), // Update timestamp
      };

      console.log("Upserting notification:", notifPayload); // Debug log

      // *** Use upsert with onConflict on the correct unique column ***
      const { error: notifError } = await supabase
        .from("notifications")
        .upsert(notifPayload, {
          onConflict: "report_id", // Make sure 'report_id' is your UNIQUE column
        });

      if (notifError) {
        // Log error but don't necessarily stop the whole process
        console.error("Failed to upsert notification:", notifError.message);
        // Maybe show a less severe warning?
        // Swal.fire("Warning", "Report updated, but failed to send notification update.", "warning");
      } else {
        console.log("Notification upsert successful for report:", report.id);
      }
    } else {
      console.warn("Report user_id missing, cannot send notification for report:", report.id);
    }
    // --- End Notification Logic ---

    // --- Success Feedback & State Update ---
    Swal.fire({
      icon: "success",
      title: resolve ? "Resolved!" : "Response Saved!",
      text: resolve
        ? "Report marked as resolved and notification sent."
        : "Response saved and notification sent.",
      timer: 1800, // Slightly longer timer
      showConfirmButton: false,
    });

    // Update local state for the reports list
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? {
              ...r,
              latest_status: nextStatus,
              official_response: responseText, // Update local state too
              draftResponse: responseText, // Ensure draft matches saved response
            }
          : r
      )
    );
    setRespondingToId(null); // Close the response text area

  } catch (err) {
    console.error("Error in handleRespond:", err);
    Swal.fire({
      icon: "error",
      title: "Update Failed",
      text: err.message || "Failed to save response or update status.",
    });
  } finally {
    setProcessingIds((prev) => prev.filter((id) => id !== report.id));
  }
};

  const archiveReport = async (report) => {
    try {
      const insertData = {
        report_id: report.id,
        title: report.title,
        description: report.description,
        status: report.latest_status || report.status,
        file_urls: report.file_urls || [],
        official_response: report.official_response || "",
        created_at: report.created_at,
        archived_at: new Date().toISOString(),
      };
      const { error: insertError } = await supabase
        .from("archive")
        .insert([insertData]);
      if (insertError) throw insertError;
      await supabase.from("reports").delete().eq("id", report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setArchived((prev) => [insertData, ...prev]);
      Swal.fire({
        icon: "success",
        title: "Archived!",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong while archiving the report!",
      });
    }
  };

  const restoreReport = async (report) => {
    try {
      const restoreData = {
        title: report.title,
        description: report.description,
        status: "Pending",
        file_urls: report.file_urls || [],
        official_response: report.official_response,
        location: report.location || "Unknown",
        created_at: new Date().toISOString(),
      };
      const { error: insertError } = await supabase
        .from("reports")
        .insert([restoreData]);
      if (insertError) throw insertError;
      await supabase.from("archive").delete().eq("id", report.id);
      setArchived((prev) => prev.filter((r) => r.id !== report.id));
      setRefreshKey((k) => k + 1);
      Swal.fire({
        icon: "success",
        title: "Restored!",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Restore Failed",
        text: "Something went wrong while restoring the report.",
      });
    }
  };

  const handleDraftResponseChange = (e, reportId) => {
    const newVal = e.target.value;
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, draftResponse: newVal } : r))
    );
  };
  // --- END: Report Action Handlers ---

  const renderStatusBadge = (status) => {
    const s = status?.toLowerCase() || "pending";
    let className = "bg-yellow-100 text-yellow-800"; // Default: Pending
    if (s === "in progress") className = "bg-blue-100 text-blue-800";
    if (s === "resolved") className = "bg-green-100 text-green-800";
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${className}`}
      >
        {status || "Pending"}
      </span>
    );
  };

  const renderReportList = (list, isArchived = false) => {
    if (loading) {
      return (
        <p className="text-slate-500 text-center">Loading reports...</p>
      );
    }
    if (list.length === 0) {
      return (
        <EmptyState
          icon={isArchived ? Archive : Inbox}
          title={isArchived ? "No Archived Reports" : "No Active Reports"}
          description={
            isArchived
              ? "Archived reports will appear here."
              : "New citizen reports will appear here."
          }
        />
      );
    }

    return list.map((report) => (
      <motion.div
        key={report.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col overflow-hidden bg-white border rounded-lg shadow-sm border-slate-200 transition-shadow hover:shadow-md"
      >
        {/* Card Body */}
        <div className="p-5 flex-grow">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {report.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {isArchived ? "Archived:" : "Submitted:"}{" "}
                {new Date(
                  isArchived ? report.archived_at : report.created_at
                ).toLocaleString()}
              </p>
            </div>
            {renderStatusBadge(
              isArchived ? report.status : report.latest_status
            )}
          </div>

          <p className="text-sm text-slate-600 flex items-center gap-1.5 mb-3">
            <MapPin size={14} />
            {report.location || "No location provided"}
          </p>

          <p className="text-sm text-slate-700">{report.description}</p>

          {/* Attachments Section */}
          {report.file_urls?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                <Paperclip size={14} /> Attachments
              </p>
              <div className="flex gap-2 flex-wrap">
                {report.file_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-full text-xs hover:bg-slate-200"
                  >
                    Attachment {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Official Response Section */}
          {report.official_response && (
            <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-100 border-l-4 border-slate-500 p-3 rounded-r-md">
              <p className="text-sm font-medium text-slate-800 mb-1">
                Official Response:
              </p>
              <p className="text-sm text-slate-700">
                {report.official_response}
              </p>
            </div>
          )}
        </div>

        {/* Card Footer (Action Area) */}
        {!isArchived && official && (
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            {report.latest_status === "Resolved" ? (
              // --- IF RESOLVED ---
              <div className="flex justify-end">
                <button
                  onClick={() => archiveReport(report)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  <Archive size={16} /> Archive
                </button>
              </div>
            ) : respondingToId === report.id ? (
              // --- IF RESPONDING ---
              <motion.div
                key="responding"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <textarea
                  ref={responseTextAreaRef}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Type your response here..."
                  value={report.draftResponse || ""}
                  onChange={(e) => handleDraftResponseChange(e, report.id)}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRespond(report, false)}
                      disabled={processingIds.includes(report.id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <MessageSquare size={16} /> Respond
                    </button>
                    <button
                      onClick={() => handleRespond(report, true)}
                      disabled={
                        processingIds.includes(report.id) ||
                        !report.draftResponse
                      }
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> Mark Resolved
                    </button>
                  </div>
                  <button
                    onClick={() => setRespondingToId(null)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              // --- IF NOT RESPONDING (Default View) ---
              <motion.div
                key="default"
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <button
                  onClick={() => setRespondingToId(report.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800"
                >
                  <CornerDownLeft size={16} /> Add Response
                </button>
                <button
                  onClick={() => archiveReport(report)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  <Archive size={16} /> Archive
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* --- ARCHIVED CARD FOOTER --- */}
        {isArchived && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => restoreReport(report)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-green-700 border border-green-300 text-sm font-medium hover:bg-green-50"
            >
              <RotateCcw size={16} /> Restore
            </button>
          </div>
        )}
      </motion.div>
    ));
  };

  return (
    <div className="">
      <div className="px-4 mx-auto sm:px-6 max-w-5xl">
        {/* --- MODIFIED SECTION START --- */}
        {/* Page Header & Toggle Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Citizen Reports
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Respond to, resolve, and manage all submitted reports.
            </p>
          </div>

          {/* Header Toggle Button */}
          <div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-gray-700 transition bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 w-full sm:w-auto" // Added w-full sm:w-auto for responsiveness
            >
              {showArchived ? (
                <>
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                  View Active
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  View Archived
                </>
              )}
            </button>
          </div>
        </div>
        {/* --- MODIFIED SECTION END --- */}

        {/* Content Section */}
        <AnimatePresence mode="wait">
          <motion.div
            key={showArchived ? "archived" : "published"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-4">
              {renderReportList(
                showArchived ? archived : reports,
                showArchived
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}