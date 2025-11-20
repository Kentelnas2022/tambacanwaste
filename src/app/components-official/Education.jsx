"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import {
  Archive,
  RotateCcw,
  BookOpen,
  Plus,
  ExternalLink,
  FileText,
  Video,
  Image as ImageIcon,
  File as FileIcon,
  Inbox,
  X,
  ArrowLeft, // Added for the new modal
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

// --- Helper: Empty State ---
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="text-center p-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

// --- Helper: File Upload Input ---
const FileUploadInput = ({ onChange, media }) => {
  let fileIcon = <FileIcon className="w-5 h-5 text-gray-500" />;
  if (media?.type?.startsWith("image/"))
    fileIcon = <ImageIcon className="w-5 h-5 text-gray-500" />;
  if (media?.type?.startsWith("video/"))
    fileIcon = <Video className="w-5 h-5 text-gray-500" />;
  if (media?.type === "application/pdf")
    fileIcon = <FileText className="w-5 h-5 text-gray-500" />;

  return (
    <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-gray-100 p-3.5 transition hover:bg-gray-200 focus-within:ring-2 focus-within:ring-[#b33b3b]/60">
      <div className="flex-shrink-0">{fileIcon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-700">
          {media ? media.name : "Upload media (image, video, pdf)"}
        </p>
        <p className="text-xs text-gray-500">
          {media ? `${(media.size / 1024 / 1024).toFixed(1)} MB` : "Max 10MB"}
        </p>
      </div>
      <input
        type="file"
        accept="image/*,video/*,application/pdf"
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );
};

// --- Main Education Component ---
export default function Education() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contents, setContents] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewModal, setViewModal] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    audience: "all",
    media: null,
    mediaType: "",
  });

  // --- Fetch data ---
  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      const { data: published, error: pubError } = await supabase
        .from("educational_contents")
        .select("*")
        .order("created_at", { ascending: false });
      if (pubError) throw pubError;

      const { data: archivedData, error: archError } = await supabase
        .from("archived_education")
        .select("*")
        .order("created_at", { ascending: false });
      if (archError) throw archError;

      setContents(published || []);
      setArchived(archivedData || []);
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not load educational content.",
        icon: "error",
        confirmButtonColor: "#b33b3b",
      });
    } finally {
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  // --- Handlers ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Maximum file size is 10MB.",
        icon: "warning",
        confirmButtonColor: "#b33b3b",
      });
      e.target.value = null;
      return;
    }
    setFormData((prev) => ({ ...prev, media: file, mediaType: file.type }));
  };

  const resetFormData = () => {
    setFormData({
      title: "",
      category: "",
      description: "",
      audience: "all",
      media: null,
      mediaType: "",
    });
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    let media_url = null;

    if (!formData.title.trim()) {
      Swal.fire({
        title: "Missing Title",
        text: "Please provide a title.",
        icon: "warning",
        confirmButtonColor: "#b33b3b",
      });
      return;
    }
    if (!formData.category) {
      Swal.fire({
        title: "Missing Category",
        text: "Please select a category.",
        icon: "warning",
        confirmButtonColor: "#b33b3b",
      });
      return;
    }

    Swal.fire({
      title: "Saving...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      confirmButtonColor: "#b33b3b",
    });

    try {
      if (formData.media) {
        const fileExt = formData.media.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("education-media")
          .upload(filePath, formData.media);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("education-media")
          .getPublicUrl(filePath);
        media_url = urlData?.publicUrl || null;
      }

      const newContent = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        audience: formData.audience,
        views: 0,
        status: "Published",
        media_url,
        media_type: formData.mediaType || null,
      };

      const { data, error } = await supabase
        .from("educational_contents")
        .insert([newContent])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Insert failed.");

      if (data.status === "Published") setContents((prev) => [data, ...prev]);
      setIsModalOpen(false);
      resetFormData();
      Swal.fire({
        title: "Added!",
        text: "Your content has been saved.",
        icon: "success",
        confirmButtonColor: "#6b7280",
      });
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#b33b3b",
      });
    }
  };

  const handleArchive = async (content) => {
    const result = await Swal.fire({
      title: "Archive this content?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#b33b3b",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, archive it",
    });
    if (!result.isConfirmed) return;
    Swal.fire({ title: "Archiving...", didOpen: () => Swal.showLoading() });
    try {
      const { id, created_at, ...archivable } = content;
      const { data: archivedEntry } = await supabase
        .from("archived_education")
        .insert([{ ...archivable, status: "Archived" }])
        .select()
        .single();
      await supabase.from("educational_contents").delete().eq("id", content.id);
      setContents((p) => p.filter((c) => c.id !== content.id));
      setArchived((p) => [archivedEntry, ...p]);
      Swal.fire({
        title: "Archived!",
        icon: "success",
        confirmButtonColor: "#b33b3b",
      });
    } catch (error) {
      Swal.fire({
        title: "Archive Failed",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#b33b3b",
      });
    }
  };

  const handleRestore = async (content) => {
    Swal.fire({ title: "Restoring...", didOpen: () => Swal.showLoading() });
    try {
      const { id, created_at, ...restorable } = content;
      const { data } = await supabase
        .from("educational_contents")
        .insert([{ ...restorable, status: "Published" }])
        .select()
        .single();
      await supabase.from("archived_education").delete().eq("id", content.id);
      setArchived((p) => p.filter((c) => c.id !== content.id));
      setContents((p) => [data, ...p]);
      Swal.fire({
        title: "Restored!",
        icon: "success",
        confirmButtonColor: "#b33b3b",
      });
    } catch (error) {
      Swal.fire({
        title: "Restore Failed",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#b33b3b",
      });
    }
  };

  // --- MAIN RENDER ---
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Educational Content
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and publish educational materials.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#b33b3b] rounded-lg hover:bg-[#c14a4a]"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showArchived ? (
              <>
                <BookOpen className="w-4 h-4" /> View Published
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" /> View Archived
              </>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Title
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Category
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Audience
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Media
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  Loading content...
                </td>
              </tr>
            ) : (showArchived ? archived : contents).length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={showArchived ? Archive : Inbox}
                    title={
                      showArchived
                        ? "No archived content"
                        : "No educational content"
                    }
                    description="Add new content using the 'Add New' button above."
                  />
                </td>
              </tr>
            ) : (
              (showArchived ? archived : contents).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.title}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.category}</td>
                  <td className="px-4 py-3 text-gray-700">{c.audience}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        c.status === "Published"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.media_url ? (
                      <a
                        href={c.media_url}
                        target="_blank"
                        className="text-[#b33b3b] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={14} /> View
                      </a>
                    ) : (
                      <span className="text-gray-400">No Media</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <button
                      onClick={() => setViewModal(c)}
                      className="px-3 py-1 text-sm text-white bg-gray-700 rounded-md hover:bg-gray-800"
                    >
                      View
                    </button>
                    {showArchived ? (
                      <button
                        onClick={() => handleRestore(c)}
                        className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(c)}
                        className="px-3 py-1 text-sm text-white bg-[#b33b3b] rounded-md hover:bg-[#a22a2a]"
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-4">
        {isLoading ? (
          <div className="py-10 text-center text-gray-500">
            Loading content...
          </div>
        ) : (showArchived ? archived : contents).length === 0 ? (
          <EmptyState
            icon={showArchived ? Archive : Inbox}
            title={
              showArchived
                ? "No archived content"
                : "No educational content"
            }
            description="Add new content using the 'Add New' button above."
          />
        ) : (
          (showArchived ? archived : contents).map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-4"
            >
              {/* Card Header: Title and Status */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 pr-2">{c.title}</h3>
                <span
                  className={clsx(
                    "flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full",
                    c.status === "Published"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {c.status}
                </span>
              </div>

              {/* Card Body: Details */}
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex gap-2">
                  <strong className="text-gray-800">Category:</strong>
                  <span>{c.category}</span>
                </div>
                <div className="flex gap-2">
                  <strong className="text-gray-800">Audience:</strong>
                  <span>{c.audience}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <strong className="text-gray-800">Media:</strong>
                  {c.media_url ? (
                    <a
                      href={c.media_url}
                      target="_blank"
                      className="text-[#b33b3b] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={14} /> View
                    </a>
                  ) : (
                    <span className="text-gray-400">No Media</span>
                  )}
                </div>
              </div>

              {/* Card Footer: Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setViewModal(c)}
                  className="px-3 py-1 text-sm text-white bg-gray-700 rounded-md hover:bg-gray-800"
                >
                  View
                </button>
                {showArchived ? (
                  <button
                    onClick={() => handleRestore(c)}
                    className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={() => handleArchive(c)}
                    className="px-3 py-1 text-sm text-white bg-[#b33b3b] rounded-md hover:bg-[#a22a2a]"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Content Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ y: -25, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -25, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">
                  Add New Educational Content
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddContent} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#b33b3b]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#b33b3b]"
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    <option value="Waste Segregation">Waste Segregation</option>
                    <option value="Recycling">Recycling</option>
                    <option value="Composting">Composting</option>
                    <option value="Waste Reduction">Waste Reduction</option>
                    <option value="Proper Disposal">Proper Disposal</option>
                    <option value="Hazardous Waste">Hazardous Waste</option>
                    <option value="Health and Safety">Health and Safety</option>
                    <option value="Sustainable Living">
                      Sustainable Living
                    </option>
                    <option value="General">General/Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Write a short description..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#b33b3b]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload File (Optional)
                  </label>
                  <FileUploadInput
                    onChange={handleFileUpload}
                    media={formData.media}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#8b1c1c] rounded-md hover:bg-[#a22a2a]"
                  >
                    Save Content
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- THIS IS THE UPDATED BLOCK --- */}
      {/* View Content Modal */}
      <AnimatePresence>
        {viewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setViewModal(null)}
          >
            {/* New Modal Content Wrapper with requested animation */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* New Header */}
              <div className="sticky top-0 z-10 flex items-center gap-2 p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm rounded-t-2xl">
                <button
                  onClick={() => setViewModal(null)}
                  className="p-1.5 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-semibold text-gray-900 line-clamp-1">
                  {viewModal.title}
                </h3>
              </div>

              {/* New Content Area */}
              <div className="p-6 pb-10">
                {/* Category Badge (Using your original style) */}
                <div className="mb-4">
                  <span className="inline-block bg-[#b33b3b]/10 text-[#b33b3b] text-xs font-semibold px-3 py-1 rounded-full">
                    {viewModal.category || "General"}
                  </span>
                </div>

                {/* Media Section */}
                {viewModal.media_url &&
                  (viewModal.media_type?.startsWith("video") ? (
                    <video
                      src={viewModal.media_url}
                      controls
                      className="rounded-xl w-full max-h-60 object-cover border border-gray-200 mb-4 bg-gray-100"
                    />
                  ) : viewModal.media_type?.startsWith("image") ? (
                    <img
                      src={viewModal.media_url}
                      alt={viewModal.title}
                      className="rounded-xl w-full max-h-60 object-cover border border-gray-200 mb-4 bg-gray-100"
                    />
                  ) : null)}

                {/* Description */}
                <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {viewModal.description || "No description provided."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}