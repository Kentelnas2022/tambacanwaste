"use client";
import { useState, useEffect } from "react";
import { Map, ClipboardList, ArchiveRestore } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabaseClient";
import Swal from "sweetalert2";
import CollectionStatus from "./CollectionStatus";

export default function Tabs() {
  const [activeTab, setActiveTab] = useState("collection");

  const tabs = [
    { id: "collection", label: "Collection Status", icon: ClipboardList },
    { id: "archived", label: "Archived Collections", icon: ArchiveRestore },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* 🔹 Tab headers */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 🔹 Tab content */}
      <div className="p-4 sm:p-6">
        {activeTab === "collection" && <CollectionStatus />}
        {activeTab === "archived" && <ArchivedCollections />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* 🗃️ Archived Collections Component */
/* ------------------------------------------------------------------------- */

function ArchivedCollections() {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🧩 Fetch archived data from your table `collection_archive`
  useEffect(() => {
    const fetchArchived = async () => {
      const { data, error } = await supabase
        .from("collection_archive")
        .select("*")
        .order("archived_at", { ascending: false });

      if (error) {
        console.error("Error fetching archived:", error.message);
        setLoading(false);
        return;
      }
      setArchived(data || []);
      setLoading(false);
    };

    fetchArchived();
  }, []);

  // ♻️ Restore collection from archive
  const handleRestore = async (item) => {
    if (!item?.id) {
      Swal.fire({
        icon: "error",
        title: "Missing Data",
        text: "Missing archived item ID — cannot restore.",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: `Restore ${item.purok}?`,
      text: "This will remove it from the archive.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, restore it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from("collection_archive")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      setArchived((prev) => prev.filter((p) => p.id !== item.id));

      Swal.fire({
        icon: "success",
        title: "Restored Successfully!",
        text: `${item.purok} has been restored.`,
        confirmButtonColor: "#16a34a",
        timer: 2000,
      });
    } catch (err) {
      console.error("Restore failed:", err.message);
      Swal.fire({
        icon: "error",
        title: "Restore Failed",
        text: err.message,
      });
    }
  };

  // 🕒 Formatter helpers
  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40 text-gray-500">
        Loading archived collections...
      </div>
    );
  }

  if (archived.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        No archived collections found.
      </div>
    );
  }

  return (
    <motion.div
      className=""
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/40 to-blue-50/40 rounded-2xl -z-10"></div>

      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        Archived Collections
      </h2>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full min-w-[650px] border-collapse text-xs sm:text-sm md:text-base">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-blue-50 text-[11px] sm:text-sm border-b border-gray-200">
              <th className="text-left py-3 px-2 sm:px-4">Purok</th>
              <th className="text-left py-3 px-2 sm:px-4">Route Plan</th>
              <th className="text-left py-3 px-2 sm:px-4">Schedule Day</th>
              <th className="text-left py-3 px-2 sm:px-4">Schedule Date</th>
              <th className="text-left py-3 px-2 sm:px-4">Waste Type</th>
              <th className="py-3 px-2 sm:px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {archived.map((item) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                >
                  <td className="py-3 px-2 sm:px-4 font-medium text-gray-800 whitespace-nowrap">
                    {item.purok}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-gray-600">
                    {item.route_plan}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-gray-600">
                    {item.schedule_day}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-gray-700">
                    {formatDate(item.schedule_date)}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-gray-600">
                    {item.waste_type || "—"}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRestore(item)}
                      className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-green-700 text-white rounded-lg shadow"
                    >
                      Restore
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
