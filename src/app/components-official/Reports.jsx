"use client";
import { useState, useEffect, Fragment, useMemo } from "react";
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
  CornerDownLeft,
  X,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

// --- MediaPreview Component (Unchanged) ---
const MediaPreview = ({ url }) => {
  let fileType = "other";
  let extension = "";
  let Icon = FileText;
  let label = "View File";

  try {
    extension = new URL(url).pathname.split(".").pop().toLowerCase();
  } catch (e) {
    console.warn("Could not parse URL extension:", url);
    return null;
  }

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    fileType = "image";
    Icon = ImageIcon;
    label = "View Image";
  } else if (["mp4", "webm", "mov", "ogg"].includes(extension)) {
    fileType = "video";
    Icon = VideoIcon;
    label = "View Video";
  } else if (extension === "pdf") {
    fileType = "pdf";
    Icon = FileText;
    label = "View PDF";
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
    >
      <Icon size={16} />
      <span>
        {label} ({extension.toUpperCase()})
      </span>
    </a>
  );
};

// --- Response Modal (Unchanged) ---
const ResponseModal = ({ report, onRespond, onClose }) => {
  if (!report) return null;

  const [responseText, setResponseText] = useState(
    report.official_response || ""
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 truncate">
            Respond: {report.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow p-6 space-y-4 overflow-y-auto">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <div className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm whitespace-pre-line">
              {report.description || "No description provided."}
            </div>
          </div>

          {/* Attachments (Uses MediaPreview) */}
          {report.file_urls?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachments
              </label>
              <div className="flex flex-wrap gap-2">
                {report.file_urls.map((url, idx) => (
                  <MediaPreview key={idx} url={url} />
                ))}
              </div>
            </div>
          )}

          {/* Response Form */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Official Response
            </label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-800 focus:border-transparent"
              placeholder="Type your response here..."
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Footer (Buttons) */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onRespond(report, responseText, false)}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition disabled:opacity-50"
          >
            Save Response
          </button>
          <button
            onClick={() => onRespond(report, responseText, true)}
            disabled={!responseText}
            className="px-4 py-2 rounded-md bg-red-800 hover:bg-red-700 text-white font-medium transition disabled:opacity-50"
          >
            Mark Resolved
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- ViewReportModal Component (Unchanged) ---
const ViewReportModal = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            Report Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow p-5 space-y-4 overflow-y-auto">
          {/* Info layout */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {report.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                  Status:
                </h4>
                {renderStatusBadge(report.status)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                  Location:
                </h4>
                <p className="text-gray-700 text-sm">
                  {report.location || "N/A"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                  {report.archived_at ? "Archived On:" : "Submitted On:"}
                </h4>
                <p className="text-gray-700 text-sm">
                  {new Date(
                    report.archived_at || report.created_at
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-1.5 text-sm">
              Description:
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
              {report.description || "No description provided."}
            </p>
          </div>

          {/* Official Response */}
          {report.official_response && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-semibold text-gray-800 mb-1.5 text-sm">
                Official Response:
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-3 rounded-lg">
                {report.official_response}
              </p>
            </div>
          )}

          {/* Attachments section (Uses MediaPreview) */}
          {report.file_urls?.length > 0 && (
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <h4 className="font-semibold text-gray-800 text-sm">
                Evidence / Attachments:
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.file_urls.map((url, idx) => (
                  <MediaPreview key={idx} url={url} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md bg-black text-white hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Helper: Empty State (Unchanged) ---
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="text-center p-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

// --- Global helper function for status badge (Unchanged) ---
const renderStatusBadge = (status) => {
  const s = status?.toLowerCase() || "pending";
  let className = "bg-yellow-100 text-yellow-800";
  if (s === "in progress") className = "bg-blue-100 text-blue-800";
  if (s === "resolved") className = "bg-green-100 text-green-800";
  if (s === "archived") className = "bg-gray-100 text-gray-800";

  const formattedStatus = s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <span
      className={`inline-flex flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${className}`}
    >
      {formattedStatus || "Pending"}
    </span>
  );
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState([]);
  const [user, setUser] = useState(null);
  const [official, setOfficial] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [responseModalReport, setResponseModalReport] = useState(null);
  const [viewModalReport, setViewModalReport] = useState(null);

  // --- State for sorting ---
  const [sortMode, setSortMode] = useState("newest");

  // --- (All your data fetching, hooks, and logic handlers are unchanged) ---
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
    };
    fetchUser();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const verifyOfficial = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("uid", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error verifying role:", error);
        return;
      }

      if (data?.role === "official" || data?.role === "admin") {
        setOfficial(true);
      } else {
        setOfficial(false);
      }
    };
    verifyOfficial();
  }, [user]);

  //
  // --- ✅ FIXED FUNCTION #1: normalizeReport (now synchronous) ---
  //
  const normalizeReport = (r) => {
    let file_urls_from_db = r.file_urls;
    if (!file_urls_from_db) file_urls_from_db = [];
    if (typeof file_urls_from_db === "string") {
      try {
        file_urls_from_db = JSON.parse(file_urls_from_db);
      } catch {
        file_urls_from_db = [file_urls_from_db];
      }
    }

    // This converts the expired URLs into public URLs
    const public_urls = file_urls_from_db.map((expiredUrl) => {
      if (!expiredUrl || typeof expiredUrl !== 'string') return null;
      
      try {
        const url = new URL(expiredUrl);
        // /storage/v1/object/sign/bucket-name/folder/image.jpg
        const pathSegments = url.pathname.split("/");
        
        const bucketName = pathSegments[5]; // Correct index for bucket
        const path = pathSegments.slice(6).join("/"); // Correct index for path

        if (!bucketName || !path) {
          console.warn("Could not parse path/bucket from URL:", expiredUrl);
          return expiredUrl;
        }

        // --- THIS IS THE KEY CHANGE ---
        // This synchronously creates the public URL string.
        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl(path);

        return data.publicUrl;

      } catch (e) {
        console.warn("Invalid URL in db or parsing error:", expiredUrl, e);
        return expiredUrl;
      }
    });

    const file_urls = public_urls.filter(Boolean); // Filter out any nulls
    const status = r.archived_at ? "Archived" : r.status;
    return { ...r, file_urls, status, draftResponse: r.official_response || "" };
  };

  //
  // --- ✅ FIXED FUNCTION #2: fetchReports (no longer needs Promise.all) ---
  //
  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error } = await supabase
        .from("reports")
        .select(
          "id, title, description, file_urls, user_id, location, status, official_response, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // We removed 'await Promise.all' because normalizeReport is now synchronous
      const normalizedReports = (reportsData || []).map(normalizeReport);
      
      setReports(normalizedReports);
    } catch (err) {
      console.error(err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  //
  // --- ✅ FIXED FUNCTION #3: fetchArchivedReports (no longer needs Promise.all) ---
  //
  const fetchArchivedReports = async () => {
    try {
      const { data } = await supabase
        .from("archived_report")
        .select("*")
        .order("archived_at", { ascending: false });

      // We removed 'await Promise.all' because normalizeReport is now synchronous
      const normalizedArchived = (data || []).map(normalizeReport);

      setArchived(normalizedArchived);
    } catch (err) {
      console.error(err);
      setArchived([]);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchArchivedReports();
    const reportsChannel = supabase
      .channel("realtime-reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();

    const archiveChannel = supabase
      .channel("realtime-archive")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "archived_report" },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(archiveChannel);
    };
  }, []); // This is correct, do not add fetchReports/fetchArchivedReports here

  useEffect(() => {
    if (refreshKey > 0) {
      fetchReports();
      fetchArchivedReports();
    }
  }, [refreshKey]); // This is correct

  // --- Memoized sorted active reports (Unchanged) ---
  const sortedReports = useMemo(() => {
    const statusOrder = (status) => {
      if (status === "Pending" || status === "In Progress") return 1;
      if (status === "Resolved") return 2;
      return 3; // Failsafe
    };

    return [...reports].sort((a, b) => {
      const statusA = statusOrder(a.status);
      const statusB = statusOrder(b.status);

      if (statusA < statusB) return -1;
      if (statusA > statusB) return 1;

      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);

      if (sortMode === "newest") {
        return dateB - dateA;
      }
      if (sortMode === "oldest") {
        return dateA - dateB;
      }

      return dateB - dateA;
    });
  }, [reports, sortMode]);

  // --- Memoized sorted archived reports (Unchanged) ---
  const sortedArchivedReports = useMemo(() => {
    return [...archived].sort((a, b) => {
      const dateA = new Date(a.archived_at);
      const dateB = new Date(b.archived_at);

      if (sortMode === "newest") return dateB - dateA;
      if (sortMode === "oldest") return dateA - dateB;
      return dateB - dateA;
    });
  }, [archived, sortMode]);

  // --- handleRespond (Unchanged) ---
  const handleRespond = async (report, responseText, resolve = false) => {
    const nextStatus = resolve ? "Resolved" : "In Progress";

    if (!responseText && resolve) {
      Swal.fire({
        title: "Response Required",
        text: "Please add a response before marking as resolved.",
        icon: "warning",
        confirmButtonColor: "#000",
      });
      return;
    }

    setProcessingIds((prev) => [...prev, report.id]);
    Swal.fire({
      title: resolve ? "Resolving..." : "Saving...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      confirmButtonColor: "#000",
    });

    try {
      const { error: updateReportError } = await supabase
        .from("reports")
        .update({
          status: nextStatus,
          official_response: responseText,
        })
        .eq("id", report.id);
      if (updateReportError) throw updateReportError;

      Swal.fire({
        icon: "success",
        title: resolve ? "Resolved!" : "Response Saved!",
        text: resolve
          ? "Report marked as resolved and resident notified."
          : "Response saved and resident notified.",
        timer: 1800,
        showConfirmButton: false,
        confirmButtonColor: "#000",
      });

      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                status: nextStatus,
                official_response: responseText,
                draftResponse: responseText,
              }
            : r
        )
      );
      setResponseModalReport(null);
    } catch (err) {
      console.error("Error in handleRespond:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message || "Failed to save response or update status.",
        confirmButtonColor: "#000",
      });
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== report.id));
    }
  };

  //
  // --- ✅ FIXED FUNCTION #4: archiveReport (no longer needs await) ---
  //
  const archiveReport = async (report) => {
    const result = await Swal.fire({
      title: "Archive this report?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#b91c1c", // red-700
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, archive it",
    });
    if (!result.isConfirmed) return;

    try {
      const insertData = {
        report_id: report.id,
        title: report.title,
        description: report.description,
        status: report.status,
        file_urls: report.file_urls || [],
        official_response: report.official_response || "",
        created_at: report.created_at,
        archived_at: new Date().toISOString(),
        location: report.location || "Unknown",
      };

      const { data: newArchivedRecord, error: insertError } = await supabase
        .from("archived_report")
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newArchivedRecord) throw new Error("Failed to create archive record.");

      await supabase.from("reports").delete().eq("id", report.id);

      setReports((prev) => prev.filter((r) => r.id !== report.id));
      
      // Removed 'await' since normalizeReport is now synchronous
      const normalizedNewArchive = normalizeReport(newArchivedRecord);
      setArchived((prev) => [normalizedNewArchive, ...prev]);
      
      setResponseModalReport(null);

      Swal.fire({
        icon: "success",
        title: "Archived!",
        timer: 1600,
        showConfirmButton: false,
        confirmButtonColor: "#b91c1c",
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong while archiving the report!",
        confirmButtonColor: "#b91c1c",
      });
    }
  };


  // --- restoreReport (Unchanged) ---
  const restoreReport = async (report) => {
    Swal.fire({ title: "Restoring...", didOpen: () => Swal.showLoading() });
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

      await supabase.from("archived_report").delete().eq("id", report.id);

      setArchived((prev) => prev.filter((r) => r.id !== report.id));
      setRefreshKey((k) => k + 1);

      Swal.fire({
        icon: "success",
        title: "Restored!",
        timer: 1600,
        showConfirmButton: false,
        confirmButtonColor: "#000",
      });
      setViewModalReport(null);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Restore Failed",
        text: "Something went wrong while restoring the report.",
        confirmButtonColor: "#000",
      });
    }
  };

  // --- truncateWords (Unchanged) ---
  const truncateWords = (text, limit) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= limit) {
      return text;
    }
    return words.slice(0, limit).join(" ") + "...";
  };

  // --- DESKTOP TABLE RENDER (Unchanged) ---
  const renderReportTable = (list, isArchived = false) => {
    if (loading) {
      return (
        <p className="text-gray-500 text-center py-10">Loading reports...</p>
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

    return (
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Report Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isArchived ? "Archived" : "Submitted"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Media
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((report) => (
              <tr
                key={report.id}
                className="hover:bg-gray-50/70 transition-colors"
              >
                {/* Title is now clickable */}
                <td className="px-6 py-4 align-top">
                  <div
                    className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => setViewModalReport(report)}
                  >
                    {report.title}
                  </div>
                </td>

                <td className="px-6 py-4 align-top text-gray-600 max-w-sm">
                  {truncateWords(report.description, 50)}
                </td>

                <td className="px-6 py-4 text-gray-700 align-top">
                  {report.location || "N/A"}
                </td>
                <td className="px-6 py-4 align-top">
                  {renderStatusBadge(report.status)}
                </td>
                <td className="px-6 py-4 text-gray-700 align-top">
                  {new Date(
                    isArchived ? report.archived_at : report.created_at
                  ).toLocaleDateString()}
                </td>

                {/* Media cell (renders MediaPreview) */}
                <td className="px-6 py-4 align-top">
                  {report.file_urls?.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {report.file_urls.map((url, idx) => (
                        <MediaPreview key={idx} url={url} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Action column (View removed, Response gray) */}
                <td className="px-6 py-4 text-right align-top">
                  <div className="flex justify-end gap-2 items-center">
                    {/* View Button Removed */}

                    {isArchived ? (
                      // Dark Blue Restore Button
                      <button
                        onClick={() => restoreReport(report)}
                        className="px-3 py-1.5 text-sm font-semibold rounded-md bg-blue-800 text-white hover:bg-blue-700 transition-colors"
                        title="Restore Report"
                      >
                        Restore
                      </button>
                    ) : (
                      // --- Active Buttons ---
                      <>
                        {report.status === "Resolved" && (
                          // Dark Red Archive Button
                          <button
                            onClick={() => archiveReport(report)}
                            className="px-3 py-1.5 text-sm font-semibold rounded-md bg-red-800 text-white hover:bg-red-700 transition-colors"
                            title="Archive Report"
                          >
                            Archive
                          </button>
                        )}

                        {report.status !== "Resolved" && (
                          // Gray Response Button
                          <button
                            onClick={() => setResponseModalReport(report)}
                            className="px-3 py-1.5 text-sm font-semibold rounded-md bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                            title="Respond to Report"
                          >
                            Response
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // --- MOBILE CARD RENDER (Unchanged) ---
  const renderReportList = (list, isArchived = false) => {
    if (loading) {
      return (
        <p className="text-gray-500 text-center py-10">Loading reports...</p>
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
        className="flex flex-col overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100"
      >
        <div className="p-5 flex-grow">
          {/* Title is now clickable */}
          <div className="flex items-start justify-between mb-2">
            <h3
              className="text-base font-semibold text-gray-900 pr-2 cursor-pointer hover:text-blue-600"
              onClick={() => setViewModalReport(report)}
            >
              {report.title}
            </h3>
            {renderStatusBadge(report.status)}
          </div>

          <p className="text-xs text-gray-400 mt-1 mb-3">
            {new Date(
              isArchived ? report.archived_at : report.created_at
            ).toLocaleString()}
          </p>

          <p className="text-sm text-gray-600 flex items-center gap-1.5 mb-3">
            <MapPin size={14} />
            {report.location || "No location provided"}
          </p>

          <p className="text-sm text-gray-700 line-clamp-2">
            {report.description}
          </p>

          {report.file_urls?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <Paperclip size={14} />
                {report.file_urls.length} Attachment
                {report.file_urls.length > 1 ? "s" : ""}
              </span>
              {/* This part will now work because file_urls are public */}
              <div className="flex flex-wrap gap-2 mt-2">
                {report.file_urls.map((url, idx) => (
                  <MediaPreview key={idx} url={url} />
                ))}
              </div>
            </div>
          )}

          {report.official_response && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-900 mb-1">
                Official Response:
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-line line-clamp-3">
                {report.official_response}
              </p>
            </div>
          )}
        </div>

        {/* Card Footer (View removed, Response gray) */}
        {official && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            {isArchived ? (
              // --- Archived Buttons (Mobile) ---
              <div className="flex flex-wrap justify-end gap-2">
                {/* View button removed, title is clickable */}
                <button
                  onClick={() => restoreReport(report)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-700 text-white text-sm font-medium hover:bg-blue-800"
                >
                  <RotateCcw size={16} /> Restore
                </button>
              </div>
            ) : (
              // --- Active Buttons (Mobile) ---
              <div className="flex flex-wrap items-center justify-between gap-2">
                {report.status !== "Resolved" ? (
                  // Gray Response Button
                  <button
                    onClick={() => setResponseModalReport(report)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md bg-slate-700 text-white hover:bg-slate-800"
                  >
                    <CornerDownLeft size={16} /> Response
                  </button>
                ) : (
                  <button
                    onClick={() => archiveReport(report)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md bg-red-700 text-white hover:bg-red-800"
                    title="Archive Report"
                  >
                    <Archive size={16} /> Archive
                  </button>
                )}

                {/* View Icon Button Removed */}
              </div>
            )}
          </div>
        )}
      </motion.div>
    ));
  };

  // --- MAIN RENDER (Unchanged) ---
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="px-4 mx-auto sm:px-6 max-w-7xl">
        {/* Page Header & Toggle Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Citizen Reports
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Respond to, resolve, and manage all submitted reports.
            </p>
          </div>

          {/* Wrapper for sort and archive button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative">
              <select
                id="sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="appearance-none w-full sm:w-auto bg-white border border-gray-300 text-gray-700 px-4 py-2 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
                aria-label="Sort reports"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            <button
              onClick={() => {
                setShowArchived(!showArchived);
                setResponseModalReport(null);
                setViewModalReport(null);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 w-full sm:w-auto"
            >
              {showArchived ? (
                <>
                  <RotateCcw className="w-4 h-4 text-gray-600" />
                  View Active
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 text-gray-500" />
                  View Archived
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <AnimatePresence mode="wait">
          <motion.div
            key={showArchived ? "archived" : "published"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Show Table on Desktop */}
            <div className="hidden md:block">
              {renderReportTable(
                showArchived ? sortedArchivedReports : sortedReports,
                showArchived
              )}
            </div>
            {/* Show Card List on Mobile */}
            <div className="space-y-4 md:hidden">
              {renderReportList(
                showArchived ? sortedArchivedReports : sortedReports,
                showArchived
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RENDER THE MODALS */}
      <AnimatePresence>
        {responseModalReport && (
          <ResponseModal
            report={responseModalReport}
            onClose={() => setResponseModalReport(null)}
            onRespond={handleRespond}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewModalReport && (
          <ViewReportModal
            report={viewModalReport}
            onClose={() => setViewModalReport(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}