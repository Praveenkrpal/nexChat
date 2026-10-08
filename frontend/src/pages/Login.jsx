import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  FiMail,
  FiPhone,
  FiLock,
  FiMessageCircle,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiShield,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  // ==========================================
  // LOGIN METHOD
  // ==========================================

  const [loginMethod, setLoginMethod] = useState("email");

  // ==========================================
  // FORM
  // ==========================================

  const [form, setForm] = useState({
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // PASSWORD VISIBILITY
  // ==========================================

  const [showPassword, setShowPassword] = useState(false);

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // CHANGE LOGIN METHOD
  // ==========================================

  const handleMethodChange = (method) => {
    setLoginMethod(method);
    setError("");

    if (method === "email") {
      setForm((prev) => ({
        ...prev,
        phone: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        email: "",
      }));
    }
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const payload = {
        password: form.password,
      };

      // EMAIL LOGIN

      if (loginMethod === "email") {
        payload.email = form.email;
      }

      // MOBILE LOGIN

      if (loginMethod === "mobile") {
        payload.phone = form.phone;
      }

      const response = await api.post("/auth/login", payload);

      const { user, token } = response.data;

      // Save authentication

      login(user, token);

      // Go to chat

      navigate("/chat");
    } catch (error) {
      setError(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#080b18] text-white">
      {/* ======================================
          BACKGROUND
      ====================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Violet glow */}

        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />

        {/* Fuchsia glow */}

        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />

        {/* Center glow */}

        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      {/* ======================================
          DECORATIVE GRID
      ====================================== */}

      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ======================================
          MAIN
      ====================================== */}

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.45,
            ease: "easeOut",
          }}
          className="w-full max-w-[440px]"
        >
          {/* ==================================
              BRAND
          ================================== */}

          <div className="mb-6 text-center sm:mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_35px_rgba(139,92,246,0.25)]"
            >
              <FiMessageCircle size={29} className="text-white" />
            </motion.div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Login to continue to{" "}
              <span className="font-medium text-violet-400">NexChat</span>
            </p>
          </div>

          {/* ==================================
              CARD
          ================================== */}

          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d1222]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            {/* Top gradient */}

            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />

            <div className="p-5 sm:p-7">
              {/* ==================================
                  ERROR
              ================================== */}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      y: -5,
                    }}
                    className="mb-5 overflow-hidden"
                  >
                    <div className="rounded-xl border border-red-500/15 bg-red-500/[0.06] px-4 py-3">
                      <p className="text-xs leading-5 text-red-400">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ==================================
                  LOGIN METHOD
              ================================== */}

              <div className="mb-6">
                <label className="mb-3 block text-xs font-medium text-slate-400">
                  Login using
                </label>

                <div className="relative grid grid-cols-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">
                  {/* Animated active background */}

                  <motion.div
                    layout
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                    className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-500/10 ${
                      loginMethod === "email"
                        ? "left-1"
                        : "left-[calc(50%+2px)]"
                    }`}
                  />

                  {/* EMAIL */}

                  <button
                    type="button"
                    onClick={() => handleMethodChange("email")}
                    className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                      loginMethod === "email"
                        ? "text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <FiMail size={15} />
                    Email
                  </button>

                  {/* MOBILE */}

                  <button
                    type="button"
                    onClick={() => handleMethodChange("mobile")}
                    className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                      loginMethod === "mobile"
                        ? "text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <FiPhone size={15} />
                    Mobile
                  </button>
                </div>
              </div>

              {/* ==================================
                  FORM
              ================================== */}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* ==================================
                    EMAIL
                ================================== */}

                <AnimatePresence mode="wait">
                  {loginMethod === "email" && (
                    <motion.div
                      key="email"
                      initial={{
                        opacity: 0,
                        x: -10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{
                        opacity: 0,
                        x: 10,
                      }}
                      transition={{ duration: 0.18 }}
                    >
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Email Address
                      </label>

                      <div className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] focus-within:ring-2 focus-within:ring-violet-500/10">
                        <FiMail
                          size={17}
                          className="shrink-0 text-slate-600 transition-colors group-focus-within:text-violet-400"
                        />

                        <input
                          type="email"
                          name="email"
                          required
                          value={form.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* ==================================
                      MOBILE
                  ================================== */}

                  {loginMethod === "mobile" && (
                    <motion.div
                      key="mobile"
                      initial={{
                        opacity: 0,
                        x: 10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{
                        opacity: 0,
                        x: -10,
                      }}
                      transition={{ duration: 0.18 }}
                    >
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Mobile Number
                      </label>

                      <div className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] focus-within:ring-2 focus-within:ring-violet-500/10">
                        <FiPhone
                          size={17}
                          className="shrink-0 text-slate-600 transition-colors group-focus-within:text-violet-400"
                        />

                        <span className="border-r border-white/10 pr-3 text-sm text-slate-500">
                          +91
                        </span>

                        <input
                          type="tel"
                          name="phone"
                          required
                          maxLength={10}
                          inputMode="numeric"
                          value={form.phone}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              phone: e.target.value.replace(/\D/g, ""),
                            });
                          }}
                          placeholder="9876543210"
                          className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ==================================
                    PASSWORD
                ================================== */}

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Password
                  </label>

                  <div className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] focus-within:ring-2 focus-within:ring-violet-500/10">
                    <FiLock
                      size={17}
                      className="shrink-0 text-slate-600 transition-colors group-focus-within:text-violet-400"
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex shrink-0 items-center justify-center rounded-lg p-1 text-slate-600 transition hover:text-slate-300"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <FiEyeOff size={17} />
                      ) : (
                        <FiEye size={17} />
                      )}
                    </button>
                  </div>

                  {/* FORGOT PASSWORD */}

                  <div className="mt-2.5 flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-violet-400 transition hover:text-violet-300"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* ==================================
                    LOGIN BUTTON
                ================================== */}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { y: -1 } : undefined}
                  whileTap={!loading ? { scale: 0.98 } : undefined}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login
                      <FiArrowRight size={17} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* ==================================
                  SECURITY
              ================================== */}

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-600">
                <FiShield size={13} />
                <span>Your account is securely protected</span>
              </div>
            </div>

            {/* ==================================
                REGISTER
            ================================== */}

            <div className="border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 text-center sm:px-7">
              <p className="text-xs text-slate-500">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-violet-400 transition hover:text-violet-300"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}

          <p className="mt-6 text-center text-[11px] text-slate-600">
            NexChat • Simple. Private. Real-time.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
