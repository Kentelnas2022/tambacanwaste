"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import { Menu, LogOut, UserPlus } from "lucide-react";
import Swal from "sweetalert2";

export default function Header() {
  const [time, setTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "",
  });
  const menuRef = useRef(null);
  const router = useRouter();

  // ⏰ Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🧠 Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const node = menuRef.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setShowModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  // ✅ FIXED: Create Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!form.role) {
      Swal.fire({ icon: "error", title: "Please select a role." });
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;

      const uid = authData?.user?.id;
      if (!uid) throw new Error("User ID missing after signup.");

      await new Promise((res) => setTimeout(res, 500));

      const { error: insertError } = await supabase.from("users").insert([
        {
          uid,
          name: form.name,
          email: form.email,
          role: form.role,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      Swal.fire({
        icon: "success",
        title: `${form.role.charAt(0).toUpperCase() + form.role.slice(1)} account created successfully!`,
        showConfirmButton: false,
        timer: 1800,
      });

      setShowModal(false);
      setForm({ email: "", password: "", name: "", role: "" });
    } catch (error) {
      console.error("Error creating account:", error.message);
      Swal.fire({
        icon: "error",
        title: "Failed to create account",
        text: error.message,
      });
    }
  };

  return (
    <header className="relative overflow-visible shadow-lg w-full z-[100]">
      <div className="absolute inset-0 bg-red-800" aria-hidden />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black opacity-10" aria-hidden />

      <div className="relative z-20 container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl shadow-md">
            <svg
              className="w-8 h-8 sm:w-9 sm:h-9 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8a1 1 0 000 2v6a2 2 0 002 2h10a2 2 0 002-2V10a1 1 0 100-2H3zm8 6a1 1 0 11-2 0V9a1 1 0 112 0v5z" />
            </svg>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              Barangay Tambacan
            </h1>
            <p className="text-red-100 font-medium flex items-center gap-1 text-xs sm:text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full" /> Smart Waste Management System
            </p>
          </div>
        </div>

        {/* Right: Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-red-700 text-white font-semibold shadow text-sm">
            🕐 {time}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-800 text-white font-semibold shadow text-sm flex items-center gap-1 transition"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-900 text-white font-semibold shadow text-sm flex items-center gap-1 transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Mobile Menu */}
        <div className="sm:hidden relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-md bg-white/20 text-white hover:bg-white/30 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-[200] animate-fade-in"
              style={{ top: "100%" }}
            >
              <div className="px-4 py-2 text-gray-700 font-semibold border-b text-center">
                🕐 {time}
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-gray-500" /> Add User
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 text-gray-500" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✨ Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create User Account</h2>

            <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border p-2 rounded-lg"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border p-2 rounded-lg"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="border p-2 rounded-lg"
                required
              />

              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="border p-2 rounded-lg"
                required
              >
                <option value="">Select Role</option>
                <option value="official">Official</option>
                <option value="collector">Collector</option>
              </select>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-900 text-white font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 180ms ease-out; }
      `}</style>
    </header>
  );
}
