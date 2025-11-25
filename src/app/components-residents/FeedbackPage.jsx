"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, XCircle } from "lucide-react"; // Updated icons
import { supabase } from "@/supabaseClient";
import Swal from "sweetalert2";

export default function FeedbackPage() {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // --- 1. Fetch User Session on Mount ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // --- 2. Submit General Feedback ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (comment.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Input Required",
        text: "Please enter your feedback or issue before submitting.",
        confirmButtonColor: "#d33",
      });
      return;
    }

    setSubmitting(true);

    try {
      // NOTE: This assumes you have created a table named 'general_feedback' 
      // with columns: 'user_id' and 'comment_text'
      const { error } = await supabase
        .from("general_feedback")
        .insert({
          user_id: user?.id, // Link to the current user
          comment_text: comment,
          // Optional: Add a 'purok' or 'name' column if you want more context
        });

      if (error) throw error;

      // Success
      await Swal.fire({
        icon: "success",
        title: "Feedback Sent! 🚀",
        text: "Your message has been submitted. Thank you for helping us improve!",
        timer: 3000,
        showConfirmButton: false,
      });

      // Reset Form
      setComment("");

    } catch (error) {
      console.error("Submit error:", error);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: "Could not send feedback. Please check your network or try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      key="general-feedback-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-red-700" />
          General Comment / Issue 📝
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Use this form to send general comments, suggestions, or report non-schedule related issues.
        </p>
      </div>

      <motion.div
        className="bg-white rounded-xl shadow-lg overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Comment Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Feedback / Issue Details
            </label>
            <textarea
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Example: The app loads slowly on my device, or: I suggest adding a section for..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50 resize-none"
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !user}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {submitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                Send Feedback <Send className="w-5 h-5" />
              </>
            )}
          </button>
          
          {!user && (
            <p className="text-center text-xs text-red-500">
                Please wait, verifying user session before submitting.
            </p>
          )}

        </form>
      </motion.div>
    </motion.div>
  );
}