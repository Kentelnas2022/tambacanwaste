"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import {
  Archive,
  RotateCcw,
  BookOpen,
  Layers,
  Plus,
  ExternalLink,
  FileText,
  Video,
  Image,
  File,
  Inbox,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

// Helper component for a cleaner "Empty State"
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="text-center p-12 bg-white rounded-lg border-2 border-dashed border-slate-300 md:col-span-2">
    <Icon className="mx-auto h-12 w-12 text-slate-400" />
    <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

// Helper component for a prettier file input
const FileUploadInput = ({ onChange, media }) => {
  let fileIcon = <File className="w-5 h-5 text-slate-500" />;
  if (media?.type.startsWith("image/"))
    fileIcon = <Image className="w-5 h-5 text-slate-500" />;
  if (media?.type.startsWith("video/"))
    fileIcon = <Video className="w-5 h-5 text-slate-500" />;
  if (media?.type === "application/pdf")
    fileIcon = <FileText className="w-5 h-5 text-slate-500" />;

  return (
    <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white p-3 transition hover:border-slate-400 focus-within:ring-2 focus-within:ring-slate-500">
      <div className="flex-shrink-0">{fileIcon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {media ? media.name : "Upload media (image, video, pdf)"}
        </p>
        <p className="text-xs text-slate-500">
          {media ? `${(media.size / 1024).toFixed(1)} KB` : "Max 10MB"}
        </p>
      </div>
      <input type="file" onChange={onChange} className="sr-only" />
    </label>
  );
};

export default function Education() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contents, setContents] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    audience: "all",
    publishNow: false,
    media: null,
    mediaType: "",
  });

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    setIsLoading(true);
    const { data: published } = await supabase
      .from("educational_contents")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: archivedData } = await supabase
      .from("archived_education")
      .select("*")
      .order("created_at", { ascending: false });

    setContents(published || []);
    setArchived(archivedData || []);
    setIsLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type === "application/pdf") type = "pdf";

    setFormData((prev) => ({
      ...prev,
      media: file,
      mediaType: type,
    }));
  };

  const resetFormData = () => {
    setFormData({
      title: "",
      category: "",
      description: "",
      audience: "all",
      publishNow: false,
      media: null,
      mediaType: "",
    });
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    let media_url = null;

    if (!formData.title.trim()) {
      Swal.fire("Missing Title", "Please provide a title.", "warning");
      return;
    }

    Swal.fire({
      title: "Saving...",
      text: "Please wait while your content is being saved.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    if (formData.media) {
      const fileName = `${Date.now()}_${formData.media.name}`;
      const { error: uploadError } = await supabase.storage
        .from("education-media")
        .upload(fileName, formData.media);

      if (!uploadError) {
        const pub = supabase.storage
          .from("education-media")
          .getPublicUrl(fileName);
        media_url = pub?.data?.publicUrl || null;
      } else {
        Swal.fire("Upload Failed", uploadError.message, "error");
        return;
      }
    }

    const newContent = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      audience: "all",
      views: 0,
      status: formData.publishNow ? "Published" : "Draft",
      media_url,
      media_type: formData.mediaType,
    };

    const { data, error } = await supabase
      .from("educational_contents")
      .insert([newContent])
      .select();

    if (error) {
      Swal.fire("Save Failed", error.message, "error");
      return;
    }

    setContents((prev) => [data[0], ...prev]);
    setIsModalOpen(false);
    resetFormData();

    Swal.fire("Added!", "Your content has been saved.", "success");
  };

  const handleArchive = async (content) => {
    const result = await Swal.fire({
      title: "Archive this content?",
      text: "It will be moved to the archived section.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1f2937",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, archive it",
    });

    if (!result.isConfirmed) return;

    const { id, ...archivableContent } = content;

    const { error: insertError } = await supabase
      .from("archived_education")
      .insert([{ ...archivableContent, status: "Archived" }]);

    if (insertError) {
      Swal.fire("Failed to archive", insertError.message, "error");
      return;
    }

    const { error: deleteError } = await supabase
      .from("educational_contents")
      .delete()
      .eq("id", content.id);

    if (deleteError) {
      Swal.fire("Failed to remove original", deleteError.message, "error");
      return;
    }

    setContents((prev) => prev.filter((c) => c.id !== content.id));
    setArchived((prev) => [{ ...archivableContent, id: Date.now() }, ...prev]);

    Swal.fire("Archived!", "The content has been archived.", "success");
  };

  const handleRestore = async (content) => {
    const { id, ...restoredContent } = content;

    const { error: insertError } = await supabase
      .from("educational_contents")
      .insert([{ ...restoredContent, status: "Published" }]);

    if (insertError) {
      Swal.fire("Failed to restore", insertError.message, "error");
      return;
    }

    const { error: deleteError } = await supabase
      .from("archived_education")
      .delete()
      .eq("id", content.id);

    if (deleteError) {
      Swal.fire("Failed to delete archived", deleteError.message, "error");
      return;
    }

    setArchived((prev) => prev.filter((c) => c.id !== content.id));
    setContents((prev) => [
      { ...restoredContent, id: Date.now() },
      ...prev,
    ]);

    Swal.fire("Restored!", "The content has been restored.", "success");
  };

  const renderContentList = (list, isArchived = false) => {
    if (isLoading) {
      return <p className="text-slate-500 md:col-span-2">Loading content...</p>;
    }

    if (list.length === 0) {
      return (
        <EmptyState
          icon={isArchived ? Archive : Inbox}
          title={isArchived ? "No Archived Content" : "No Published Content"}
          description={
            isArchived
              ? "Archived items will appear here."
              : "Get started by adding new educational content."
          }
        />
      );
    }

    return list.map((content) => (
      <motion.div
        key={content.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col overflow-hidden bg-white border rounded-lg shadow-sm border-slate-200"
      >
        {/* Card Body */}
        <div className="p-5 flex-grow">
          <h3 className="text-lg font-semibold text-slate-900">
            {content.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600 line-clamp-2">
            {content.description || "No description provided."}
          </p>

          {content.media_url && (
            <a
              href={content.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-slate-600 hover:text-slate-700 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View Uploaded File
            </a>
          )}
        </div>

        {/* Card Footer */}
        <div className="flex flex-col items-start gap-3 px-5 py-3 border-t sm:flex-row sm:items-center sm:justify-between bg-slate-50 border-slate-200">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {content.category || "Uncategorized"}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {content.audience}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                content.status === "Published"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {content.status}
            </span>
          </div>

          <button
            onClick={() =>
              isArchived ? handleRestore(content) : handleArchive(content)
            }
            className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md shadow-sm transition border ${
              isArchived
                ? "bg-white text-green-700 border-green-300 hover:bg-green-50"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {isArchived ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            {isArchived ? "Restore" : "Archive"}
          </button>
        </div>
      </motion.div>
    ));
  };

  return (
    <div className="">
      <div className="px-4 mx-auto sm:px-6 max-w-7xl">
        
        {/* --- MODIFIED SECTION START --- */}
        {/* Page Header & Toggle Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Educational Content
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage and publish educational materials for users.
            </p>
          </div>

          {/* Header Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white transition bg-slate-700 rounded-lg shadow hover:bg-slate-800 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add New Content
            </button>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-gray-700 transition bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 w-full sm:w-auto"
            >
              {showArchived ? (
                <>
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                  View Published
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
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={showArchived ? "archived" : "published"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Added section headers back */}
              <h2 className="flex items-center gap-2 mb-4 text-xl font-semibold text-black">
                {showArchived ? (
                  <Layers className="w-5 h-5" />
                ) : (
                  <BookOpen className="w-5 h-5" />
                )}
                {showArchived ? "Archived Content" : "Published Content"}
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {renderContentList(
                  showArchived ? archived : contents,
                  showArchived
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Add Content Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full max-w-lg p-6 space-y-4 bg-white rounded-2xl shadow-xl"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                📚 Add New Educational Content
              </h2>
              <form onSubmit={handleAddContent} className="space-y-4">
                <input
                  type="text"
                  placeholder="Content Title"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-500"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-500"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <option value="">Select Category</option>
                  <option value="Waste Segregation">Waste Segregation</option>
                  <option value="Recycling">Recycling</option>
                  <option value="Composting">Composting</option>
                  {/* ... other options */}
                  <option value="Health and Safety">Health and Safety</option>
                </select>
                <textarea
                  placeholder="Description"
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-500"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />

                <FileUploadInput
                  onChange={handleFileUpload}
                  media={formData.media}
                />

                <label className="flex items-center gap-3 p-3 transition border rounded-lg cursor-pointer bg-slate-50 border-slate-200 hover:bg-slate-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-slate-600 rounded shadow-sm focus:ring-slate-500"
                    checked={formData.publishNow}
                    onChange={(e) =>
                      setFormData({ ...formData, publishNow: e.target.checked })
                    }
                  />
                  <span className="font-medium text-slate-700">
                    Publish immediately
                  </span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 font-medium transition border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-medium text-white bg-slate-700 rounded-lg shadow transition hover:bg-slate-800"
                  >
                    Save Content
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}