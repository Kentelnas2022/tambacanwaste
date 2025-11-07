"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import {
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  MapPin,
  Phone,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Listbox, Transition } from "@headlessui/react";
import Swal from "sweetalert2"; // ✅ 1. IMPORT SWAL

const purokOptions = Array.from({ length: 11 }, (_, i) => `Purok ${i + 1}`);

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    password_confirm: "",
    name: "",
    purok: "",
    mobile_number: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePurokChange = (value) => setForm({ ...form, purok: value });
  const handleInputChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // --- Validations ---
    if (!form.name.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (form.password !== form.password_confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!form.purok) {
      setError("Please select your Purok.");
      setLoading(false);
      return;
    }

    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(form.mobile_number)) {
      setError("Please enter a valid PH mobile number (e.g., 09123456789).");
      setLoading(false);
      return;
    }

    try {
      // Create the auth account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            purok: form.purok,
            mobile_number: form.mobile_number,
          },
          emailRedirectTo: `${window.location.origin}/login?skipOnboarding=true`,
        },
      });

      if (signUpError) throw signUpError;
      const user = data.user;
      if (!user) throw new Error("User registration failed.");
      
      // ✅ 2. REPLACE ALERT WITH SWAL
      Swal.fire({
        title: "Registration Successful!",
        text: "Please check your email to verify your account.",
        icon: "success",
        confirmButtonColor: "#b33b3b", // Match your theme
        timer: 5000,
        timerProgressBar: true,
      });

      router.push("/login?verified=false&skipOnboarding=true");
      
    } catch (err) {
      console.error("Registration error:", err.message || err);
      setError(
        err.message || "An unexpected error occurred during registration."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-800 px-4 py-8 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative bg-white text-gray-800 rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-md mx-auto"
      >
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-center text-[#b33b3b]">
            Create an Account
          </h1>
          <p className="text-sm text-gray-600 mb-5 text-center">
            Register now to start managing your waste collection.
          </p>

          <form onSubmit={handleRegister} className="w-full space-y-4">
            {/* Full Name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleInputChange}
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition text-sm sm:text-base"
              />
            </div>

            {/* Purok Selector */}
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <Listbox value={form.purok} onChange={handlePurokChange}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-default rounded-xl bg-gray-100 py-3 pl-11 pr-10 text-left text-gray-800 
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d94f4f]/60 focus-visible:bg-white text-sm sm:text-base">
                    <span
                      className={`block truncate ${
                        form.purok ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {form.purok || "Select Purok"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <ChevronsUpDown className="h-5 w-5 text-gray-400" />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-20">
                      {purokOptions.map((purok, idx) => (
                        <Listbox.Option
                          key={idx}
                          value={purok}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-[#fceded] text-[#b33b3b]"
                                : "text-gray-900"
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {purok}
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#b33b3b]">
                                  <Check className="h-5 w-5" />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>

            {/* Mobile Number */}
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="tel"
                name="mobile_number"
                placeholder="Mobile Number (09...)"
                value={form.mobile_number}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mobile_number: e.target.value.replace(/\D/g, ""),
                  })
                }
                required
                maxLength={11}
                className="w-full pl-11 pr-4 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition text-sm sm:text-base"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleInputChange}
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition text-sm sm:text-base"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password (min. 6 characters)"
                value={form.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full pl-11 pr-11 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="password_confirm"
                placeholder="Confirm Password"
                value={form.password_confirm}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full pl-11 pr-11 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-xs sm:text-sm text-center pt-1">
                {error}
              </p>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full mt-5 bg-[#d94f4f] text-white font-semibold py-3 rounded-xl shadow-md hover:bg-opacity-90 transition disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                      5.291A7.962 7.962 0 014 12H0c0 
                      3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                "Register"
              )}
            </motion.button>
          </form>

          <p className="text-center text-xs sm:text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <a
              href="/login?skipOnboarding=true"
              className="text-[#d94f4f] font-medium hover:underline"
            >
              Login here
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}