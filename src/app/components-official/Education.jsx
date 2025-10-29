"use client";

import React, { useState, useEffect, Fragment } from "react";
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
  MoreVertical,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

// --- Helper: Empty State (White/Gray Palette) ---
const EmptyState = ({ icon: Icon, title, description }) => (
  // Using white bg, gray-200 border, gray-400 icon, gray-900 title, gray-500 desc
  <div className="text-center p-12 bg-white rounded-lg border-2 border-dashed border-gray-200 md:col-span-2 lg:col-span-3">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3> {/* Black text */}
    <p className="mt-1 text-sm text-gray-500">{description}</p> {/* Gray text */}
  </div>
);

// --- Helper: File Upload Input (White/Gray/Red Palette) ---
const FileUploadInput = ({ onChange, media }) => {
  // Using gray-500 icons, gray-100 bg, gray-700/500 text, red focus ring
  let fileIcon = <FileIcon className="w-5 h-5 text-gray-500" />;
  if (media?.type.startsWith("image/"))
    fileIcon = <ImageIcon className="w-5 h-5 text-gray-500" />;
  if (media?.type.startsWith("video/"))
    fileIcon = <Video className="w-5 h-5 text-gray-500" />;
  if (media?.type === "application/pdf")
    fileIcon = <FileText className="w-5 h-5 text-gray-500" />;

  return (
    // Gray bg, red focus ring
    <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-gray-100 p-3.5 transition hover:bg-gray-200/60 focus-within:ring-2 focus-within:ring-[#d94f4f]/60 focus-within:bg-white">
      <div className="flex-shrink-0">{fileIcon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-700"> {/* Darker gray */}
          {media ? media.name : "Upload media (image, video, pdf)"}
        </p>
        <p className="text-xs text-gray-500"> {/* Lighter gray */}
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


// --- Content Card Skeleton (White/Gray Palette) ---
const ContentCardSkeleton = () => (
    // Using white bg, gray-200 border, gray-200 placeholders
    <div className="flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-pulse">
        <div className="w-1.5 flex-shrink-0 bg-gray-200"></div> {/* Light gray bar */}
        <div className="p-5 flex-grow w-full space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="flex justify-between items-center pt-2">
                 <div className="flex gap-2">
                    <div className="h-4 bg-gray-200 rounded-full w-16"></div>
                    <div className="h-4 bg-gray-200 rounded-full w-12"></div>
                </div>
                 <div className="h-6 w-6 bg-gray-200 rounded-md"></div>
            </div>
        </div>
    </div>
);


// --- Main Education Component ---
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
    publishNow: true,
    media: null,
    mediaType: "",
  });

  // --- Data Fetching ---
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
      console.error("Error fetching content:", error);
      // Use red confirm button for error alert
      Swal.fire({
        title: "Error",
        text: "Could not load educational content.",
        icon: "error",
        confirmButtonColor: '#b33b3b'
      });
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  // --- Event Handlers (Updated Swal Colors) ---
  const handleFileUpload = (e) => {
      const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        Swal.fire({ // Use red confirm button
            title: "File Too Large",
            text: "Maximum file size is 10MB.",
            icon: "warning",
            confirmButtonColor: '#b33b3b'
        });
        e.target.value = null;
        return;
    }
    // ... rest of handler
      let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type === "application/pdf") type = "pdf";

    setFormData((prev) => ({
      ...prev,
      media: file,
      mediaType: file.type,
    }));
  };

  const resetFormData = () => {
     setFormData({
        title: "",
        category: "",
        description: "",
        audience: "all",
        publishNow: true,
        media: null,
        mediaType: "",
     });
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    let media_url = null;

    if (!formData.title.trim()) {
      Swal.fire({ // Use red confirm button
        title: "Missing Title",
        text: "Please provide a title.",
        icon: "warning",
        confirmButtonColor: '#b33b3b'
      });
      return;
    }
     if (!formData.category) {
      Swal.fire({ // Use red confirm button
        title: "Missing Category",
        text: "Please select a category.",
        icon: "warning",
        confirmButtonColor: '#b33b3b'
      });
      return;
    }

    Swal.fire({
        title: "Saving...",
        text: "Please wait while your content is being saved.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        confirmButtonColor: '#b33b3b' // Also set color here if needed
     });
    try {
        if (formData.media) {
            const fileExt = formData.media.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
            .from("education-media")
            .upload(filePath, formData.media);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
            .from("education-media")
            .getPublicUrl(filePath);

            media_url = urlData?.publicUrl || null;
            if (!media_url) throw new Error("Failed to get public URL for uploaded media.");
        }

        const newContent = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            audience: formData.audience,
            views: 0,
            status: formData.publishNow ? "Published" : "Draft",
            media_url,
            media_type: formData.mediaType || null,
        };

        const { data, error } = await supabase
            .from("educational_contents")
            .insert([newContent])
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error("Failed to insert content or retrieve inserted data.");

        if (data.status === 'Published') {
            setContents((prev) => [data, ...prev]);
        } // Handle Draft if needed

        setIsModalOpen(false);
        resetFormData();
        Swal.fire({
          title:"Added!",
          text: "Your content has been saved.",
          icon: "success",
          confirmButtonColor: '#b33b3b' // Red confirm
        });
    } catch (error) {
         console.error("Error adding content:", error);
         Swal.fire({
            title: "Save Failed",
            text: error.message || "An unexpected error occurred.",
            icon: "error",
            confirmButtonColor: '#b33b3b' // Red confirm
        });
    }
  };

  const handleArchive = async (content) => {
    const result = await Swal.fire({
        title: "Archive this content?",
        text: "It will be moved to the archived section.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: '#b33b3b', // Red confirm
        cancelButtonColor: '#6b7280', // Gray cancel
        confirmButtonText: "Yes, archive it",
     });
    if (!result.isConfirmed) return;
    Swal.fire({ title: "Archiving...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const { id, created_at, ...archivableContent } = content;
        const { data: archivedEntry, error: insertError } = await supabase
            .from("archived_education")
            .insert([{ ...archivableContent, status: "Archived" }])
            .select()
            .single();

        if (insertError) throw insertError;
        if (!archivedEntry) throw new Error("Failed to retrieve archived record after insert.");

        const { error: deleteError } = await supabase
            .from("educational_contents")
            .delete()
            .eq("id", content.id);
        if (deleteError) console.error("Failed to delete original after archiving:", deleteError.message);

        setContents((prev) => prev.filter((c) => c.id !== content.id));
        setArchived((prev) => [archivedEntry, ...prev]);

        Swal.fire({
            title: "Archived!",
            text: "The content has been archived.",
            icon: "success",
            confirmButtonColor: '#b33b3b' // Red confirm
        });
    } catch (error) {
        Swal.fire({
            title: "Archive Failed",
            text: error.message || "Could not archive content.",
            icon: "error",
            confirmButtonColor: '#b33b3b' // Red confirm
         });
    }
  };

  const handleRestore = async (content) => {
     Swal.fire({ title: "Restoring...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
            const { id, created_at, ...restorableContent } = content;
            const { data: insertedData, error: insertError } = await supabase
                .from("educational_contents")
                .insert([{ ...restorableContent, status: "Published" }])
                .select()
                .single();
            if (insertError) throw insertError;
            if (!insertedData) throw new Error("Failed to retrieve restored content.");

            const { error: deleteError } = await supabase
                .from("archived_education")
                .delete()
                .eq("id", content.id);
             if (deleteError) console.error("Failed to delete from archive after restore:", deleteError.message);

            setArchived((prev) => prev.filter((c) => c.id !== content.id));
            setContents((prev) => [insertedData, ...prev]);

            Swal.fire({
                title:"Restored!",
                text: "The content has been restored.",
                icon: "success",
                confirmButtonColor: '#b33b3b' // Red confirm
             });
      } catch (error) {
             Swal.fire({
                title: "Restore Failed",
                text: error.message || "Could not restore content.",
                icon: "error",
                confirmButtonColor: '#b33b3b' // Red confirm
            });
      }
  };


  // --- Render Function for Content List ---
  const renderContentList = (list, isArchived = false) => {
    if (isLoading) {
      return ( <> <ContentCardSkeleton /> <ContentCardSkeleton /> <ContentCardSkeleton /> </> );
    }
    if (list.length === 0) {
      return ( <EmptyState icon={isArchived ? Archive : Inbox} /*...*/ /> );
    }

    return list.map((content) => {
        // ✅ Status Bar Colors: Red (Published), Gray-400 (Draft), Gray-300 (Archived)
        let statusColorClass = "bg-gray-300"; // Archived
        if (content.status === "Published") statusColorClass = "bg-[#b33b3b]"; // Red
        if (content.status === "Draft") statusColorClass = "bg-gray-400"; // Medium gray

      return (
        <motion.div
          key={content.id}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // Card: White bg, gray-200 border, shadow-sm
          className="group relative flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md"
        >
          {/* Status Bar */}
          <div className={clsx("w-1.5 flex-shrink-0", statusColorClass)}></div>

          {/* Card Body */}
          <div className="p-5 flex-grow w-full">
            {/* Title: Black text */}
            <h3 className="text-base font-semibold text-gray-900 mb-1 pr-8">
              {content.title}
            </h3>
            {/* Description: Gray text */}
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {content.description || "No description provided."}
            </p>

            {/* Tags and Media Link */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
              {/* ✅ Tags: White bg, gray border/text */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-white border border-gray-200 text-gray-600">
                {content.category || "Uncategorized"}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-white border border-gray-200 text-gray-600">
                {content.audience || 'all'}
              </span>
              {content.media_url && (
                // ✅ Link: Red text
                <a
                  href={content.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#b33b3b] hover:text-[#c14a4a] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Media
                </a>
              )}
            </div>

             {/* ✅ Action Button: Gray icon, Red hover for Restore, Gray hover for Archive */}
            <button
                onClick={() => isArchived ? handleRestore(content) : handleArchive(content)}
                className={clsx(
                    "absolute top-3 right-3 p-1.5 rounded-md text-gray-400 transition-colors duration-150",
                    "opacity-0 group-hover:opacity-100 focus:opacity-100 md:opacity-100", // Consider visibility
                    isArchived
                        ? "hover:bg-red-50 hover:text-red-600" // Red hover
                        : "hover:bg-gray-100 hover:text-gray-700" // Gray hover
                )}
                aria-label={isArchived ? "Restore content" : "Archive content"}
            >
                {isArchived ? ( <RotateCcw className="w-4 h-4" /> ) : ( <Archive className="w-4 h-4" /> )}
            </button>
          </div>
        </motion.div>
      );
    });
  };


  // --- MAIN RENDER ---
  return (
    // ✅ Changed Page Background to white
    <div className="">
      <div className="px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">

        {/* --- Refined Page Header --- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          {/* Page Title: Black text, Subtitle: Gray text */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
              Educational Content
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and publish educational materials for users.
            </p>
          </div>

          {/* Header Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
             {/* ✅ Add New Button: Red */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white transition bg-[#b33b3b] rounded-lg shadow-sm hover:bg-[#c14a4a] w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b33b3b]"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
             {/* ✅ Toggle Button: White/Gray */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 transition bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              {showArchived ? (
                <> <BookOpen className="w-4 h-4 text-gray-500" /> View Published </>
              ) : (
                <> <Archive className="w-4 h-4 text-gray-500" /> View Archived </>
              )}
            </button>
          </div>
        </div>

        {/* --- Content Grid --- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={showArchived ? "archived" : "published"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
             <h2 className="sr-only">
               {showArchived ? "Archived Content" : "Published Content"}
             </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {renderContentList( showArchived ? archived : contents, showArchived )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

     {/* --- Add Content Modal (Refined Minimal Design) --- */}
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
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            📚 Add New Educational Content
          </h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAddContent} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Title *
            </label>
            <input
              type="text"
              required
              placeholder="Enter title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b33b3b] focus:border-transparent transition"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b33b3b] focus:border-transparent transition"
            >
              <option value="" disabled>Select Category</option>
              <option value="Waste Segregation">Waste Segregation</option>
              <option value="Recycling">Recycling</option>
              <option value="Composting">Composting</option>
              <option value="Waste Reduction">Waste Reduction</option>
              <option value="Proper Disposal">Proper Disposal</option>
              <option value="Hazardous Waste">Hazardous Waste</option>
              <option value="Health and Safety">Health and Safety</option>
              <option value="Sustainable Living">Sustainable Living</option>
              <option value="General">General/Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Write a short description..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b33b3b] focus:border-transparent transition resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File (Optional)
            </label>
            <FileUploadInput onChange={handleFileUpload} media={formData.media} />
          </div>

          {/* Checkbox */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="w-4 h-4 text-[#b33b3b] border-gray-300 rounded focus:ring-[#b33b3b]/50"
              checked={formData.publishNow}
              onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })}
            />
            Publish immediately
          </label>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#8b1c1c] rounded-md hover:bg-[#a22a2a] transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b1c1c]"
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