"use client";
import { useState, useEffect } from "react";
// --- FIX: Reverted to project-style import ---
import { supabase } from "@/supabaseClient";
import {
  SendHorizontal,
  Users,
  Archive,
  RotateCcw,
  Clock,
  MessageSquare, // Removed Inbox
  History,
  X,
  // Removed Calendar
} from "lucide-react";
// --- FIX: Reverted to project-style import ---
import Swal from "sweetalert2";

// --- Modal Component ---
function HistoryModal({ isOpen, onClose, history, onArchive, onRestore }) {
  const [activeTab, setActiveTab] = useState("recent");

  const recentHistory = history.filter((h) => !h.archived);
  const archivedHistory = history.filter((h) => h.archived);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Message History
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-3 border-b border-gray-200 bg-gray-50/50">
          <TabButton
            icon={<History className="w-4 h-4" />}
            label="Recent"
            isActive={activeTab === "recent"}
            onClick={() => setActiveTab("recent")}
          />
          <TabButton
            icon={<Archive className="w-4 h-4" />}
            label="Archive"
            isActive={activeTab === "archive"}
            onClick={() => setActiveTab("archive")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab === "recent" && (
            <ul className="divide-y divide-gray-200">
              {recentHistory.length === 0 ? (
                <p className="text-gray-500 italic text-center py-10 text-sm">
                  No recent messages yet...
                </p>
              ) : (
                recentHistory.map((entry) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    action="archive"
                    onClick={() => onArchive(entry.id)}
                  />
                ))
              )}
            </ul>
          )}

          {activeTab === "archive" && (
            <ul className="divide-y divide-gray-200">
              {archivedHistory.length === 0 ? (
                <p className="text-gray-500 italic text-center py-10 text-sm">
                  No archived messages...
                </p>
              ) : (
                archivedHistory.map((entry) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    action="restore"
                    onClick={() => onRestore(entry.id)}
                  />
                ))
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
        ${
          isActive
            ? "bg-white text-emerald-700 shadow-sm border border-gray-200"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function HistoryItem({ entry, action, onClick }) {
  return (
    <li className="py-4 flex justify-between items-start gap-4">
      <div className="text-sm space-y-1">
        <p className="text-gray-700">
          <span className="font-medium text-gray-800">To:</span>{" "}
          {entry.recipient_group}
        </p>
        <p className="text-gray-700">
          <span className="font-medium text-gray-800">Type:</span>{" "}
          {entry.message_type}
        </p>
        <p className="text-gray-700 leading-snug">{entry.message}</p>
        <p className="text-xs text-gray-500 pt-1">
          Sent: {new Date(entry.sent_at).toLocaleString()}
        </p>
      </div>
      <button
        onClick={onClick}
        title={action === "archive" ? "Archive message" : "Restore message"}
        className={`p-1.5 text-gray-400 hover:${
          action === "archive"
            ? "text-yellow-600 hover:bg-yellow-50"
            : "text-emerald-600 hover:bg-emerald-50"
        } rounded-md transition-colors`}
      >
        {action === "archive" ? (
          <Archive className="w-4 h-4" />
        ) : (
          <RotateCcw className="w-4 h-4" />
        )}
      </button>
    </li>
  );
}

// --- DELETED: AnalyticsCard ---

// --- Main SMS Component ---
export default function SMS() {
  const [recipientGroup, setRecipientGroup] = useState("all");
  const [messageType, setMessageType] = useState("custom");
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [schedule, setSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [history, setHistory] = useState([]);
  // --- DELETED: sentToday ---
  // --- DELETED: totalMessages ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false); // Add sending state

  useEffect(() => {
    fetchHistory();
    // --- DELETED: fetchStats() call ---
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("sms_archive")
      .select("*")
      .order("sent_at", { ascending: false });

    if (!error) setHistory(data || []);
    else console.error("Error fetching SMS history:", error);
  };

  // --- DELETED: fetchStats function ---

  const archiveMessage = async (id) => {
    // --- DESIGN UPGRADE for Archive Confirmation ---
    const result = await Swal.fire({
      title: "Archive Message?",
      text: "This message will be moved to the archive.",
      icon: "warning",
      iconColor: "#f59e0b", // Amber
      showCancelButton: true,
      confirmButtonColor: "#f59e0b", // Amber
      cancelButtonColor: "#d1d5db", // Gray
      confirmButtonText: "Yes, archive it!",
      customClass: {
        title: "text-2xl font-semibold text-gray-900",
        popup: "rounded-2xl shadow-lg",
      },
    });

    if (result.isConfirmed) {
      await supabase.from("sms_archive").update({ archived: true }).eq("id", id);
      fetchHistory();
      // --- DESIGN UPGRADE for Archive Success ---
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Message Archived",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    }
  };

  const restoreMessage = async (id) => {
    // --- DESIGN UPGRADE for Restore Confirmation ---
    const result = await Swal.fire({
      title: "Restore Message?",
      text: "This message will be moved back to recent.",
      icon: "question",
      iconColor: "#10b981", // Emerald
      showCancelButton: true,
      confirmButtonColor: "#10b981", // Emerald
      cancelButtonColor: "#d1d5db",
      confirmButtonText: "Yes, restore it!",
      customClass: {
        title: "text-2xl font-semibold text-gray-900",
        popup: "rounded-2xl shadow-lg",
      },
    });

    if (result.isConfirmed) {
      await supabase
        .from("sms_archive")
        .update({ archived: false })
        .eq("id", id);
      fetchHistory();
      // --- DESIGN UPGRADE for Restore Success ---
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Message Restored",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    }
  };

  const messageTemplates = {
    custom: "",
    collection:
      "Reminder: Waste collection will happen today. Please place your garbage outside before 6:00 AM.",
    delay:
      "Notice: Waste collection is delayed due to unforeseen circumstances. We apologize for the inconvenience.",
    education:
      "Eco Tip: Segregate your biodegradable and non-biodegradable waste to help keep our barangay clean.",
    emergency:
      "⚠️ Emergency Alert: Please be advised of an urgent waste-related announcement from Barangay Tambacan.",
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setMessageType(type);
    setMessage(messageTemplates[type]);
    setCharCount(messageTemplates[type].length);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Please enter a message before sending.",
        confirmButtonColor: "#b33b3b", // Red
        customClass: {
          title: "text-2xl font-semibold text-gray-900",
          popup: "rounded-2xl shadow-lg",
        },
      });
      return;
    }

    setIsSending(true);

    try {
      const testNumber = "+639924794425"; // Your hardcoded test number

      // --- FIX: Use relative path for API route ---
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testNumber, message }),
      });

      const result = await response.json();

      if (!result.success) {
        Swal.fire({
          icon: "error",
          title: "Send Failed",
          text:
            "Failed to send SMS via Vonage: " +
            (result.error || "Unknown error"),
          confirmButtonColor: "#b33b3b",
          customClass: {
            title: "text-2xl font-semibold text-gray-900",
            popup: "rounded-2xl shadow-lg",
          },
        });
        setIsSending(false);
        return;
      }

      const timestamp = new Date().toISOString();
      const { error } = await supabase.from("sms_archive").insert([
        {
          recipient_group: recipientGroup,
          message_type: messageType,
          message,
          scheduled_for: schedule ? scheduleTime : null,
          sent_at: timestamp,
          archived: false,
        },
      ]);

      if (error) {
        console.error("Error archiving SMS:", error);
        Swal.fire({
          icon: "error",
          title: "Archive Failed",
          text: "The message sent, but failed to save to history.",
          confirmButtonColor: "#b33b3b",
          customClass: {
            title: "text-2xl font-semibold text-gray-900",
            popup: "rounded-2xl shadow-lg",
          },
        });
        setIsSending(false);
        return;
      }

      fetchHistory();
      // --- DELETED: fetchStats() call ---
      setMessage("");
      setCharCount(0);
      setSchedule(false);
      setScheduleTime("");
      setMessageType("custom");
      setIsSending(false);

      // --- DESIGN UPGRADE for Success Alert ---
      Swal.fire({
        // --- FIX: Removed redundant 'icon' and 'iconColor' ---
        title: "✅ SMS Sent!", // --- FIX: Added emoji to title ---
        html: `
          <div class="text-left text-sm text-gray-700 px-2 sm:px-4">
            <p class="mb-3">Your message was successfully sent via Vonage.</p>
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">
              <p class="mb-1 flex justify-between">
                <span class="font-medium">Recipient:</span>
                <span>${testNumber}</span>
              </p>
              <p class="flex justify-between">
                <span class="font-medium">Time:</span>
                <span class="text-right">${new Date().toLocaleString()}</span>
              </p>
            </div>
          </div>
        `,
        confirmButtonText: "Great!",
        confirmButtonColor: "#10b981", // Emerald
        customClass: {
          popup: "rounded-2xl shadow-lg",
          title: "text-2xl font-semibold text-gray-900 pt-5",
          htmlContainer: "mt-0 px-0",
          confirmButton:
            "px-6 py-2 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-300",
        },
      });
    } catch (err) {
      console.error("Error submitting form:", err);
      Swal.fire({
        icon: "error",
        title: "A Client Error Occurred",
        text: `An error occurred: ${err.message}`,
        confirmButtonColor: "#b33b3b",
        customClass: {
          title: "text-2xl font-semibold text-gray-900",
          popup: "rounded-2xl shadow-lg",
        },
      });
      setIsSending(false); // Stop loading
    }
  };

  return (
    <section className="w-full min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* --- DELETED: Analytics Section --- */}

        {/* Send SMS */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              Send SMS Alert
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div>
              <label
                htmlFor="recipient"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Recipient
              </label>
              <select
                id="recipient"
                value={recipientGroup}
                onChange={(e) => setRecipientGroup(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isSending}
              >
                <option value="all">All Residents</option>
                <option value="purok1">Purok 1</option>
                <option value="purok2">Purok 2</option>
                <option value="purok3">Purok 3</option>
                <option value="purok4">Purok 4</option>
                <option value="purok5">Purok 5</option>
                <option value="purok6">Purok 6</option>
                <option value="purok7">Purok 7</option>
                <option value="purok8">Purok 8</option>
                <option value="purok9">Purok 9</option>
                <option value="purok10">Purok 10</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="messageType"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Message Type
              </label>
              <select
                id="messageType"
                value={messageType}
                onChange={handleTypeChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isSending}
              >
                <option value="custom">Custom</option>
                <option value="collection">Collection Reminder</option>
                <option value="delay">Delay Notice</option>
                <option value="education">Education Tip</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div className="relative">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={handleMessageChange}
                rows="4"
                maxLength="160"
                placeholder="Enter your message..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-neone"
                disabled={isSending}
              />
              <p className="absolute bottom-2.5 right-3 text-xs text-gray-500">
                {charCount}/160
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  id="schedule"
                  type="checkbox"
                  checked={schedule}
                  onChange={(e) => setSchedule(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  disabled={isSending}
                />
                <label
                  htmlFor="schedule"
                  className="text-sm font-medium text-gray-800 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-gray-500" />
                  Schedule Sending
                </label>
              </div>

              {schedule && (
                <div className="pl-6">
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={isSending}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-red-900 hover:bg-red-700 text-white py-2.5 px-3 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <SendHorizontal className="w-4 h-4" /> Send
                </>
              )}
            </button>
          </form>
        </div>

        {/* View History Button */}
        <div className="w-full">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-800 hover:bg-gray-50 transition-all"
          >
            <History className="w-4 h-4 text-gray-600" />
            View Message History
          </button>
        </div>

        {/* History Modal */}
        <HistoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          history={history}
          onArchive={archiveMessage}
          onRestore={restoreMessage}
        />
      </div>
    </section>
  );
}