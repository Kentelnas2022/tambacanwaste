"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import Swal from "sweetalert2";

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

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

      // ✅ Upload files
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

      // ✅ Insert report
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

      // ✅ Insert status
      const { error: statusError } = await supabase.from("report_status").insert([
        {
          report_id: reportId,
          status: "Pending",
          official_response: "",
          location: location,
          updated_by: null,
        },
      ]);
      if (statusError) throw statusError;

      // ✅ Notifications
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("report_id", reportId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingNotif) {
        await supabase
          .from("notifications")
          .update({
            message: `You submitted a new report: ${title}`,
            status: "Pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingNotif.id);
      } else {
        await supabase.from("notifications").insert([
          {
            user_id: userId,
            report_id: reportId,
            message: `You submitted a new report: ${title}`,
            status: "Pending",
            created_at: new Date(),
          },
        ]);
      }

      // ✅ SweetAlert success popup
      Swal.fire({
        icon: "success",
        title: "Report Submitted!",
        text: "Your report has been successfully submitted and is now pending review.",
        confirmButtonColor: "#b91c1c",
      });

      // ✅ Reset form
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
    <div id="page-report" className="animate-fade-in px-4 sm:px-6 lg:px-8">
      {/* ✅ Report Form */}
      <form
        id="reportForm"
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-5"
      >
        <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Issue Type
  </label>
  <div className="relative w-full">
    <select
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      className="
        appearance-none w-full
        border border-gray-300 rounded-md bg-white text-gray-800 
        focus:outline-none focus:ring-2 focus:ring-[#b91c1c] focus:border-transparent
        cursor-pointer transition-all duration-200 ease-in-out
        text-sm md:text-base
        p-2.5 sm:p-3 md:p-3.5
        leading-tight
      "
      required
    >
      <option value="">Select issue</option>
      <option>Missed Collection</option>
      <option>Illegal Dumping</option>
      <option>Damaged Bin</option>
      <option>Overflowing Bin</option>
      <option>Other</option>
    </select>

    {/* Custom Arrow */}
    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#b91c1c]">
      <svg
        className="w-4 h-4 sm:w-5 sm:h-5"
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


        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter address or location"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b91c1c] focus:border-transparent text-gray-800 text-sm sm:text-base"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b91c1c] focus:border-transparent text-gray-800 text-sm sm:text-base"
            required
          ></textarea>
        </div>

        {/* Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* ✅ Submit Button (Dark Red Palette) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-[#7f1d1d] text-white font-semibold rounded-lg hover:bg-[#991b1b] active:bg-[#b91c1c] transition-all duration-200 disabled:opacity-60 text-sm sm:text-base"
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
