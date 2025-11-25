// src/app/login/LoginComponent.tsx

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabaseClient";
import Swal from 'sweetalert2'; // Import SweetAlert2
import {
  LogIn,
  Truck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

// --- Constants ---
const onboardingScreens = [
  {
    image: "/img/welcome.png",
    title: "Welcome to Waste App",
    subtitle: "Track, manage, and reduce waste the smart way.",
  },
  {
    image: "/img/recycle.png",
    title: "Recycle with Ease",
    subtitle: "Sort your waste properly and make an impact today.",
  },
  {
    image: "/img/community.png",
    title: "Join the Community",
    subtitle: "Work together for a cleaner tomorrow.",
  },
];

const carouselImages = [
  "/img/CleanUp1.png",
  "/img/CleanUp2.png",
  "/img/CleanUp3.png",
  "/img/CleanUp4.png",
];

// --- Reusable UI Components ---

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => void;
  error: string | null;
  loading: boolean;
}

function LoginModal({
  isOpen,
  onClose,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  handleLogin,
  error,
  loading,
}: LoginModalProps) {
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <LogIn size={40} className="text-[#b33b3b] mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-[#b33b3b]">
                Welcome Back!
              </h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                Log in to access your dashboard.
              </p>
              <form onSubmit={handleLogin} className="w-full">
                {/* NOTE: We are keeping the inline error display for general errors 
                  but the primary pending/fatal errors will use SweetAlert.
                  You can remove this block if you only want SweetAlerts for errors.
                */}
                {error && (
                  <p className="text-red-500 text-sm mb-3 text-center">
                    {error}
                  </p>
                )}
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-11 pr-4 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition disabled:opacity-50"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-11 pr-11 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: loading ? 1 : 1.03 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                  disabled={loading}
                  className="w-full mt-6 bg-[#d94f4f] text-white font-semibold py-3 rounded-xl shadow-md hover:bg-opacity-90 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    "Login"
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AutoCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0">
      <AnimatePresence>
        <motion.img
          key={index}
          src={carouselImages[index]}
          alt={`Cleanup slide ${index + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}

// --- Specialized View Components ---

function DesktopView({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center text-white overflow-hidden">
        <AutoCarousel />
        <div className="relative z-10 flex flex-col items-center p-4">
          <motion.h2
            className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          >
            Barangay Tambacan
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 1.0 }}
            className="text-2xl md:text-4xl font-extrabold text-gray-200 drop-shadow-lg max-w-3xl"
          >
            Waste Collection Management System
          </motion.p>
          <motion.button
            onClick={onLoginClick}
            className="mt-12 bg-[#b33b3b] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#c14a4a] transition duration-200 shadow-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: "easeOut", delay: 2.0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started
          </motion.button>
        </div>
      </section>
    </div>
  );
}

// This component now manages the entire mobile experience
function MobileView({
  role,
  started,
  setStarted,
  step,
  setStep,
  handleLogin,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
}: any) {

  const messages = ["Welcome!", "Hello There!", "Log In to Start!"];
  const [displayedText, setDisplayedText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!started) return;
    const speed = isDeleting ? 50 : 120;
    const timeout = setTimeout(() => {
      const currentMessage = messages[messageIndex];
      if (!isDeleting) {
        setDisplayedText(currentMessage.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        if (charIndex + 1 === currentMessage.length) {
          setTimeout(() => setIsDeleting(true), 1000);
        }
      } else {
        setDisplayedText(currentMessage.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        if (charIndex - 1 === 0) {
          setIsDeleting(false);
          setMessageIndex((messageIndex + 1) % messages.length);
        }
      }
    }, speed);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, messageIndex, started]);

  // Collector-specific view
  if (!started && role === "collector") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#b33b3b] to-[#d94f4f] text-white px-6">
        <Truck size={100} className="mb-6 drop-shadow-md" />
        <h1 className="text-3xl font-bold mb-3">Collector Dashboard</h1>
        <p className="text-sm text-center mb-8 max-w-xs">
          View collection routes, schedules, and progress reports for the day.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setStarted(true)}
          className="bg-white text-[#b33b3b] font-semibold px-8 py-3 rounded-full shadow-md hover:bg-gray-200 transition"
        >
          Let’s Get Started
        </motion.button>
      </div>
    );
  }

  // Resident (or default) onboarding and login
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md h-screen flex flex-col justify-center px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {!started ? (
            // Onboarding Slides
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
            >
              <div className="bg-white py-6 px-5 flex flex-col items-center justify-between h-[90vh] mx-auto w-full relative overflow-hidden">
                <button
                  onClick={() => setStarted(true)}
                  className="absolute top-6 right-6 text-gray-500 text-sm font-medium hover:text-gray-700 transition"
                >
                  Skip
                </button>
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="absolute top-6 left-6 hover:opacity-80 transition"
                  >
                    {/* SVG Back Arrow */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div className="flex flex-col items-center justify-center flex-grow text-center mt-4 w-full">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center w-full"
                  >
                    <img
                      src={onboardingScreens[step].image}
                      alt={onboardingScreens[step].title}
                      className="w-72 h-72 object-contain mb-6 sm:w-80 sm:h-80"
                    />
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 tracking-tight">
                      {onboardingScreens[step].title}
                    </h2>
                    <p className="text-gray-500 text-base leading-relaxed max-w-xs">
                      {onboardingScreens[step].subtitle}
                    </p>
                  </motion.div>
                </div>
                <div className="flex justify-center items-center space-x-2 mt-4 mb-6">
                  {onboardingScreens.map((_, index) => (
                    <div
                      key={index}
                      className={`transition-all duration-300 rounded-full ${
                        index === step
                          ? "w-6 h-3 bg-[#d94f4f]"
                          : "w-3 h-3 bg-[#d94f4f]/30"
                      }`}
                    ></div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    step < onboardingScreens.length - 1
                      ? setStep(step + 1)
                      : setStarted(true)
                  }
                  className="bg-[#d94f4f] rounded-full p-4 shadow-lg hover:bg-[#e35d5d] transition duration-300"
                >
                  {/* SVG Next Arrow */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            // Mobile Login Screen
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="relative bg-white text-gray-800 rounded-3xl shadow-2xl p-10 w-full max-w-sm mx-auto overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <LogIn
                  size={65}
                  className="text-[#d94f4f] drop-shadow-md mb-4"
                />
                <h1 className="text-3xl font-extrabold mb-3 text-[#b33b3b] animate-blink-cursor h-9">
                  {displayedText}
                </h1>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  Log in to continue exploring your dashboard.
                </p>
                <form onSubmit={handleLogin} className="w-full">
                  {/* We are keeping the inline error display for general errors here too */}
                  {error && (
                    <p className="text-red-500 text-sm mb-3 text-center">
                      {error}
                    </p>
                  )}
                  <div className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition disabled:opacity-50"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pl-11 pr-11 py-3.5 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: loading ? 1 : 1.03 }}
                    whileTap={{ scale: loading ? 1 : 0.95 }}
                    disabled={loading}
                    className="w-full mt-6 bg-[#d94f4f] text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-opacity-90 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      "Login"
                    )}
                  </motion.button>
                  <p className="mt-8 text-sm text-center text-gray-600">
                    Don’t have an account?{" "}
                    <a
                      href="/register"
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Sign Up
                    </a>
                  </p>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


// --- Main Component (Default Export) ---

export default function LoginComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipOnboarding = searchParams.get("skipOnboarding") === "true";
  const role = searchParams.get("role");

  // --- State ---
  const [isMobile, setIsMobile] = useState(false);
  const [started, setStarted] = useState(skipOnboarding);
  const [step, setStep] = useState(
    skipOnboarding ? onboardingScreens.length + 1 : 0
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Mobile Check ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Login Logic (UPDATED TO USE SWEETALERT2) ---
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const pendingMessage = 'Your registration is currently being reviewed by a Barangay Official. You will be able to log in once your account is approved.';

    try {
        // 1. Attempt initial sign-in with email/password
        const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
                email,
                password,
            });

        // --- AUTHENTICATION FAILED BLOCK ---
        if (signInError) {
            
            // Check the PENDING table by email from the form input
            const { data: pendingData, error: pendingError } = await supabase
                .from("pending_registrations")
                .select("id")
                .eq("email", email)
                .maybeSingle();

            if (pendingError) {
                console.error("Error checking pending status:", pendingError);
                // Fall back to showing a generic error if the pending check itself fails
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: signInError.message || "An error occurred during login. Please try again.",
                    confirmButtonColor: '#d94f4f'
                });
                setLoading(false);
                return;
            }

            if (pendingData) {
                // ✅ User is found in PENDING list - Display the custom message using SweetAlert
                Swal.fire({
                    icon: 'info',
                    title: 'Account Pending Approval',
                    text: pendingMessage,
                    confirmButtonColor: '#b33b3b'
                });
                setLoading(false);
                return;
            }

            // If sign-in failed AND user is NOT in pending list, show the original sign-in error via SweetAlert.
            Swal.fire({
                icon: 'error',
                title: 'Invalid Credentials',
                text: "The email or password you entered is incorrect. Please try again.",
                confirmButtonColor: '#d94f4f'
            });
            setLoading(false);
            return;
        }
        
        // --- AUTHENTICATION SUCCESS BLOCK ---
        const user = signInData?.user;
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Failed',
                text: "Authentication failed. Please try again.",
                confirmButtonColor: '#d94f4f'
            });
            setLoading(false);
            return;
        }

        // 2. Check the APPROVED 'users' table for role-based access
        let { data: userData, error: userError } = await supabase
            .from("users")
            .select("email, role")
            .eq("email", user.email || email)
            .maybeSingle();

        if (userError) {
            console.error("Error fetching user role:", userError);
        }

        if (!userData) {
            // User logged into Supabase Auth but is not in the approved 'users' table.
            Swal.fire({
                icon: 'warning',
                title: 'Account Status',
                text: "Your account is not fully set up or approved. Please contact your administrator.",
                confirmButtonColor: '#d94f4f'
            });
            
            // Immediately sign out the user since they should not be logged in yet.
            try {
                await supabase.auth.signOut();
            } catch (signOutErr) {
                console.warn("Sign-out failed:", signOutErr);
            }
            setLoading(false);
            return;
        }

        // 3. APPROVED User - Proceed with Role-based redirection
        setLoading(false); // Set loading to false before navigating
        if (userData.role === "official" || userData.role === "admin") {
            router.push("/");
        } else if (userData.role === "collector") {
            router.push("/collector");
        } else {
            router.push("/residents");
        }

    } catch (err: any) {
        console.error("Login error:", err);
        Swal.fire({
            icon: 'error',
            title: 'System Error',
            text: err.message || "An unexpected system error occurred. Please try again.",
            confirmButtonColor: '#d94f4f'
        });
        setLoading(false);
    }
  };

  // --- Render Logic ---
  const loginModalProps = {
    isOpen: isLoginModalOpen,
    onClose: () => setIsLoginModalOpen(false),
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    handleLogin,
    error,
    loading,
  };

  if (!isMobile) {
    return (
      <>
        <DesktopView onLoginClick={() => setIsLoginModalOpen(true)} />
        <LoginModal {...loginModalProps} />
      </>
    );
  }

  return (
    <MobileView
      role={role}
      started={started}
      setStarted={setStarted}
      step={step}
      setStep={setStep}
      handleLogin={handleLogin}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      error={error}
      loading={loading}
    />
  );
}