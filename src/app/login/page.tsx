"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
// Removed Image import as it wasn't used directly here, but keep if needed elsewhere
import { supabase } from "@/supabaseClient";
import {
  CalendarDays,
  Recycle,
  // Bell, // Removed if not used
  Leaf,
  LogIn,
  // UserCog, // Removed if not used
  Truck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  X,
} from "lucide-react";

// --- Onboarding Screens (Keep as is) ---
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

// --- Login Modal Component (Keep as is) ---
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
}) {
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
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
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

              {/* Login Form */}
              <form onSubmit={handleLogin} className="w-full">
                {error && (
                  <p className="text-red-500 text-sm mb-3 text-center">
                    {error}
                  </p>
                )}
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition"
                    />
                  </div>

                  {/* Password Input (with toggle) */}
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-11 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition"
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
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full mt-6 bg-[#d94f4f] text-white font-semibold py-3 rounded-xl shadow-md hover:bg-opacity-90 transition"
                >
                  Login
                </motion.button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Main Login Page Component ---
export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipOnboarding = searchParams.get("skipOnboarding") === "true";

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [started, setStarted] = useState(skipOnboarding);
  const [step, setStep] = useState(
    skipOnboarding ? onboardingScreens.length + 1 : 0
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // --- Typing Animation (Keep as is) ---
  const messages = ["Welcome!", "Hello There!", "Log In to Start!"];
  const [displayedText, setDisplayedText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isMobile || !started) return;
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
  }, [charIndex, isDeleting, messageIndex, started, isMobile]);


  // --- Login Handler (Keep as is) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    const user = data.user;
    if (!user) return;

    setIsLoginModalOpen(false);

    const adminEmail = "tristandominicparajes.202200583@gmail.com";
    const collectorEmail = "parajestristan4@gmail.com";

    if (user.email === adminEmail) {
      router.push("/");
    } else if (user.email === collectorEmail) {
      router.push("/collector");
    } else {
      router.push("/residents");
    }
  };

  // --- 🧭 PROFESSIONAL DESKTOP VIEW --- 🧭
  if (!isMobile && !started) {
    return (
      // ✅ Using bg-gray-50 for a subtle background
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* 🌐 Navbar (Cleaned up shadow) */}
        <header className="w-full bg-white shadow-sm py-4 px-12 flex justify-between items-center fixed top-0 left-0 z-10">
          <div className="flex items-center space-x-3">
            {/* Optional: Add Logo here */}
            {/* <img src="/logo.svg" alt="WasteSmart Logo" className="h-8 w-auto" /> */}
            <h1 className="text-xl font-semibold text-[#b33b3b]"> {/* Changed to semibold */}
              Waste Collection Portal
            </h1>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-[#b33b3b] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#c14a4a] transition duration-200" // Slightly darker hover
          >
            Login
          </button>
        </header>

        {/* 📰 Hero Section (Increased spacing, lighter text) */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-12 px-12 pt-40 md:pt-48 pb-16"> {/* Added gap, added pb */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-xl md:w-1/2"
          >
            {/* ✅ Lighter headline weight */}
            <h2 className="text-5xl font-semibold text-[#b33b3b] leading-tight mb-5">
              Tambacan Waste Collection
            </h2>
            {/* ✅ Slightly lighter paragraph text */}
            <p className="text-gray-500 text-lg mb-10">
              Stay informed on collection days, report issues, and help keep our community clean. Join us in making Tambacan a leader in waste management.
            </p>
            {/* Optional: Add a subtle Call to Action button */}
            {/* <button className="bg-gradient-to-r from-[#b33b3b] to-[#d94f4f] text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition">Learn More</button> */}
          </motion.div>

          {/* Floating Image (Subtle shadow) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0, y: [0, -8, 0] }} // Reduced float distance
            transition={{
              opacity: { duration: 0.8 },
              x: { duration: 0.8 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" } // Slower float
            }}
            className="md:w-1/2 flex justify-center md:justify-end"
          >
             <img
              src="/img/segs.png"
              alt="Official Waste Management"
              // ✅ Reduced drop-shadow
              className="w-full max-w-md md:max-w-lg mt-10 md:mt-0 drop-shadow-md"
            />
          </motion.div>
        </section>

        {/* ♻️ Minimalist Segregation Tips (Increased spacing, no border) */}
        <section className="px-12 py-24 bg-white border-y border-gray-100"> {/* Section on white bg, added border-y */}
          <h3 className="text-3xl font-semibold text-center text-[#b33b3b] mb-12">
            Proper Waste Segregation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"> {/* Centered grid */}
            {/* Card 1: Biodegradable (Minimal style) */}
            <motion.div
              // ✅ More subtle hover: shadow increases
              whileHover={{ boxShadow: '0 4px 10px -3px rgba(0, 0, 0, 0.07)' }}
              className="bg-white rounded-xl transition flex items-center p-6 gap-5 shadow-sm" // Removed border
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-50 flex items-center justify-center"> {/* Lighter bg */}
                <Leaf size={24} className="text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1 text-gray-800"> {/* Darker title for contrast */}
                  Biodegradable
                </h4>
                <p className="text-gray-500 text-sm">
                  Food scraps, garden waste, paper. Can be composted.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Recyclable (Minimal style) */}
            <motion.div
              whileHover={{ boxShadow: '0 4px 10px -3px rgba(0, 0, 0, 0.07)' }}
              className="bg-white rounded-xl transition flex items-center p-6 gap-5 shadow-sm" // Removed border
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center"> {/* Lighter bg */}
                <Recycle size={24} className="text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1 text-gray-800">
                  Recyclable
                </h4>
                <p className="text-gray-500 text-sm">
                  Bottles, cans, plastics, metals. Clean & dry first.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Residual (Minimal style) */}
            <motion.div
              whileHover={{ boxShadow: '0 4px 10px -3px rgba(0, 0, 0, 0.07)' }}
              className="bg-white rounded-xl transition flex items-center p-6 gap-5 shadow-sm" // Removed border
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center"> {/* Lighter bg */}
                <CalendarDays size={24} className="text-yellow-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1 text-gray-800">
                  Residual Waste
                </h4>
                <p className="text-gray-500 text-sm">
                  Styrofoam, diapers, ceramics. Non-recyclable items.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ☎️ Minimalist Contact Section (Directly on bg-gray-50) */}
        <section className="px-12 py-24"> {/* Increased py */}
          <div className="max-w-3xl mx-auto text-center">
             <h3 className="text-3xl font-semibold text-[#b33b3b] mb-4"> {/* Semibold title */}
                Contact Us
              </h3>
              <p className="text-gray-500 mb-8"> {/* Lighter text, increased mb */}
                Have questions? Get in touch with the Barangay Hall.
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12"> {/* Increased gap */}
                <div className="flex items-center gap-3 group cursor-pointer"> {/* Added group/cursor for optional hover effect */}
                  <Phone className="w-5 h-5 text-gray-400 group-hover:text-[#b33b3b] transition" />
                  <span className="text-gray-700 font-medium group-hover:text-[#b33b3b] transition">(0926) 321-5432</span>
                </div>
                <div className="flex items-center gap-3 group cursor-pointer">
                  <Mail className="w-5 h-5 text-gray-400 group-hover:text-[#b33b3b] transition" />
                  <span className="text-gray-700 font-medium group-hover:text-[#b33b3b] transition">wastesmart.tambacan@gmail.com</span>
                </div>
              </div>
          </div>
        </section>

        {/* 🌱 Footer */}
        <footer className="bg-[#b33b3b] text-white py-6 text-center text-sm"> {/* Smaller text */}
          <p>© 2025 WasteSmart Official Portal | Barangay Tambacan</p>
        </footer>

        {/* Login Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          handleLogin={handleLogin}
          error={error}
        />
      </div>
    );
  }

  // --- MOBILE VIEWS (Collector + Resident Onboarding/Login) ---
  // ... (Your existing mobile view code remains unchanged)
  // 🚛 Collector First Page (Mobile)
  if (
    isMobile &&
    !started &&
    step === 0 &&
    searchParams.get("role") === "collector"
  ) {
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

  // 🌿 Residents (Mobile Onboarding & Login)
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
            className="relative h-full flex flex-col justify-center"
          >
            <div className="bg-white py-6 px-5 flex flex-col items-center justify-between h-[90vh] mx-auto w-full relative overflow-hidden">
              {/* Skip Button */}
              <button
                onClick={() => setStarted(true)}
                className="absolute top-6 right-6 text-gray-500 text-sm font-medium hover:text-gray-700 transition"
              >
                Skip
              </button>
              {/* Back Arrow */}
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="absolute top-6 left-6 hover:opacity-80 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/> </svg>
                </button>
              )}
              {/* Onboarding Content */}
              <div className="flex flex-col items-center justify-center flex-grow text-center mt-4 w-full">
                <motion.div key={step} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center w-full">
                  <img src={onboardingScreens[step].image} alt={onboardingScreens[step].title} className="w-72 h-72 object-contain mb-6 sm:w-80 sm:h-80"/>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 tracking-tight"> {onboardingScreens[step].title} </h2>
                  <p className="text-gray-500 text-base leading-relaxed max-w-xs"> {onboardingScreens[step].subtitle} </p>
                </motion.div>
              </div>
              {/* Progress Dots */}
              <div className="flex justify-center items-center space-x-2 mt-4 mb-6">
                {onboardingScreens.map((_, index) => ( <div key={index} className={`transition-all duration-300 rounded-full ${ index === step ? "w-6 h-3 bg-[#d94f4f]" : "w-3 h-3 bg-[#d94f4f]/30" }`}></div> ))}
              </div>
              {/* Next Button */}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => step < onboardingScreens.length - 1 ? setStep(step + 1) : setStarted(true) } className="bg-[#d94f4f] rounded-full p-4 shadow-lg hover:bg-[#e35d5d] transition duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/> </svg>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          // Mobile Login Screen
          <motion.div key="login" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="relative bg-white text-gray-800 rounded-3xl shadow-2xl p-10 w-full max-w-sm mx-auto overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
              <LogIn size={65} className="text-[#d94f4f] drop-shadow-md mb-4"/>
              <h1 className="text-3xl font-extrabold mb-3 text-[#b33b3b] animate-blink-cursor"> {displayedText} </h1>
              <p className="text-sm text-gray-600 mb-6 text-center"> Log in to continue exploring your dashboard. </p>
              {/* Login Form */}
              <form onSubmit={handleLogin} className="w-full">
                {error && ( <p className="text-red-500 text-sm mb-3 text-center"> {error} </p> )}
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-11 pr-4 py-3.5 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition"/>
                  </div>
                  {/* Password Input */}
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-11 pr-11 py-3.5 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d94f4f]/60 focus:bg-white transition"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"> {showPassword ? ( <EyeOff className="w-5 h-5"/> ) : ( <Eye className="w-5 h-5"/> )} </button>
                  </div>
                </div>
                <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} className="w-full mt-6 bg-[#d94f4f] text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-opacity-90 transition"> Login </motion.button>
                <p className="mt-8 text-sm text-center text-gray-600"> Don’t have an account?{" "} <a href="/register" className="text-blue-600 font-medium hover:underline"> Sign Up </a> </p>
              </form>
            </div>
            {/* Typing Cursor Animation */}
            <style jsx>{` .animate-blink-cursor { animation: blink 0.7s infinite; border-right: 4px solid #b33b3b; } @keyframes blink { 0%, 100% { border-color: transparent; } 50% { border-color: #b33b3b; } } `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
}