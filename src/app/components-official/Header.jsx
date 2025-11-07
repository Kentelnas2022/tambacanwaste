"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "next/navigation";
import { Menu, LogOut, UserPlus, X } from "lucide-react"; // Added X icon for modal
import Swal from "sweetalert2";

export default function Header() {
  const [time, setTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    purok: "",
    mobile_number: "",
    role: "",
  });

  const menuRef = useRef(null);
  const router = useRouter();

  // ⏰ Clock (Unchanged)
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

  // 🧠 Close dropdown/modal (Unchanged)
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

  // 🚪 Logout function (Unchanged)
  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  // 🧾 Add User function (Unchanged)
  const handleCreateAccount = async (e) => {
    e.preventDefault();

    if (!form.role) {
      Swal.fire({
        icon: "warning",
        title: "Please select a role",
      });
      return;
    }

    try {
      // ✅ Step 1: Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
  email: form.email,
  password: form.password,
  options: {
    data: {
      role: form.role,   // ✅ This is the SECRET ingredient
    },
  },
});


      if (authError) throw authError;

      const uid = authData?.user?.id;
      if (!uid) throw new Error("User ID not returned after sign up.");

      // ✅ Step 2: Insert user data into your 'users' table
      const { error: insertError } = await supabase.from("users").insert([
        {
          uid,
          name: form.name,
          email: form.email,
          purok: form.purok || null,
          mobile_number: form.mobile_number || null,
          role: form.role,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      // ✅ Step 3: Show success alert
      Swal.fire({
        icon: "success",
        title: `${
          form.role.charAt(0).toUpperCase() + form.role.slice(1)
        } account created successfully!`,
        showConfirmButton: false,
        timer: 1800,
      });

      // ✅ Step 4: Reset form and close modal
      setShowModal(false);
      setForm({
        name: "",
        email: "",
        password: "",
        purok: "",
        mobile_number: "",
        role: "",
      });
    } catch (error) {
      console.error("Error creating account:", error);
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
        {/* Left: Logo + Title (Unchanged) */}
        <div className="flex items-center gap-3">
          <img
            src="img/logo.png"
            alt="Logo"
            className="w-8 h-8 sm:w-9 sm:h-9"
            aria-hidden
          />
           <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              Barangay Tambacan
            </h1>
            <p className="text-red-100 font-medium flex items-center gap-1 text-xs sm:text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full" /> Smart
              Waste Management System
            </p>
          </div>
        </div>
        {/* Right: Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-red-700 text-white font-semibold shadow text-sm">
            🕐 {time}
          </div>

          {/* --- MODIFIED: "Add User" button is now red --- */}
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-900 text-white font-semibold shadow text-sm flex items-center gap-1 transition"
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

        {/* Mobile Menu (Unchanged) */}
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

      {/* --- MODIFIED: "Add User" Modal Redesigned --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New User Account
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Juan dela Cruz"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purok <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Purok 1"
                  value={form.purok}
                  onChange={(e) => setForm({ ...form, purok: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="09123456789"
                  value={form.mobile_number}
                  onChange={(e) =>
                    setForm({ ...form, mobile_number: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  required
                >
                  <option value="">Select a Role</option>
                  <option value="official">Official</option>
                  <option value="collector">Collector</option>
                </select>
              </div>

              {/* Modal Footer (Buttons) */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-red-800 hover:bg-red-900 text-white font-medium transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}