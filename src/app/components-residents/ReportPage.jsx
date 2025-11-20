"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import Swal from "sweetalert2";
import { AlertCircle } from "lucide-react"; // Import icon

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  // --- handleSubmit (Unchanged logic) ---
  async function handleSubmit(e) {
    e.preventDefault();

    if (!session?.user) {
      Swal.fire({
        icon: "error",
        title: "Login Required",
        text: "You must be logged in to submit a report.",
        confirmButtonColor: "#b91c1c",
      });
      return;
    }

    if (!title || !description || !location) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all required fields before submitting.",
        confirmButtonColor: "#b91c1c",
      });
      return;
    }

    setLoading(true);

    try {
      const userId = session.user.id;
      const uploadedUrls = [];

      for (const file of files) {
        const ext = file.name.split(".").pop();
        const filePath = `reports/${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("reports-files")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data: signedData, error: signedError } = await supabase.storage
          .from("reports-files")
          .createSignedUrl(filePath, 3600);
        if (signedError) throw signedError;
        uploadedUrls.push(signedData.signedUrl);
      }

      const { data: reportData, error: insertError } = await supabase
        .from("reports")
        .insert([
          {
            title,
            description,
            location,
            file_urls: uploadedUrls,
            user_id: userId,
            status: "Pending",
            official_response: "",
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      const reportId = reportData.id;

      const notifPayload = {
        user_id: userId,
        report_id: reportId,
        message: `Your report: "${title}" has been successfully submitted. Status: Pending.`,
        status: "Pending",
        read: false,
        created_at: new Date().toISOString(),
      };

      const { error: notifError } = await supabase
        .from("notifications")
        .insert([notifPayload]);

      if (notifError) {
        console.error(
          "Failed to insert resident submission notification:",
          notifError.message
        );
      }

      Swal.fire({
        icon: "success",
        title: "Report Submitted!",
        text: "Your report has been successfully submitted and is now pending review.",
        confirmButtonColor: "#b91c1c",
      });

      e.target.reset();
      setTitle("");
      setDescription("");
      setLocation("");
      setFiles([]);
    } catch (err) {
      console.error("Error submitting report:", err);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: err.message || "Failed to submit report. Please try again later.",
        confirmButtonColor: "#b91c1c",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="page-report">
      {/* --- UPDATED Form styling (Matches target modal/section) --- */}
      <form
        id="reportForm"
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6 space-y-4"
      >
        {/* --- Title (from target modal) --- */}
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <AlertCircle className="w-6 h-6 text-[#DC143C] mr-2" />
          Report an Issue
        </h3>

        {/* Issue Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Issue Type
          </label>
          <div className="relative w-full">
           <select
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  className="appearance-none w-full max-w-full overflow-hidden border border-gray-300 rounded-lg bg-white text-gray-800 
             focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-transparent 
             cursor-pointer transition-all duration-200 ease-in-out text-sm md:text-base
             p-3 leading-tight"
  required
>
  <option value="">Select issue</option>
  <option>Missed Collection</option>
  <option>Illegal Dumping</option>
  <option>Damaged Bin</option>
  <option>Overflowing Bin</option>
  <option>Other</option>
</select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B0000]">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Location (UPDATED TO DROPDOWN) */}
      <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Location
  </label>

  <div className="relative w-full">
    <select
      value={location}
      onChange={(e) => setLocation(e.target.value)}
      className="appearance-none w-full max-w-full overflow-hidden border border-gray-300 rounded-lg bg-white text-gray-800 
                 focus:ring-2 focus:ring-[#8B0000] focus:border-transparent 
                 text-sm sm:text-base p-3 cursor-pointer"
      required
    >
      <option value="">Select Purok</option>
      <option value="Purok 1">Purok 1</option>
      <option value="Purok 2">Purok 2</option>
      <option value="Purok 3">Purok 3</option>
      <option value="Purok 4">Purok 4</option>
      <option value="Purok 5">Purok 5</option>
      <option value="Purok 6">Purok 6</option>
      <option value="Purok 7">Purok 7</option>
      <option value="Purok 8">Purok 8</option>
      <option value="Purok 9">Purok 9</option>
      <option value="Purok 10">Purok 10</option>
    </select>

    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B0000]">
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  </div>
</div>


        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            className="w-full p-3 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-[#8B0000] focus:border-transparent 
                       text-gray-800 text-sm sm:text-base"
            required
          ></textarea>
        </div>

        {/* Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Photo (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            multiple
            className="w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-red-50 file:text-[#b91c1c]
                       hover:file:bg-red-100"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-[#8B0000] text-white font-semibold rounded-lg 
                       hover:bg-red-800 active:bg-[#b91c1c] transition-all duration-200 
                       disabled:opacity-60 text-sm sm:text-base"
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
